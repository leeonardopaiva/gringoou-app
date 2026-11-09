import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireRootSession } from '@/lib/root-admin';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ couponId: string }> };

const patchSchema = z.object({ isActive: z.boolean() });

export async function PATCH(request: Request, context: RouteContext) {
  const { response } = await requireRootSession();
  if (response) return response;
  const { couponId } = await context.params;
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 });
  const coupon = await prisma.adCoupon.update({ where: { id: couponId }, data: { isActive: parsed.data.isActive } }).catch(() => null);
  if (!coupon) return NextResponse.json({ error: 'Cupom não encontrado.' }, { status: 404 });
  return NextResponse.json({ coupon });
}

export async function DELETE(request: Request, context: RouteContext) {
  const { response } = await requireRootSession();
  if (response) return response;
  const { couponId } = await context.params;
  const force = new URL(request.url).searchParams.get('force') === '1';
  const redemptions = await prisma.adCouponRedemption.findMany({ where: { couponId }, select: { id: true, bannerId: true } });
  // Reservas de campanhas que nunca foram pagas não contam como uso.
  const paidBanners = redemptions.length
    ? await prisma.adPayment.findMany({ where: { bannerId: { in: redemptions.map((item) => item.bannerId).filter((id): id is string => Boolean(id)) }, status: 'PAID' }, select: { bannerId: true } })
    : [];
  const realUses = new Set(paidBanners.map((item) => item.bannerId)).size;
  if (realUses > 0 && !force) {
    return NextResponse.json({ error: 'Este cupom já foi usado em campanhas. Confirme para excluir mesmo assim.', code: 'USED', uses: realUses }, { status: 409 });
  }
  await prisma.adCoupon.delete({ where: { id: couponId } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
