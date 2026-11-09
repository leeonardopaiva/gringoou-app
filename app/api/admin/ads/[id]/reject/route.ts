import { AdCampaignStatus, AdModerationStatus, AdPaymentStatus } from '@prisma/client';
import { notifyCampaignEvent } from '@/lib/ads/notifications';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAdminSession } from '@/lib/require-admin';
import { sendAdModerationEmail } from '@/lib/ads/moderation-email';

type RouteContext = { params: Promise<{ id: string }> };
const rejectionSchema = z.object({ reason: z.string().trim().min(5).max(1000) });

export async function POST(request: Request, context: RouteContext) {
  const { session, response } = await requireAdminSession();
  if (response || !session) return response;

  const parsed = rejectionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Informe o motivo da recusa.' }, { status: 400 });
  }

  const { id } = await context.params;
  const result = await prisma.banner.updateMany({
    where: { id, adAccountId: { not: null }, paymentStatus: AdPaymentStatus.PAID, moderationStatus: AdModerationStatus.PENDING_REVIEW },
    data: {
      moderationStatus: AdModerationStatus.REJECTED,
      campaignStatus: AdCampaignStatus.PAUSED,
      rejectionReason: parsed.data.reason,
      approvedById: session.user.id,
      approvedAt: null,
      isActive: false,
    },
  });
  if (result.count === 0) {
    return NextResponse.json({ error: 'Campanha pendente de revisao nao encontrada.' }, { status: 404 });
  }

  // Campanha de cortesia recusada: libera o cupom para a conta usar de novo em outra campanha.
  const wasCourtesy = await prisma.adPayment.findFirst({ where: { bannerId: id, provider: 'COURTESY' }, select: { id: true } });
  if (wasCourtesy) await prisma.adCouponRedemption.deleteMany({ where: { bannerId: id } });

  await notifyCampaignEvent(id, 'CAMPAIGN_REJECTED', parsed.data.reason);

  try {
    await sendAdModerationEmail(id, 'REJECTED', parsed.data.reason);
  } catch (error) {
    console.error('Failed to send ad rejection email:', error);
  }

  return NextResponse.json({ ok: true });
}
