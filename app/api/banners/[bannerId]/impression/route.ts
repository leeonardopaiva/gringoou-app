import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type RouteContext = { params: Promise<{ bannerId: string }> };
const payloadSchema = z.object({
  placement: z.enum(['HOME', 'FEED']),
  matchedBy: z.array(z.string().max(40)).max(10).default([]),
});

export async function POST(request: Request, context: RouteContext) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = payloadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Impressao invalida.' }, { status: 400 });
  const { bannerId } = await context.params;
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1_000);
  const dedupeThreshold = new Date(now.getTime() - 10 * 60 * 1_000);

  const banner = await prisma.banner.findFirst({
    where: {
      id: bannerId,
      isActive: true,
      AND: [
        { OR: [{ regionKey: null }, { regionKey: session.user.regionKey ?? '__no_region__' }] },
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      ],
    },
    select: {
      id: true,
      adAccountId: true,
      placement: true,
      campaignStatus: true,
      moderationStatus: true,
      paymentStatus: true,
      billingMode: true,
      bidCents: true,
      totalBudgetCents: true,
      spentCents: true,
    },
  });
  if (!banner) return NextResponse.json({ error: 'Campanha indisponivel.' }, { status: 404 });

  const isHomeBanner = banner.adAccountId === null;
  const validPlacement = isHomeBanner
    ? parsed.data.placement === 'HOME' && (banner.placement === 'HOME' || banner.placement === 'BOTH')
    : parsed.data.placement === 'FEED' && (banner.placement === 'FEED' || banner.placement === 'BOTH');
  const campaignIsEligible =
    banner.campaignStatus === 'ACTIVE' &&
    banner.moderationStatus === 'APPROVED' &&
    (isHomeBanner || banner.paymentStatus === 'PAID');

  if (!validPlacement || !campaignIsEligible) {
    return NextResponse.json({ error: 'Campanha indisponivel.' }, { status: 404 });
  }

  const [recentCount, duplicate] = await Promise.all([
    prisma.adImpression.count({ where: { bannerId, userId: session.user.id, createdAt: { gte: oneDayAgo } } }),
    prisma.adImpression.findFirst({ where: { bannerId, userId: session.user.id, placement: parsed.data.placement, createdAt: { gte: dedupeThreshold } }, select: { id: true } }),
  ]);
  if (duplicate || (!isHomeBanner && recentCount >= 3)) {
    return NextResponse.json({ ok: true, deduplicated: true });
  }
  if (!isHomeBanner && banner.totalBudgetCents !== null && banner.spentCents >= banner.totalBudgetCents) {
    return NextResponse.json({ error: 'Orcamento encerrado.' }, { status: 409 });
  }

  const impressionData = {
    bannerId,
    userId: session.user.id,
    placement: parsed.data.placement,
    sourcePath: parsed.data.placement === 'FEED' ? '/community' : '/inicio',
    sourceSection: parsed.data.placement === 'FEED' ? 'community_feed_banner' : 'home_banner',
    regionKey: session.user.regionKey ?? null,
    matchedBy: parsed.data.matchedBy,
  } as const;

  if (!isHomeBanner && banner.billingMode === 'CPM' && banner.bidCents > 0) {
    const amountCents = Math.max(1, Math.ceil(banner.bidCents / 1_000));
    await prisma.$transaction([
      prisma.adImpression.create({ data: impressionData, select: { id: true } }),
      prisma.banner.update({ where: { id: bannerId }, data: { spentCents: { increment: amountCents } }, select: { id: true } }),
      prisma.adCharge.create({ data: { bannerId, userId: session.user.id, amountCents, billingMode: 'CPM', sourceType: 'viewable_impression' }, select: { id: true } }),
    ]);
  } else {
    await prisma.adImpression.create({ data: impressionData, select: { id: true } });
  }

  return NextResponse.json({ ok: true });
}
