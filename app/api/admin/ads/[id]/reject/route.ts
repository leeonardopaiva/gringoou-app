import { AdCampaignStatus, AdModerationStatus, AdPaymentStatus } from '@prisma/client';
import { notifyCampaignEvent } from '@/lib/ads/notifications';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getStripe } from '@/lib/ads/server';
import { prisma } from '@/lib/prisma';
import { requireAdminSession } from '@/lib/require-admin';
import { sendAdModerationEmail } from '@/lib/ads/moderation-email';

type RouteContext = { params: Promise<{ id: string }> };
const rejectionSchema = z.object({ reason: z.string().trim().min(5).max(1000), refund: z.boolean().optional() });

export async function POST(request: Request, context: RouteContext) {
  const { session, response } = await requireAdminSession();
  if (response || !session) return response;

  const parsed = rejectionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Informe o motivo da recusa.' }, { status: 400 });
  }

  const { id } = await context.params;

  // Estorno opcional (total): só para pagamento Stripe confirmado. Feito ANTES de rejeitar; se o Stripe
  // recusar, nada muda e a campanha continua pendente de revisão.
  let refundedPaymentId: string | null = null;
  if (parsed.data.refund) {
    const pending = await prisma.banner.findFirst({
      where: { id, adAccountId: { not: null }, paymentStatus: AdPaymentStatus.PAID, moderationStatus: AdModerationStatus.PENDING_REVIEW },
      select: { payments: { where: { provider: 'STRIPE', status: AdPaymentStatus.PAID }, orderBy: { createdAt: 'desc' }, take: 1, select: { id: true, providerPaymentId: true } } },
    });
    if (!pending) return NextResponse.json({ error: 'Campanha pendente de revisao nao encontrada.' }, { status: 404 });
    const payment = pending.payments[0];
    if (!payment?.providerPaymentId) {
      return NextResponse.json({ error: 'Esta campanha nao tem pagamento Stripe para estornar (ex.: cortesia).' }, { status: 409 });
    }
    try {
      await getStripe().refunds.create(
        { payment_intent: payment.providerPaymentId, reason: 'requested_by_customer', metadata: { bannerId: id, rejectedBy: session.user.id } },
        { idempotencyKey: `reject-refund-${payment.id}` },
      );
    } catch (error) {
      console.error('Failed to refund rejected ad campaign:', error);
      return NextResponse.json({ error: `O Stripe nao concluiu o estorno: ${error instanceof Error ? error.message : 'erro desconhecido'}. A campanha nao foi rejeitada.` }, { status: 502 });
    }
    refundedPaymentId = payment.id;
  }

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

  if (refundedPaymentId) {
    await prisma.adPayment.update({ where: { id: refundedPaymentId }, data: { status: AdPaymentStatus.REFUNDED } });
    // Pagamento estornado: o crédito do cupom volta a ficar disponível para a conta.
    await prisma.adCouponRedemption.deleteMany({ where: { bannerId: id } });
    await notifyCampaignEvent(id, 'PAYMENT_REFUNDED');
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
