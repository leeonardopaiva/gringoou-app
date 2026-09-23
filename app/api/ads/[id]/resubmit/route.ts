import { AdCampaignStatus, AdModerationStatus, AdPaymentStatus } from '@prisma/client';
import { NextResponse } from 'next/server';
import { canEditAdDraft, getPromotionEligibilityError } from '@/lib/ads/account';
import { getAdDestinationFields } from '@/lib/ads/server';
import { adCreativeStepSchema } from '@/lib/ads/validation';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 });

  const parsed = adCreativeStepSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Criativo invalido.' }, { status: 400 });
  }

  const { id } = await context.params;
  const campaign = await prisma.banner.findFirst({
    where: {
      id,
      paymentStatus: AdPaymentStatus.PAID,
      moderationStatus: AdModerationStatus.REJECTED,
      adAccount: { users: { some: { userId: session.user.id } } },
    },
    select: {
      id: true,
      adAccount: {
        select: {
          businessId: true,
          business: { select: { status: true } },
          users: { where: { userId: session.user.id }, select: { role: true }, take: 1 },
        },
      },
    },
  });
  const role = campaign?.adAccount?.users[0]?.role;
  if (!campaign || !role || !canEditAdDraft(role)) {
    return NextResponse.json({ error: 'Campanha rejeitada nao encontrada ou sem permissao.' }, { status: 403 });
  }
  if (!campaign.adAccount) {
    return NextResponse.json({ error: 'Conta Ads não encontrada.' }, { status: 409 });
  }
  const eligibilityError = getPromotionEligibilityError(campaign.adAccount);
  if (eligibilityError) return NextResponse.json(eligibilityError, { status: 409 });

  const result = await prisma.banner.updateMany({
    where: { id, paymentStatus: AdPaymentStatus.PAID, moderationStatus: AdModerationStatus.REJECTED },
    data: {
      name: parsed.data.headline,
      headline: parsed.data.headline,
      description: parsed.data.description,
      imageUrl: parsed.data.imageUrl,
      ctaLabel: parsed.data.ctaLabel,
      goal: parsed.data.goal,
      ...getAdDestinationFields(parsed.data.goal, parsed.data.destination),
      moderationStatus: AdModerationStatus.PENDING_REVIEW,
      campaignStatus: AdCampaignStatus.PAUSED,
      submittedAt: new Date(),
      rejectionReason: null,
      approvedById: null,
      approvedAt: null,
      isActive: false,
    },
  });
  if (result.count === 0) {
    return NextResponse.json({ error: 'A campanha mudou de status. Atualize a pagina.' }, { status: 409 });
  }

  return NextResponse.json({ ok: true, bannerId: id });
}
