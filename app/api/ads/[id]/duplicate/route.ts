import { AdCampaignStatus, AdModerationStatus, AdPaymentStatus, BannerPlacement, BannerType } from '@prisma/client';
import { NextResponse } from 'next/server';
import { canEditAdDraft, getCampaignDraftEligibilityError } from '@/lib/ads/account';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> };

/** Duplica uma campanha como novo rascunho (criativo, destino, região e pacote). Sem pagamento nem métricas. */
export async function POST(_request: Request, context: RouteContext) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: 'Entre na sua conta para continuar.' }, { status: 401 });
  const { id } = await context.params;

  const source = await prisma.banner.findFirst({
    where: { id, adAccountId: { not: null }, adAccount: { users: { some: { userId: session.user.id } } } },
    select: {
      name: true, headline: true, description: true, imageUrl: true, ctaLabel: true, goal: true,
      targetUrl: true, whatsappNumber: true, marketplaceItemId: true, regionKey: true, plan: true, durationMonths: true,
      adAccountId: true,
      adAccount: {
        select: {
          businessId: true,
          business: { select: { status: true } },
          users: { where: { userId: session.user.id }, select: { role: true }, take: 1 },
        },
      },
    },
  });
  const role = source?.adAccount?.users[0]?.role;
  if (!source || !source.adAccountId || !role) return NextResponse.json({ error: 'Campanha não encontrada.' }, { status: 404 });
  if (!canEditAdDraft(role)) return NextResponse.json({ error: 'Sem permissão para criar campanhas nesta conta.' }, { status: 403 });
  const eligibilityError = getCampaignDraftEligibilityError({ businessId: source.adAccount!.businessId, business: source.adAccount!.business });
  if (eligibilityError) return NextResponse.json(eligibilityError, { status: 409 });

  const headline = source.headline || source.name;
  const copy = await prisma.banner.create({
    data: {
      name: headline,
      headline: source.headline,
      description: source.description,
      imageUrl: source.imageUrl,
      ctaLabel: source.ctaLabel,
      goal: source.goal,
      targetUrl: source.targetUrl,
      whatsappNumber: source.whatsappNumber,
      marketplaceItemId: source.marketplaceItemId,
      regionKey: source.regionKey,
      plan: source.plan,
      durationMonths: source.durationMonths,
      type: BannerType.LINK,
      placement: BannerPlacement.FEED,
      campaignStatus: AdCampaignStatus.DRAFT,
      moderationStatus: AdModerationStatus.DRAFT,
      paymentStatus: AdPaymentStatus.PENDING,
      isActive: false,
      createdById: session.user.id,
      adAccountId: source.adAccountId,
    },
    select: { id: true },
  });

  return NextResponse.json({ id: copy.id });
}
