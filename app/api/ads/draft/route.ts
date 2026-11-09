import { AdCampaignStatus, AdModerationStatus, AdPaymentStatus, BannerPlacement, BannerType } from '@prisma/client';
import { NextResponse } from 'next/server';
import { getAdDestinationFields, getStripe } from '@/lib/ads/server';
import { adDraftSchema } from '@/lib/ads/validation';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { canEditAdDraft, getCampaignDraftEligibilityError } from '@/lib/ads/account';

export async function GET(request: Request) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const adAccountId = new URL(request.url).searchParams.get('adAccountId');
  if (!adAccountId) return NextResponse.json({ error: 'Informe a conta Ads.' }, { status: 400 });

  const membership = await prisma.adAccountUser.findUnique({
    where: { adAccountId_userId: { adAccountId, userId: session.user.id } },
    select: { role: true },
  });
  if (!membership || !canEditAdDraft(membership.role)) {
    return NextResponse.json({ error: 'Sem permissão para acessar rascunhos nesta conta.' }, { status: 403 });
  }

  const draft = await prisma.banner.findFirst({
    where: {
      adAccountId,
      archivedAt: null,
      moderationStatus: AdModerationStatus.DRAFT,
      paymentStatus: AdPaymentStatus.PENDING,
      payments: { none: { status: AdPaymentStatus.PAID } },
    },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      goal: true,
      headline: true,
      description: true,
      imageUrl: true,
      ctaLabel: true,
      targetUrl: true,
      whatsappNumber: true,
      marketplaceItemId: true,
      regionKey: true,
      plan: true,
      durationMonths: true,
    },
  });

  if (!draft?.goal) return NextResponse.json({ draft: null });

  const destination = draft.goal === 'WHATSAPP'
    ? draft.whatsappNumber || ''
    : draft.goal === 'MARKETPLACE'
      ? draft.marketplaceItemId || ''
      : draft.targetUrl || '';

  return NextResponse.json({
    draft: {
      draftId: draft.id,
      step: 3,
      goal: draft.goal,
      headline: draft.headline || '',
      description: draft.description || '',
      imageUrl: draft.imageUrl,
      ctaLabel: draft.ctaLabel || 'Saiba mais',
      destination,
      regionKey: draft.regionKey || '',
      plan: draft.plan || undefined,
      durationMonths: draft.durationMonths || undefined,
    },
  });
}

async function saveDraft(request: Request, requireExisting: boolean) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = adDraftSchema.safeParse(await request.json().catch(() => null));
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
  if (!membership || !canEditAdDraft(membership.role)) {
    return NextResponse.json({ error: 'Sem permissao para criar anuncios nesta conta.' }, { status: 403 });
  }
  const eligibilityError = getCampaignDraftEligibilityError(membership.adAccount);
  if (eligibilityError) return NextResponse.json(eligibilityError, { status: 409 });

  if (parsed.data.regionKey) {
    const region = await prisma.region.findFirst({ where: { key: parsed.data.regionKey, isActive: true }, select: { key: true } });
    if (!region) return NextResponse.json({ error: 'Regiao invalida.' }, { status: 400 });
  }

  const destinationFields = getAdDestinationFields(parsed.data.goal, parsed.data.destination);
  const data = {
    name: parsed.data.headline,
    headline: parsed.data.headline,
    description: parsed.data.description,
    imageUrl: parsed.data.imageUrl,
    ctaLabel: parsed.data.ctaLabel,
    goal: parsed.data.goal,
    ...destinationFields,
    regionKey: parsed.data.regionKey ?? null,
    plan: parsed.data.plan ?? null,
    durationMonths: parsed.data.durationMonths ?? null,
    type: BannerType.LINK,
    placement: BannerPlacement.FEED,
    campaignStatus: AdCampaignStatus.DRAFT,
    moderationStatus: AdModerationStatus.DRAFT,
    paymentStatus: AdPaymentStatus.PENDING,
    isActive: false,
    rejectionReason: null,
  };

  let banner;
  if (requireExisting && !parsed.data.bannerId) {
    return NextResponse.json({ error: 'Informe o ID do rascunho.' }, { status: 400 });
  }

  if (parsed.data.bannerId) {
    const current = await prisma.banner.findFirst({
      where: {
        id: parsed.data.bannerId,
        adAccountId: parsed.data.adAccountId,
        moderationStatus: AdModerationStatus.DRAFT,
        payments: { none: { status: AdPaymentStatus.PAID } },
      },
      select: { id: true, payments: { where: { status: AdPaymentStatus.PENDING, provider: 'STRIPE' }, select: { id: true, providerPaymentId: true } } },
    });
    if (!current) return NextResponse.json({ error: 'Esta campanha não pode mais ser editada, pois já foi enviada. Crie uma nova campanha.' }, { status: 404 });

    // Pagamento apenas iniciado (cartão não confirmado) não trava a edição: o pedido antigo é descartado e um novo é gerado no checkout.
    for (const payment of current.payments) {
      if (!payment.providerPaymentId) continue;
      try {
        const stripe = getStripe();
        const intent = await stripe.paymentIntents.retrieve(payment.providerPaymentId);
        if (intent.status === 'processing' || intent.status === 'succeeded') {
          return NextResponse.json({ error: 'Seu pagamento está sendo processado. Aguarde a confirmação antes de alterar a campanha.' }, { status: 409 });
        }
        if (intent.status !== 'canceled') await stripe.paymentIntents.cancel(intent.id).catch(() => undefined);
      } catch (error) {
        console.error('Failed to discard pending payment while editing draft:', error);
        return NextResponse.json({ error: 'Não foi possível liberar a campanha para edição agora. Tente novamente em instantes.' }, { status: 503 });
      }
    }
    if (current.payments.length) {
      await prisma.adPayment.updateMany({ where: { id: { in: current.payments.map((payment) => payment.id) } }, data: { status: AdPaymentStatus.FAILED } });
    }
    banner = await prisma.banner.update({ where: { id: current.id }, data, select: { id: true, updatedAt: true } });
  } else {
    banner = await prisma.banner.create({
      data: { ...data, createdById: session.user.id, adAccountId: parsed.data.adAccountId },
      select: { id: true, updatedAt: true },
    });
  }

  return NextResponse.json({ banner });
}

export async function POST(request: Request) {
  return saveDraft(request, false);
}

export async function PUT(request: Request) {
  return saveDraft(request, true);
}
