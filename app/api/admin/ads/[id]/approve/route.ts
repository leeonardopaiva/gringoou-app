import { AdCampaignStatus, AdModerationStatus, AdPaymentStatus, BannerPlacement } from '@prisma/client';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminSession } from '@/lib/require-admin';
import { AD_DURATIONS } from '@/lib/ads/contracts';
import { sendAdModerationEmail } from '@/lib/ads/moderation-email';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const { session, response } = await requireAdminSession();
  if (response || !session) return response;

  const { id } = await context.params;
  const campaign = await prisma.banner.findFirst({
    where: {
      id,
      adAccountId: { not: null },
      paymentStatus: AdPaymentStatus.PAID,
      moderationStatus: AdModerationStatus.PENDING_REVIEW,
    },
    select: { id: true, plan: true, durationMonths: true },
  });
  if (!campaign) {
    return NextResponse.json({ error: 'Campanha paga e pendente de revisao nao encontrada.' }, { status: 409 });
  }
  if (!campaign.plan || !campaign.durationMonths || !(AD_DURATIONS as readonly number[]).includes(campaign.durationMonths)) {
    return NextResponse.json({ error: 'Plano e vigencia da campanha sao invalidos.' }, { status: 409 });
  }

  const startsAt = new Date();
  const endsAt = new Date(startsAt);
  endsAt.setMonth(endsAt.getMonth() + campaign.durationMonths);

  const result = await prisma.banner.updateMany({
    where: {
      id: campaign.id,
      adAccountId: { not: null },
      paymentStatus: AdPaymentStatus.PAID,
      moderationStatus: AdModerationStatus.PENDING_REVIEW,
    },
    data: {
      moderationStatus: AdModerationStatus.APPROVED,
      campaignStatus: AdCampaignStatus.ACTIVE,
      placement: BannerPlacement.BOTH,
      approvedById: session.user.id,
      approvedAt: startsAt,
      startsAt,
      endsAt,
      rejectionReason: null,
      isActive: true,
    },
  });
  if (result.count === 0) {
    return NextResponse.json({ error: 'A campanha ja foi revisada por outro administrador.' }, { status: 409 });
  }

  const banner = await prisma.banner.findUnique({
    where: { id: campaign.id },
    select: { id: true, moderationStatus: true, startsAt: true, endsAt: true },
  });

  try {
    await sendAdModerationEmail(campaign.id, 'APPROVED');
  } catch (error) {
    console.error('Failed to send ad approval email:', error);
  }

  return NextResponse.json({ banner });
}
