import { NextResponse } from 'next/server';
import { z } from 'zod';
import { AD_PLANS } from '@/lib/ads/contracts';
import { evaluateAdCoupon } from '@/lib/ads/coupons';
import { getAdPlanCatalog } from '@/lib/ads/plans';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

const schema = z.object({ couponCode: z.string().trim().toUpperCase().min(4).max(32), plan: z.enum(AD_PLANS), adAccountId: z.string().cuid() });

/** Confere o cupom e informa o desconto (cortesia total ou crédito parcial) antes do pagamento. */
export async function POST(request: Request) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Informe o código do cupom.' }, { status: 400 });
  const membership = await prisma.adAccountUser.findUnique({
    where: { adAccountId_userId: { adAccountId: parsed.data.adAccountId, userId: session.user.id } },
    select: { id: true },
  });
  if (!membership) return NextResponse.json({ error: 'Acesso negado a esta conta.' }, { status: 403 });
  const planInfo = (await getAdPlanCatalog()).find((item) => item.plan === parsed.data.plan);
  if (!planInfo) return NextResponse.json({ error: 'Pacote indisponível.' }, { status: 400 });
  const totalCents = planInfo.monthlyPriceCents * planInfo.durationMonths;
  const evaluation = await evaluateAdCoupon({ code: parsed.data.couponCode, plan: parsed.data.plan, adAccountId: parsed.data.adAccountId, userEmail: session.user.email, totalCents });
  if (!evaluation.ok) return NextResponse.json({ error: evaluation.error }, { status: 400 });
  return NextResponse.json({ totalCents, discountCents: evaluation.discountCents, payCents: evaluation.payCents, full: evaluation.full });
}
