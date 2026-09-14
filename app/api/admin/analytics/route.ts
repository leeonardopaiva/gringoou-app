import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/require-admin';
import { prisma } from '@/lib/prisma';

const ANALYTICS_WINDOW_DAYS = 30;
const RECENT_EVENTS_LIMIT = 40;

type MinimalAnalyticsEvent = {
  type: string;
  targetType: string;
  targetKey: string;
  label: string;
  sourceSection: string | null;
  regionKey: string | null;
  userId: string | null;
  createdAt: Date;
};

const aggregateItems = <TKey extends string>(
  events: MinimalAnalyticsEvent[],
  matcher: (event: MinimalAnalyticsEvent) => boolean,
  buildKey: (event: MinimalAnalyticsEvent) => TKey,
  mapItem: (event: MinimalAnalyticsEvent, count: number) => Record<string, unknown>,
) => {
  const counts = new Map<TKey, { event: MinimalAnalyticsEvent; count: number }>();

  for (const event of events) {
    if (!matcher(event)) {
      continue;
    }

    const key = buildKey(event);
    const existing = counts.get(key);

    if (existing) {
      existing.count += 1;
      continue;
    }

    counts.set(key, { event, count: 1 });
  }

  return Array.from(counts.values())
    .sort((left, right) => right.count - left.count)
    .map(({ event, count }) => mapItem(event, count));
};

export async function GET(request: Request) {
  const { response } = await requireAdminSession();

  if (response) {
    return response;
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId')?.trim() || undefined;
  const days = Math.min(Math.max(Number(searchParams.get('days') || ANALYTICS_WINDOW_DAYS), 1), 365);
  const typeFilter = searchParams.get('type')?.trim() || undefined;
  const regionKey = searchParams.get('regionKey')?.trim() || undefined;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const where = {
    createdAt: {
      gte: since,
    },
    ...(userId ? { userId } : {}),
    ...(typeFilter ? { type: typeFilter } : {}),
    ...(regionKey ? { regionKey } : {}),
  };

  const [events, recentEvents, selectedUser] = await Promise.all([
    prisma.analyticsEvent.findMany({
      where,
      select: {
        type: true,
        targetType: true,
        targetKey: true,
        label: true,
        sourceSection: true,
        regionKey: true,
        userId: true,
        createdAt: true,
      },
    }),
    prisma.analyticsEvent.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      take: RECENT_EVENTS_LIMIT,
      select: {
        id: true,
        type: true,
        targetType: true,
        targetKey: true,
        label: true,
        sourcePath: true,
        sourceSection: true,
        regionKey: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
            image: true,
          },
        },
      },
    }),
    userId
      ? prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
            image: true,
            locationLabel: true,
            regionKey: true,
          },
        })
      : Promise.resolve(null),
  ]);

  const disabledFeatureClicks = events.filter((event) => event.type === 'disabled_feature_click');
  const bannerClicks = events.filter((event) => event.type === 'banner_click');
  const searchQueries = events.filter((event) => event.type === 'search_query');

  const topDisabledFeatures = aggregateItems(
    events,
    (event) => event.type === 'disabled_feature_click',
    (event) => `${event.targetKey}::${event.sourceSection || 'unknown'}`,
    (event, count) => ({
      targetKey: event.targetKey,
      label: event.label,
      sourceSection: event.sourceSection,
      count,
    }),
  ).slice(0, 8);

  const topBanners = aggregateItems(
    events,
    (event) => event.type === 'banner_click',
    (event) => event.targetKey,
    (event, count) => ({
      targetKey: event.targetKey,
      label: event.label,
      count,
    }),
  ).slice(0, 8);

  const topSources = aggregateItems(
    events,
    () => true,
    (event) => (event.sourceSection || 'Desconhecido') as string,
    (event, count) => ({
      sourceSection: event.sourceSection || 'Desconhecido',
      count,
    }),
  ).slice(0, 8);

  const topSearchesByRegion = aggregateItems(
    events,
    (event) => event.type === 'search_query',
    (event) => `${event.regionKey || 'sem-regiao'}::${event.targetKey}`,
    (event, count) => ({
      term: event.label,
      regionKey: event.regionKey,
      regionLabel: event.regionKey || 'Sem regiao',
      count,
    }),
  ).slice(0, 12);

  const trackedUsers = new Set(events.map((event) => event.userId).filter(Boolean)).size;
  const dayCounts = new Map<string, { totalEvents: number; bannerClicks: number; searchQueries: number }>();

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date();
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCDate(date.getUTCDate() - offset);
    dayCounts.set(date.toISOString().slice(0, 10), { totalEvents: 0, bannerClicks: 0, searchQueries: 0 });
  }

  for (const event of events) {
    const day = event.createdAt.toISOString().slice(0, 10);
    const bucket = dayCounts.get(day);
    if (!bucket) continue;
    bucket.totalEvents += 1;
    if (event.type === 'banner_click') bucket.bannerClicks += 1;
    if (event.type === 'search_query') bucket.searchQueries += 1;
  }

  const dailyActivity = Array.from(dayCounts, ([date, counts]) => ({ date, ...counts }));
  const activeRegions = aggregateItems(
    events,
    (event) => Boolean(event.regionKey),
    (event) => event.regionKey as string,
    (event, count) => ({ regionKey: event.regionKey, count }),
  ).slice(0, 8);

  return NextResponse.json({
    windowDays: days,
    filters: {
      type: typeFilter ?? null,
      regionKey: regionKey ?? null,
    },
    selectedUser,
    summary: {
      totalEvents: events.length,
      disabledFeatureClicks: disabledFeatureClicks.length,
      bannerClicks: bannerClicks.length,
      searchQueries: searchQueries.length,
      trackedUsers,
    },
    topDisabledFeatures,
    topBanners,
    topSources,
    topSearchesByRegion,
    dailyActivity,
    activeRegions,
    recentEvents,
  });
}
