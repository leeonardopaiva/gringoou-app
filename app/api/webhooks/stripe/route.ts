import { AdCampaignStatus, AdModerationStatus, AdPaymentStatus } from '@prisma/client';
import { notifyCampaignEvent } from '@/lib/ads/notifications';
import { confirmStripePayment, markStripePaymentFailed } from '@/lib/ads/payment-confirmation';
import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripe } from '@/lib/ads/server';
import { prisma } from '@/lib/prisma';

const paymentIntentId = (session: Stripe.Checkout.Session) =>
  typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id ?? null;

const refundPayment = async (providerPaymentId: string) => {
  const payment = await prisma.adPayment.findUnique({ where: { providerPaymentId }, select: { id: true, bannerId: true, status: true } });
  if (!payment || payment.status !== AdPaymentStatus.PAID) return;
  // Pagamento reembolsado: o crédito do cupom volta a ficar disponível para a conta.
  await prisma.adCouponRedemption.deleteMany({ where: { bannerId: payment.bannerId } });
  await notifyCampaignEvent(payment.bannerId, 'PAYMENT_REFUNDED');
  await prisma.$transaction([
    prisma.adPayment.update({ where: { id: payment.id }, data: { status: AdPaymentStatus.REFUNDED } }),
    prisma.banner.update({
      where: { id: payment.bannerId },
      data: {
        isActive: false,
        paymentStatus: AdPaymentStatus.REFUNDED,
        campaignStatus: AdCampaignStatus.PAUSED,
        moderationStatus: AdModerationStatus.REJECTED,
        rejectionReason: 'Pagamento reembolsado.',
      },
    }),
  ]);
};

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  const signature = request.headers.get('stripe-signature');
  if (!webhookSecret || !signature) {
    return NextResponse.json({ error: 'Webhook Stripe nao configurado.' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(await request.text(), signature, webhookSecret);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Assinatura Stripe invalida.' },
      { status: 400 },
    );
  }

  if (event.type === 'payment_intent.succeeded') {
    try {
      await confirmStripePayment(event.data.object);
    } catch (error) {
      console.error('Failed to confirm Stripe PaymentIntent:', error);
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Pagamento invalido.' }, { status: 409 });
    }
  }

  if (event.type === 'payment_intent.payment_failed') {
    await markStripePaymentFailed(event.data.object.id, event.data.object.metadata?.bannerId);
  }

  if (event.type === 'payment_intent.canceled') {
    await refundPayment(event.data.object.id);
  }

  if (event.type === 'charge.refunded') {
    const charge = event.data.object;
    const intentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id;
    if (intentId) await refundPayment(intentId);
  }

  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    const checkout = event.data.object;
    const bannerId = checkout.metadata?.bannerId;
    if (bannerId && checkout.payment_status === 'paid') {
      const amountCents = checkout.amount_total ?? 0;
      if (checkout.currency?.toLowerCase() !== 'usd') {
        return NextResponse.json({ error: 'Moeda de pagamento invalida.' }, { status: 409 });
      }
      const campaign = await prisma.banner.findUnique({
        where: { id: bannerId },
        select: { contractAmountCents: true },
      });
      if (!campaign || campaign.contractAmountCents !== amountCents) {
        console.error('Stripe amount does not match ad contract snapshot.', { bannerId, amountCents });
        return NextResponse.json({ error: 'Valor do pagamento divergente.' }, { status: 409 });
      }

      await prisma.$transaction([
        prisma.adPayment.upsert({
          where: { providerSessionId: checkout.id },
          update: {
            providerPaymentId: paymentIntentId(checkout),
            amountCents,
            currency: 'USD',
            status: AdPaymentStatus.PAID,
            paidAt: new Date(),
          },
          create: {
            bannerId,
            provider: 'STRIPE',
            providerSessionId: checkout.id,
            providerPaymentId: paymentIntentId(checkout),
            amountCents,
            currency: 'USD',
            status: AdPaymentStatus.PAID,
            paidAt: new Date(),
          },
        }),
        prisma.banner.updateMany({
          where: {
            id: bannerId,
            paymentStatus: AdPaymentStatus.PENDING,
            moderationStatus: AdModerationStatus.DRAFT,
          },
          data: {
            paymentStatus: AdPaymentStatus.PAID,
            moderationStatus: AdModerationStatus.PENDING_REVIEW,
            submittedAt: new Date(),
            isActive: false,
          },
        }),
      ]);
    }
  }

  if (event.type === 'checkout.session.async_payment_failed' || event.type === 'checkout.session.expired') {
    const checkout = event.data.object;
    await prisma.adPayment.updateMany({
      where: { providerSessionId: checkout.id },
      data: { status: AdPaymentStatus.FAILED },
    });
  }

  return NextResponse.json({ received: true });
}
