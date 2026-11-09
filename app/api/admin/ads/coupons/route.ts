import { NextResponse } from 'next/server';
import { z } from 'zod';
import { AD_PLANS } from '@/lib/ads/contracts';
import { prisma } from '@/lib/prisma';
import { requireRootSession } from '@/lib/root-admin';

export const runtime = 'nodejs';

const createSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{4,32}$/, 'Use de 4 a 32 letras, números, hífen ou sublinhado.'),
  plan: z.enum(AD_PLANS).nullable().optional(),
  assignedEmail: z.string().trim().toLowerCase().email('E-mail inválido.').nullable().optional().or(z.literal('').transform(() => null)),
  maxRedemptions: z.coerce.number().int().min(1).max(1000).default(1),
  expiresAt: z.string().datetime().nullable().optional().or(z.literal('').transform(() => null)),
  note: z.string().trim().max(200).nullable().optional(),
});

export async function GET() {
  const { response } = await requireRootSession();
  if (response) return response;
  const coupons = await prisma.adCoupon.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: { _count: { select: { redemptions: true } } },
  });
  return NextResponse.json({
    coupons: coupons.map(({ _count, ...coupon }) => ({ ...coupon, redeemedCount: _count.redemptions })),
  });
}

export async function POST(request: Request) {
  const { session, response } = await requireRootSession();
  if (response) return response;
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }, { status: 400 });
  const exists = await prisma.adCoupon.findUnique({ where: { code: parsed.data.code }, select: { id: true } });
  if (exists) return NextResponse.json({ error: 'Já existe um cupom com este código.' }, { status: 409 });
  const coupon = await prisma.adCoupon.create({
    data: {
      code: parsed.data.code,
      plan: parsed.data.plan ?? null,
      assignedEmail: parsed.data.assignedEmail ?? null,
      maxRedemptions: parsed.data.maxRedemptions,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
      note: parsed.data.note || null,
      createdById: session.user.id,
    },
  });
  return NextResponse.json({ coupon }, { status: 201 });
}
