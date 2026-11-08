import { NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { getPublishedNewsById } from '@/lib/server/news-articles';

type RouteContext = { params: Promise<{ id: string }> };

/** Uma notícia publicada (página da notícia). */
export async function GET(_request: Request, { params }: RouteContext) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const article = await getPublishedNewsById(id, session.user.id);
  if (!article) {
    return NextResponse.json({ error: 'Notícia não encontrada.' }, { status: 404 });
  }
  return NextResponse.json({ article });
}
