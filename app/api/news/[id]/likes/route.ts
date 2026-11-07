import { NextResponse } from 'next/server';
import { NewsArticleStatus } from '@prisma/client';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type RouteContext = { params: Promise<{ id: string }> };

/** Lista de pessoas da comunidade que curtiram uma notícia publicada (mais recentes primeiro). */
export async function GET(_request: Request, context: RouteContext) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const article = await prisma.newsArticle.findFirst({
    where: { id, status: NewsArticleStatus.PUBLISHED },
    select: { id: true },
  });
  if (!article) {
    return NextResponse.json({ error: 'Notícia não encontrada.' }, { status: 404 });
  }

  const likes = await prisma.newsArticleLike.findMany({
    where: { articleId: article.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: { user: { select: { id: true, name: true, username: true, image: true, locationLabel: true } } },
  });

  return NextResponse.json({ users: likes.map((like) => like.user) });
}
