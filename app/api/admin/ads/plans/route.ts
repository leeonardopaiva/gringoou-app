import { NextResponse } from 'next/server';
import { z } from 'zod';
import { AD_PLANS } from '@/lib/ads/contracts';
import { getAdPlanCatalog } from '@/lib/ads/plans';
import { prisma } from '@/lib/prisma';
import { requireRootSession } from '@/lib/root-admin';

export const runtime = 'nodejs';

const planSchema = z.object({
  plan: z.enum(AD_PLANS),
  name: z.string().trim().min(2).max(40),
  monthlyPriceCents: z.coerce.number().int().min(100, 'O valor mensal mínimo é US$ 1,00.').max(10_000_000),
  durationMonths: z.coerce.number().refine((value) => [1, 3, 6].includes(value), 'A vigência deve ser de 1, 3 ou 6 meses.'),
  estimatedImpressions: z.coerce.number().int().min(100).max(100_000_000),
  description: z.string().trim().min(4).max(200),
  highlights: z.array(z.string().trim().min(1).max(80)).max(6),
  isActive: z.boolean(),
});

export async function GET() {
  const { response } = await requireRootSession();
  if (response) return response;
  return NextResponse.json({ plans: await getAdPlanCatalog(), slots: AD_PLANS });
}

export async function PUT(request: Request) {
  const { session, response } = await requireRootSession();
  if (response) return response;
  const parsed = planSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }, { status: 400 });
  const { plan, ...data } = parsed.data;
  await prisma.adPlanConfig.upsert({
    where: { plan },
    update: { ...data, updatedById: session.user.id },
    create: { plan, ...data, updatedById: session.user.id },
  });
  return NextResponse.json({ plans: await getAdPlanCatalog() });
}
