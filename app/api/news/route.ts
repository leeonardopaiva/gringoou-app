import { NextResponse } from 'next/server';
import { listPublishedNews, listPublishedNewsSources } from '@/lib/server/news-articles';

/** Feed público de Notícias editoriais (somente publicadas), com paginação por cursor. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sort = searchParams.get('sort') === 'oldest' ? 'oldest' : 'recent';
  const wantsSources = searchParams.get('sources') === '1';

  try {
    const [feed, sources] = await Promise.all([
      listPublishedNews({
        regionKey: searchParams.get('region')?.trim() || null,
        category: searchParams.get('category')?.trim() || null,
        source: searchParams.get('source')?.trim() || null,
        query: searchParams.get('q')?.trim() || null,
        cursor: searchParams.get('cursor'),
        sort,
        limit: Number(searchParams.get('limit')) || undefined,
      }),
      wantsSources ? listPublishedNewsSources() : Promise.resolve(undefined),
    ]);
    return NextResponse.json({ ...feed, ...(sources ? { sources } : {}) });
  } catch (error) {
    console.error('Failed to list news:', error);
    return NextResponse.json({ error: 'Não foi possível carregar as notícias.' }, { status: 500 });
  }
}
