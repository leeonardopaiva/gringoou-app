import { NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { newsUseCases } from '@/lib/server/news-usecases';
import { findRegionByKey } from '@/lib/region-store';

export async function GET(request: Request) {
  const session = await getServerAuthSession();
  const { searchParams } = new URL(request.url);

  const regionKey = searchParams.get('region') ?? session?.user?.regionKey ?? null;
  const category = searchParams.get('category') || undefined;
  const query = searchParams.get('q') || undefined;

  const region = regionKey ? await findRegionByKey(regionKey) : null;

  const feed = await newsUseCases.listNews({
    regionKey,
    regionLabel: region?.label ?? null,
    city: region?.city ?? null,
    state: region?.state ?? null,
    countryCode: region?.countryCode ?? null,
    category: (category as 'for-you' | 'region' | 'immigration' | 'community' | 'headlines') ?? 'region',
    query,
    limit: 30,
  });

  return NextResponse.json({
    items: feed.items,
    regionKey: feed.regionKey,
    regionLabel: feed.regionLabel,
    provider: feed.provider,
    fetchedAt: feed.fetchedAt,
  });
}