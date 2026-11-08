import { NextResponse } from 'next/server';
import { requireModerationSession } from '@/lib/require-moderation';
import { prisma } from '@/lib/prisma';
import { newsPath } from '@/lib/news-url';

/** Fila de comentários de notícias denunciados (os mais denunciados primeiro). */
export async function GET() {
  const { response } = await requireModerationSession();
  if (response) return response;

  const comments = await prisma.newsComment.findMany({
    where: { reports: { some: {} } },
    orderBy: [{ isHidden: 'asc' }, { createdAt: 'desc' }],
    take: 100,
    select: {
      id: true,
      content: true,
      isHidden: true,
      createdAt: true,
      author: { select: { id: true, name: true, username: true, image: true } },
      article: { select: { id: true, title: true } },
      reports: {
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true, reporter: { select: { id: true, name: true, username: true } } },
      },
    },
  });

  return NextResponse.json({
    comments: comments
      .map((comment) => ({
        id: comment.id,
        content: comment.content,
        isHidden: comment.isHidden,
        createdAt: comment.createdAt.toISOString(),
        author: comment.author,
        article: { id: comment.article.id, title: comment.article.title, path: newsPath(comment.article) },
        reportCount: comment.reports.length,
        reporters: comment.reports.slice(0, 5).map((report) => report.reporter),
        lastReportedAt: comment.reports[0]?.createdAt.toISOString() ?? null,
      }))
      .sort((a, b) => Number(a.isHidden) - Number(b.isHidden) || b.reportCount - a.reportCount),
  });
}
