import { AdCampaignStatus, AdModerationStatus, AdPaymentStatus, BannerPlacement, BannerType } from '@prisma/client';
import { NextResponse } from 'next/server';
import { getAdDestinationFields } from '@/lib/ads/server';
import { adDraftSchema } from '@/lib/ads/validation';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { canEditAdDraft, getPromotionEligibilityError } from '@/lib/ads/account';

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
  const eligibilityError = getPromotionEligibilityError(membership.adAccount);
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
        payments: { none: {} },
      },
      select: { id: true },
    });
    if (!current) return NextResponse.json({ error: 'Rascunho nao encontrado ou bloqueado apos iniciar o pagamento.' }, { status: 404 });
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
