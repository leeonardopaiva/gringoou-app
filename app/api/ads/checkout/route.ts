import { AdCampaignStatus, AdModerationStatus, AdPaymentStatus } from '@prisma/client';
import { NextResponse } from 'next/server';
import { isAdsSmokeTestModeEnabled } from '@/lib/ads/contracts';
import { evaluateAdCoupon } from '@/lib/ads/coupons';
import { adPlanTotalCents, getAdPlanCatalog } from '@/lib/ads/plans';
import { getAdDestinationFields, getStripe } from '@/lib/ads/server';
import { adCheckoutSchema } from '@/lib/ads/validation';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { canManageAdBilling, getPromotionEligibilityError } from '@/lib/ads/account';
import { isOperationalFeatureEnabled } from '@/lib/operational-flags';

export async function POST(request: Request) {
  if (!isOperationalFeatureEnabled('adsCheckout')) {
    return NextResponse.json(
      { error: 'A contratacao de anuncios esta temporariamente pausada.' },
      { status: 503, headers: { 'Retry-After': '300' } },
    );
  }

  const session = await getServerAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = adCheckoutSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados invalidos.' }, { status: 400 });
  }

  const membership = await prisma.adAccountUser.findUnique({
    where: { adAccountId_userId: { adAccountId: parsed.data.adAccountId, userId: session.user.id } },
    select: {
      role: true,
      adAccount: {
        select: { businessId: true, business: { select: { status: true } } },
      },
    },
  });
  if (!membership || !canManageAdBilling(membership.role)) {
    return NextResponse.json({ error: 'Apenas o administrador principal da conta pode contratar e pagar anuncios.' }, { status: 403 });
  }
  const eligibilityError = getPromotionEligibilityError(membership.adAccount);
  if (eligibilityError) return NextResponse.json(eligibilityError, { status: 409 });

  const banner = await prisma.banner.findFirst({
    where: {
      id: parsed.data.bannerId,
      adAccountId: parsed.data.adAccountId,
      moderationStatus: AdModerationStatus.DRAFT,
    },
    select: {
      id: true,
      payments: {
        where: { status: AdPaymentStatus.PENDING, provider: 'STRIPE' },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { providerPaymentId: true },
      },
    },
  });
  if (!banner) return NextResponse.json({ error: 'Rascunho nao encontrado ou indisponivel.' }, { status: 404 });

  const planInfo = (await getAdPlanCatalog()).find((item) => item.plan === parsed.data.plan);
  if (!planInfo || !planInfo.isActive || planInfo.durationMonths !== parsed.data.durationMonths) {
    return NextResponse.json({ error: 'O pacote selecionado não está mais disponível. Escolha o pacote novamente.' }, { status: 409 });
  }
  let amountCents = isAdsSmokeTestModeEnabled() ? 100 : adPlanTotalCents(planInfo);
  let appliedCouponId: string | null = null;
  if (parsed.data.couponCode && !isAdsSmokeTestModeEnabled()) {
    const evaluation = await evaluateAdCoupon({ code: parsed.data.couponCode, plan: parsed.data.plan, adAccountId: parsed.data.adAccountId, userEmail: session.user.email, userId: session.user.id, bannerId: banner.id, totalCents: amountCents });
    if (!evaluation.ok) return NextResponse.json({ error: evaluation.error }, { status: 400 });
    if (evaluation.full) return NextResponse.json({ error: 'Este cupom cobre o valor inteiro. Use a opção de aplicar cupom.' }, { status: 409 });
    amountCents = evaluation.payCents;
    appliedCouponId = evaluation.couponId;
    const reserved = await prisma.adCouponRedemption.findUnique({ where: { adAccountId: parsed.data.adAccountId }, select: { bannerId: true } });
    if (!reserved) {
      try {
        await prisma.adCouponRedemption.create({ data: { couponId: evaluation.couponId, adAccountId: parsed.data.adAccountId, bannerId: banner.id, userId: session.user.id } });
      } catch {
        return NextResponse.json({ error: 'Esta conta já usou um cupom.' }, { status: 409 });
      }
    }
  }

  const pendingPaymentIntentId = banner.payments[0]?.providerPaymentId;
  if (pendingPaymentIntentId) {
    try {
      const existingIntent = await getStripe().paymentIntents.retrieve(pendingPaymentIntentId);
      if (existingIntent.amount === amountCents && ['requires_payment_method', 'requires_confirmation', 'requires_action'].includes(existingIntent.status)) {
        return NextResponse.json({ clientSecret: existingIntent.client_secret });
      }
      if (existingIntent.status === 'processing' || existingIntent.status === 'succeeded') {
        return NextResponse.json({ error: 'Pagamento em processamento. Aguarde a confirmacao do Stripe.' }, { status: 409 });
      }
    } catch (error) {
      console.error('Failed to recover pending Stripe checkout:', error);
    }

    await prisma.adPayment.updateMany({
      where: { providerPaymentId: pendingPaymentIntentId, status: AdPaymentStatus.PENDING },
      data: { status: AdPaymentStatus.FAILED },
    });
  }

  const region = await prisma.region.findFirst({ where: { key: parsed.data.regionKey, isActive: true }, select: { key: true } });
  if (!region) return NextResponse.json({ error: 'Regiao invalida.' }, { status: 400 });

  const destinationFields = getAdDestinationFields(parsed.data.goal, parsed.data.destination);

  await prisma.banner.update({
    where: { id: banner.id },
    data: {
      name: parsed.data.headline,
      headline: parsed.data.headline,
      description: parsed.data.description,
      imageUrl: parsed.data.imageUrl,
      ctaLabel: parsed.data.ctaLabel,
      goal: parsed.data.goal,
      ...destinationFields,
      regionKey: parsed.data.regionKey,
      plan: parsed.data.plan,
      durationMonths: parsed.data.durationMonths,
      contractAmountCents: amountCents,
      campaignStatus: AdCampaignStatus.DRAFT,
      moderationStatus: AdModerationStatus.DRAFT,
      paymentStatus: AdPaymentStatus.PENDING,
      isActive: false,
    },
  });

  try {
    const stripe = getStripe();
    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: amountCents,
        currency: 'usd',
        description: `Campanha ${planInfo.name} - ${parsed.data.durationMonths} mes(es): ${parsed.data.headline}`,
        receipt_email: session.user.email ?? undefined,
        metadata: { bannerId: banner.id, userId: session.user.id, adAccountId: parsed.data.adAccountId, ...(appliedCouponId ? { couponId: appliedCouponId } : {}) },
      },
      { idempotencyKey: parsed.data.idempotencyKey },
    );

    await prisma.adPayment.upsert({
      where: { providerPaymentId: paymentIntent.id },
      update: { amountCents, currency: 'USD', status: AdPaymentStatus.PENDING },
      create: {
        bannerId: banner.id,
        provider: 'STRIPE',
        providerPaymentId: paymentIntent.id,
        amountCents,
        currency: 'USD',
        status: AdPaymentStatus.PENDING,
      },
    });

    return NextResponse.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error('Failed to create Stripe checkout:', error);
    return NextResponse.json(
      { error: 'Nao foi possivel iniciar o pagamento. Tente novamente em instantes.' },
      { status: 503 },
    );
  }
}
