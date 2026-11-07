import { NextResponse } from 'next/server';
import { NewsArticleStatus } from '@prisma/client';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { buildRateLimitHeaders, consumeRateLimit } from '@/lib/rate-limit';

type RouteContext = { params: Promise<{ id: string }> };

/** Qualquer pessoa logada pode curtir uma notícia publicada. */
async function resolve(context: RouteContext) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) } as const;
  }

  const rateLimit = await consumeRateLimit({
    scope: 'news:like',
    key: `user:${session.user.id}`,
    max: 120,
    windowMs: 60 * 1000,
  });
  if (!rateLimit.allowed) {
    return {
      error: NextResponse.json(
        { error: 'Muitas ações em pouco tempo. Aguarde um instante.' },
        { status: 429, headers: buildRateLimitHeaders(rateLimit) },
      ),
    } as const;
  }

  const { id } = await context.params;
  const article = await prisma.newsArticle.findFirst({
    where: { id, status: NewsArticleStatus.PUBLISHED },
    select: { id: true },
  });
  if (!article) {
    return { error: NextResponse.json({ error: 'Notícia não encontrada.' }, { status: 404 }) } as const;
  }

  return { userId: session.user.id, articleId: article.id } as const;
}

const likeCount = (articleId: string) => prisma.newsArticleLike.count({ where: { articleId } });

export async function POST(_request: Request, context: RouteContext) {
  const resolved = await resolve(context);
  if ('error' in resolved) return resolved.error;

  await prisma.newsArticleLike.upsert({
    where: { userId_articleId: { userId: resolved.userId, articleId: resolved.articleId } },
    create: { userId: resolved.userId, articleId: resolved.articleId },
    update: {},
  });
  return NextResponse.json({ liked: true, likeCount: await likeCount(resolved.articleId) });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const resolved = await resolve(context);
  if ('error' in resolved) return resolved.error;

  await prisma.newsArticleLike.deleteMany({
    where: { userId: resolved.userId, articleId: resolved.articleId },
  });
  return NextResponse.json({ liked: false, likeCount: await likeCount(resolved.articleId) });
}
