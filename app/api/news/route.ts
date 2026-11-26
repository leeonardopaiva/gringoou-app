import { NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { resolveRegionScope } from '@/lib/region-scope';
import { listPublishedNews, listPublishedNewsSources } from '@/lib/server/news-articles';

/** Feed público de Notícias editoriais (somente publicadas), com paginação por cursor. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sort = searchParams.get('sort') === 'oldest' ? 'oldest' : 'recent';
  const wantsSources = searchParams.get('sources') === '1';
  const session = await getServerAuthSession();

  try {
    const [feed, sources] = await Promise.all([
      listPublishedNews({
        // Signed-in members only get their own region (plus news without a region); the
        // `region` parameter is honored for admins/moderators and for public visitors.
        regionKey: session?.user?.id
          ? (resolveRegionScope(session, searchParams.get('region')?.trim() || null).regionKey ?? null)
          : searchParams.get('region')?.trim() || null,
        category: searchParams.get('category')?.trim() || null,
        source: searchParams.get('source')?.trim() || null,
        query: searchParams.get('q')?.trim() || null,
        cursor: searchParams.get('cursor'),
        sort,
        limit: Number(searchParams.get('limit')) || undefined,
        viewerId: session?.user?.id ?? null,
      }),
      wantsSources ? listPublishedNewsSources() : Promise.resolve(undefined),
    ]);
    return NextResponse.json({ ...feed, ...(sources ? { sources } : {}) });
  } catch (error) {
    console.error('Failed to list news:', error);
    return NextResponse.json({ error: 'Não foi possível carregar as notícias.' }, { status: 500 });
  }
}
