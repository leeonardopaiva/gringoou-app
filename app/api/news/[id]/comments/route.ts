import { NextResponse } from 'next/server';
import { NewsArticleStatus } from '@prisma/client';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { buildRateLimitHeaders, consumeRateLimit } from '@/lib/rate-limit';

type RouteContext = { params: Promise<{ id: string }> };

const MAX_COMMENT_LENGTH = 500;
const authorSelect = { id: true, name: true, username: true, image: true } as const;

const isModerator = (role?: string | null) => role === 'ADMIN' || role === 'MODERATOR';

/**
 * Comentários da notícia. `limit` traz só os mais recentes (prévia na lista);
 * sem `limit`, até 50. A resposta vem em ordem cronológica.
 */
export async function GET(request: Request, { params }: RouteContext) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const viewerId = session.user.id;
  const moderator = isModerator(session.user.role);
  const { id } = await params;

  const limitParam = Number(new URL(request.url).searchParams.get('limit'));
  const take = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 50) : 50;
  const where = { articleId: id, ...(moderator ? {} : { isHidden: false }) };

  const [rows, total] = await Promise.all([
    prisma.newsComment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      select: { id: true, content: true, isHidden: true, createdAt: true, authorId: true, author: { select: authorSelect } },
    }),
    prisma.newsComment.count({ where: { articleId: id, isHidden: false } }),
  ]);

  const comments = rows.reverse().map((row) => ({
    id: row.id,
    content: row.content,
    isHidden: row.isHidden,
    createdAt: row.createdAt,
    author: row.author,
    canDelete: row.authorId === viewerId || moderator,
    canHide: moderator,
    canReport: row.authorId !== viewerId,
  }));

  return NextResponse.json({ comments, total });
}

export async function POST(request: Request, { params }: RouteContext) {
  const session = await getServerAuthSession();
  if (!session?.user?.id || !session.user.onboardingCompleted) {
    return NextResponse.json({ error: 'Entre na sua conta para comentar.' }, { status: 401 });
  }
  const { id } = await params;

  const rateLimit = await consumeRateLimit({
    scope: 'news:comment',
    key: `user:${session.user.id}`,
    max: 20,
    windowMs: 60 * 60 * 1000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Você comentou muito em pouco tempo. Tente novamente mais tarde.' },
      { status: 429, headers: buildRateLimitHeaders(rateLimit) },
    );
  }

  const body = await request.json().catch(() => null);
  const content = typeof body?.content === 'string' ? body.content.trim().slice(0, MAX_COMMENT_LENGTH) : '';
  if (content.length < 2) {
    return NextResponse.json({ error: 'Escreva um comentário.' }, { status: 400 });
  }

  const article = await prisma.newsArticle.findFirst({
    where: { id, status: NewsArticleStatus.PUBLISHED },
    select: { id: true },
  });
  if (!article) {
    return NextResponse.json({ error: 'Notícia não encontrada.' }, { status: 404 });
  }

  const comment = await prisma.newsComment.create({
    data: { articleId: id, authorId: session.user.id, content },
    select: { id: true, content: true, isHidden: true, createdAt: true, author: { select: authorSelect } },
  });

  return NextResponse.json(
    { comment: { ...comment, canDelete: true, canHide: isModerator(session.user.role), canReport: false } },
    { status: 201 },
  );
}
