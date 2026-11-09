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

export async function DELETE(_request: Request, context: RouteContext) {
  const { response } = await requireRootSession();
  if (response) return response;
  const { couponId } = await context.params;
  const used = await prisma.adCouponRedemption.count({ where: { couponId } });
  if (used > 0) return NextResponse.json({ error: 'Este cupom já foi usado. Desative-o em vez de excluir.' }, { status: 409 });
  await prisma.adCoupon.delete({ where: { id: couponId } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
