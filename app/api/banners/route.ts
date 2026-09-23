import { NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { scoreDeliveryCandidate, selectWeightedWithDiversity } from '@/lib/ads/delivery';

const MAX_PAID_ADS_BY_PLACEMENT = 4;
const MAX_HOME_BANNERS = 8;
const FREQUENCY_CAP_PER_DAY = 3;

const normalizeTarget = (value: string) => value.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').trim();
const hasIntersection = (left: string[], right: string[]) => {
  const rightSet = new Set(right.map(normalizeTarget));
  return left.some((value) => rightSet.has(normalizeTarget(value)));
};

export async function GET(request: Request) {
  const session = await getServerAuthSession();
  const { searchParams } = new URL(request.url);
  // The UI can switch regions before the refreshed session reaches every
  // client component. An explicit region must therefore win over the session.
  const regionKey = searchParams.get('region') ?? session?.user?.regionKey;
  const placementParam = searchParams.get('placement');
  const now = new Date();

  if (placementParam === 'home') {
    const homeBanners = await prisma.banner.findMany({
      where: {
        adAccountId: null,
        isActive: true,
        campaignStatus: 'ACTIVE',
        moderationStatus: 'APPROVED',
        OR: [{ placement: 'HOME' }, { placement: 'BOTH' }],
        AND: [
          { OR: [{ regionKey: null }, { regionKey: regionKey ?? '__no_region__' }] },
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        ],
      },
      orderBy: [{ updatedAt: 'desc' }],
      take: MAX_HOME_BANNERS,
      select: {
        id: true,
        name: true,
        imageUrl: true,
        type: true,
        placement: true,
        targetUrl: true,
        regionKey: true,
        objective: true,
        headline: true,
        description: true,
        ctaLabel: true,
        goal: true,
        region: { select: { label: true } },
      },
    });

    return NextResponse.json({
      banners: homeBanners.map((banner) => ({
        ...banner,
        regionLabel: banner.region?.label ?? null,
        region: undefined,
        scope: banner.regionKey ? 'regional' : 'global',
        matchedBy: banner.regionKey ? ['region'] : [],
        sponsored: true,
        advertiserName: banner.name,
        advertiserLogoUrl: null,
      })),
    });
  }

  if (placementParam !== 'feed') {
    return NextResponse.json({ error: 'Local de exibicao invalido.' }, { status: 400 });
  }

  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1_000);

  const [viewer, recentSearches] = await Promise.all([
    session?.user?.id
      ? prisma.user.findUnique({ where: { id: session.user.id }, select: { interests: true } })
      : Promise.resolve(null),
    session?.user?.id
      ? prisma.analyticsEvent.findMany({
          where: { userId: session.user.id, type: 'search_query', createdAt: { gte: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1_000) } },
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: { targetKey: true, label: true },
        })
      : Promise.resolve([]),
  ]);

  const viewerInterests = (viewer?.interests ?? []).map(normalizeTarget);
  const viewerSearchTerms = recentSearches.flatMap((event) => [normalizeTarget(event.targetKey), normalizeTarget(event.label)]);
  const eligibility = {
    isActive: true,
    campaignStatus: 'ACTIVE' as const,
    moderationStatus: 'APPROVED' as const,
    paymentStatus: 'PAID' as const,
    adAccountId: { not: null },
    OR: [{ placement: 'FEED' as const }, { placement: 'BOTH' as const }],
    AND: [
      { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
      { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
    ],
  };

  const banners = await prisma.banner.findMany({
    where: regionKey
      ? { ...eligibility, AND: [...eligibility.AND, { OR: [{ regionKey }, { regionKey: null }] }] }
      : { ...eligibility, regionKey: null },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true, name: true, imageUrl: true, type: true, placement: true, targetUrl: true,
      regionKey: true, targetInterests: true, targetKeywords: true, targetCategories: true,
      objective: true, plan: true, billingMode: true, bidCents: true, dailyBudgetCents: true,
      totalBudgetCents: true, spentCents: true, updatedAt: true, createdAt: true, startsAt: true,
      endsAt: true, adAccountId: true, headline: true, description: true, ctaLabel: true, goal: true,
      adAccount: { select: { name: true, logoUrl: true } },
      region: { select: { key: true, label: true } },
      impressions: {
        where: session?.user?.id
          ? { userId: session.user.id, createdAt: { gte: oneDayAgo } }
          : { id: '__anonymous_frequency_not_persisted__' },
        select: { id: true },
      },
      charges: { where: { createdAt: { gte: new Date(new Date(now).setHours(0, 0, 0, 0)) } }, select: { amountCents: true } },
      _count: { select: { impressions: true } },
    },
  });

  const clicks = banners.length
    ? await prisma.analyticsEvent.groupBy({
        by: ['targetKey'],
        where: { type: 'banner_click', targetType: 'banner', targetKey: { in: banners.map((banner) => banner.id) } },
        _count: { _all: true },
      })
    : [];
  const clicksByBanner = new Map(clicks.map((entry) => [entry.targetKey, entry._count._all]));

  const candidates = banners.flatMap((banner) => {
    const hasTargeting = Boolean(banner.targetInterests.length || banner.targetKeywords.length || banner.targetCategories.length);
    const regionMatch = Boolean(regionKey && banner.regionKey === regionKey);
    const interestMatch = hasIntersection(banner.targetInterests, viewerInterests);
    const keywordMatch = hasIntersection(banner.targetKeywords, viewerSearchTerms);
    const categoryMatch = hasIntersection(banner.targetCategories, [...viewerSearchTerms, ...viewerInterests]);
    if (hasTargeting && !interestMatch && !keywordMatch && !categoryMatch) return [];
    if (banner.impressions.length >= FREQUENCY_CAP_PER_DAY) return [];
    if (banner.totalBudgetCents !== null && banner.spentCents >= banner.totalBudgetCents) return [];
    if (banner.dailyBudgetCents !== null && banner.charges.reduce((sum, charge) => sum + charge.amountCents, 0) >= banner.dailyBudgetCents) return [];

    const delivery = scoreDeliveryCandidate({
      id: banner.id,
      adAccountId: banner.adAccountId,
      plan: banner.plan,
      startsAt: banner.startsAt,
      endsAt: banner.endsAt,
      createdAt: banner.createdAt,
      totalImpressions: banner._count.impressions,
      recentImpressions: banner.impressions.length,
      clicks: clicksByBanner.get(banner.id) ?? 0,
      regionMatch,
      interestMatch,
      keywordMatch,
      categoryMatch,
    }, now);

    return [{ banner, delivery }];
  });

  const selected = selectWeightedWithDiversity(
    candidates.map((candidate) => ({ item: candidate, weight: candidate.delivery.score, advertiserId: candidate.banner.adAccountId })),
    MAX_PAID_ADS_BY_PLACEMENT,
  );

  return NextResponse.json({
    banners: selected.map(({ banner, delivery }) => ({
      id: banner.id,
      name: banner.name,
      imageUrl: banner.imageUrl,
      type: banner.type,
      placement: banner.placement,
      targetUrl: banner.targetUrl,
      regionKey: banner.regionKey,
      regionLabel: banner.region?.label ?? null,
      scope: banner.regionKey ? 'regional' : 'global',
      objective: banner.objective,
      matchedBy: delivery.reasons,
      sponsored: true,
      headline: banner.headline?.slice(0, 70) ?? null,
      description: banner.description?.slice(0, 600) ?? null,
      ctaLabel: banner.ctaLabel?.slice(0, 40) ?? null,
      goal: banner.goal,
      advertiserName: banner.adAccount?.name ?? banner.name,
      advertiserLogoUrl: banner.adAccount?.logoUrl ?? null,
    })),
  });
}
