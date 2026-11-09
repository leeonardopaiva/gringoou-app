import { AdCampaignStatus, AdModerationStatus, AdPaymentStatus, Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { canManageAdBilling, getPromotionEligibilityError } from '@/lib/ads/account';
import { getAdPlanCatalog } from '@/lib/ads/plans';
import { getAdDestinationFields } from '@/lib/ads/server';
import { adCheckoutSchema } from '@/lib/ads/validation';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

const redeemSchema = z.object({ couponCode: z.string().trim().toUpperCase().min(4).max(32) });

/**
 * Resgata um cupom de cortesia: a campanha segue para análise sem cobrança.
 * Depois que a cortesia termina, a pessoa contrata normalmente pelo fluxo de promover.
 */
export async function POST(request: Request) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = adCheckoutSchema.safeParse(body);
  const coupon = redeemSchema.safeParse(body);
  if (!parsed.success || !coupon.success) {
    return NextResponse.json({ error: (!parsed.success ? parsed.error.issues[0]?.message : 'Informe o código do cupom.') ?? 'Dados inválidos.' }, { status: 400 });
  }

  const membership = await prisma.adAccountUser.findUnique({
    where: { adAccountId_userId: { adAccountId: parsed.data.adAccountId, userId: session.user.id } },
    select: { role: true, adAccount: { select: { businessId: true, business: { select: { status: true } } } } },
  });
  if (!membership || !canManageAdBilling(membership.role)) {
    return NextResponse.json({ error: 'Apenas o administrador principal da conta pode contratar anúncios.' }, { status: 403 });
  }
  const eligibilityError = getPromotionEligibilityError(membership.adAccount);
  if (eligibilityError) return NextResponse.json(eligibilityError, { status: 409 });

  const banner = await prisma.banner.findFirst({
    where: { id: parsed.data.bannerId, adAccountId: parsed.data.adAccountId, moderationStatus: AdModerationStatus.DRAFT },
    select: { id: true },
  });
  if (!banner) return NextResponse.json({ error: 'Rascunho não encontrado ou indisponível.' }, { status: 404 });

  const plans = await getAdPlanCatalog();
  const planInfo = plans.find((item) => item.plan === parsed.data.plan);
  if (!planInfo || !planInfo.isActive || planInfo.durationMonths !== parsed.data.durationMonths) {
    return NextResponse.json({ error: 'O pacote selecionado não está disponível.' }, { status: 400 });
  }
  const region = await prisma.region.findFirst({ where: { key: parsed.data.regionKey, isActive: true }, select: { key: true } });
  if (!region) return NextResponse.json({ error: 'Região inválida.' }, { status: 400 });

  const row = await prisma.adCoupon.findUnique({ where: { code: coupon.data.couponCode }, include: { _count: { select: { redemptions: true } } } });
  const invalid = (message: string) => NextResponse.json({ error: message }, { status: 400 });
  if (!row || !row.isActive) return invalid('Cupom inválido ou desativado.');
  if (row.expiresAt && row.expiresAt.getTime() < Date.now()) return invalid('Este cupom expirou.');
  if (row.plan && row.plan !== parsed.data.plan) return invalid('Este cupom não vale para o pacote escolhido.');
  if (row.assignedEmail && row.assignedEmail.toLowerCase() !== (session.user.email ?? '').toLowerCase()) return invalid('Este cupom foi emitido para outra pessoa.');
  if (row._count.redemptions >= row.maxRedemptions) return invalid('Este cupom já atingiu o limite de usos.');
  const already = await prisma.adCouponRedemption.findUnique({ where: { adAccountId: parsed.data.adAccountId }, select: { id: true } });
  if (already) return invalid('Esta conta já usou uma cortesia. Contrate o pacote pelo pagamento normal.');

  const destinationFields = getAdDestinationFields(parsed.data.goal, parsed.data.destination);
  try {
    await prisma.$transaction([
      prisma.adCouponRedemption.create({
        data: { couponId: row.id, adAccountId: parsed.data.adAccountId, bannerId: banner.id, userId: session.user.id },
      }),
      prisma.banner.update({
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
          contractAmountCents: 0,
          campaignStatus: AdCampaignStatus.DRAFT,
          moderationStatus: AdModerationStatus.PENDING_REVIEW,
          paymentStatus: AdPaymentStatus.PAID,
          submittedAt: new Date(),
          isActive: false,
        },
      }),
      prisma.adPayment.create({
        data: { bannerId: banner.id, provider: 'COURTESY', providerPaymentId: `courtesy_${banner.id}`, amountCents: 0, currency: 'USD', status: AdPaymentStatus.PAID, paidAt: new Date() },
      }),
    ]);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return invalid('Esta conta já usou uma cortesia.');
    console.error('Failed to redeem ad coupon:', error);
    return NextResponse.json({ error: 'Não foi possível aplicar o cupom agora. Tente novamente.' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, campaignId: banner.id });
}
