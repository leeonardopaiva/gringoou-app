import { AdModerationStatus, AdPaymentStatus } from '@prisma/client';
import type Stripe from 'stripe';
import { notifyCampaignEvent } from '@/lib/ads/notifications';
import { getStripe } from '@/lib/ads/server';
import { prisma } from '@/lib/prisma';

/**
 * Confirma um pagamento Stripe e envia a campanha para a fila de aprovação do admin.
 *
 * Regra: só um PaymentIntent com status `succeeded` avança. Pagamento negado, cancelado, pendente
 * ou com erro nunca muda a campanha. Idempotente: pode ser chamada pelo webhook e pela
 * reconciliação ao mesmo tempo, sem duplicar nada.
 */
export const confirmStripePayment = async (intent: Stripe.PaymentIntent) => {
  if (intent.status !== 'succeeded') {
    throw new Error(`Pagamento nao concluido (status: ${intent.status}).`);
  }
  const bannerId = intent.metadata.bannerId;
  if (!bannerId || intent.currency.toLowerCase() !== 'usd') {
    throw new Error('Pagamento sem campanha ou moeda USD valida.');
  }

  const campaign = await prisma.banner.findUnique({
    where: { id: bannerId },
    select: { contractAmountCents: true },
  });
  if (!campaign || campaign.contractAmountCents !== intent.amount_received) {
    throw new Error('Valor do pagamento divergente do contrato.');
  }

  const couponId = intent.metadata.couponId;
  const adAccountId = intent.metadata.adAccountId;
  if (couponId && adAccountId) {
    await prisma.adCouponRedemption
      .create({ data: { couponId, adAccountId, bannerId, userId: intent.metadata.userId || 'unknown' } })
      .catch(() => undefined); // já registrado (reenvio do webhook / reconciliação)
  }

  const [, moved] = await prisma.$transaction([
    prisma.adPayment.upsert({
      where: { providerPaymentId: intent.id },
      update: { amountCents: intent.amount_received, currency: 'USD', status: AdPaymentStatus.PAID, paidAt: new Date() },
      create: {
        bannerId,
        provider: 'STRIPE',
        providerPaymentId: intent.id,
        amountCents: intent.amount_received,
        currency: 'USD',
        status: AdPaymentStatus.PAID,
        paidAt: new Date(),
      },
    }),
    prisma.banner.updateMany({
      where: { id: bannerId, paymentStatus: AdPaymentStatus.PENDING, moderationStatus: AdModerationStatus.DRAFT },
      data: {
        paymentStatus: AdPaymentStatus.PAID,
        moderationStatus: AdModerationStatus.PENDING_REVIEW,
        submittedAt: new Date(),
        isActive: false,
      },
    }),
  ]);
  // Só notifica quando esta chamada realmente moveu a campanha (evita e-mail duplicado).
  if (moved.count > 0) await notifyCampaignEvent(bannerId, 'PAYMENT_CONFIRMED');
};

/** Marca o pagamento como falho. A campanha continua rascunho, sem avançar. */
export const markStripePaymentFailed = async (intentId: string, bannerId?: string | null) => {
  const { count } = await prisma.adPayment.updateMany({
    where: { providerPaymentId: intentId, status: AdPaymentStatus.PENDING },
    data: { status: AdPaymentStatus.FAILED },
  });
  if (count > 0 && bannerId) await notifyCampaignEvent(bannerId, 'PAYMENT_FAILED');
};

/**
 * Reconciliação: consulta o Stripe diretamente e aplica o resultado. Não depende do webhook ter
 * chegado (ex.: ambiente local sem `stripe listen`, atraso ou endpoint mal configurado).
 * Devolve o estado do pagamento da campanha.
 */
export type PaymentSyncResult = { state: 'paid' | 'failed' | 'pending'; detail: string };

export const syncCampaignPaymentDetailed = async (bannerId: string): Promise<PaymentSyncResult> => {
  const banner = await prisma.banner.findUnique({
    where: { id: bannerId },
    select: {
      paymentStatus: true,
      payments: { where: { provider: 'STRIPE' }, orderBy: { createdAt: 'desc' }, take: 1, select: { providerPaymentId: true, status: true } },
    },
  });
  if (!banner) return { state: 'pending', detail: 'Campanha nao encontrada.' };
  if (banner.paymentStatus === AdPaymentStatus.PAID) return { state: 'paid', detail: 'Ja confirmada.' };

  const payment = banner.payments[0];
  if (!payment?.providerPaymentId) return { state: 'pending', detail: 'Nenhum pagamento Stripe registrado para esta campanha.' };

  try {
    const intent = await getStripe().paymentIntents.retrieve(payment.providerPaymentId);
    if (intent.status === 'succeeded') {
      await confirmStripePayment(intent);
      return { state: 'paid', detail: 'Pagamento confirmado no Stripe.' };
    }
    if (intent.status === 'canceled' || (intent.status === 'requires_payment_method' && intent.last_payment_error)) {
      await markStripePaymentFailed(intent.id, bannerId);
      return { state: 'failed', detail: intent.last_payment_error?.message ?? `Pagamento ${intent.status}.` };
    }
    return { state: 'pending', detail: `Stripe informa status "${intent.status}".` };
  } catch (error) {
    console.error('Failed to reconcile Stripe payment:', error);
    const detail = error instanceof Error ? error.message : 'Erro ao consultar o Stripe.';
    return { state: payment.status === AdPaymentStatus.FAILED ? 'failed' : 'pending', detail };
  }
};

export const syncCampaignPayment = async (bannerId: string) => (await syncCampaignPaymentDetailed(bannerId)).state;
