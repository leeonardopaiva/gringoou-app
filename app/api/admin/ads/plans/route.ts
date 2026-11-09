import { NextResponse } from 'next/server';
import { z } from 'zod';
import { AD_PLANS } from '@/lib/ads/contracts';
import { getAdPlanCatalog } from '@/lib/ads/plans';
import { prisma } from '@/lib/prisma';
import { requireRootSession } from '@/lib/root-admin';

export const runtime = 'nodejs';

const planSchema = z.object({
  plan: z.enum(AD_PLANS),
  name: z.string().trim().min(2, 'Informe o nome do pacote.').max(40, 'O nome pode ter até 40 caracteres.'),
  monthlyPriceCents: z.coerce.number().int('Informe o valor mensal.').min(100, 'O valor mensal mínimo é US$ 1,00.').max(10_000_000, 'Valor mensal muito alto.'),
  durationMonths: z.coerce.number().refine((value) => [1, 3, 6].includes(value), 'A vigência deve ser de 1, 3 ou 6 meses.'),
  estimatedImpressions: z.coerce.number().int('Informe as impressões estimadas.').min(100, 'As impressões estimadas devem ser de no mínimo 100.').max(100_000_000, 'Impressões estimadas muito altas.'),
  description: z.string().trim().min(4, 'Informe a descrição (mínimo 4 letras).').max(200, 'A descrição pode ter até 200 caracteres.'),
  highlights: z.array(z.string().trim().min(1).max(80, 'Cada destaque pode ter até 80 caracteres.')).max(6, 'Use até 6 destaques.'),
  isActive: z.boolean(),
});

const bulkSchema = z.object({ plans: z.array(z.unknown()).min(1).max(AD_PLANS.length) });

export async function GET() {
  const { response } = await requireRootSession();
  if (response) return response;
  return NextResponse.json({ plans: await getAdPlanCatalog(), slots: AD_PLANS });
}

/** Salva um pacote (corpo = pacote) ou vários de uma vez (corpo = { plans: [...] }). */
export async function PUT(request: Request) {
  const { session, response } = await requireRootSession();
  if (response) return response;
  const body = await request.json().catch(() => null);
  const bulk = bulkSchema.safeParse(body);
  const rawPlans: unknown[] = bulk.success ? bulk.data.plans : [body];

  const valid: z.infer<typeof planSchema>[] = [];
  for (const raw of rawPlans) {
    const parsed = planSchema.safeParse(raw);
    if (!parsed.success) {
      const key = (raw as { plan?: string } | null)?.plan;
      const slot = AD_PLANS.findIndex((item) => item === key);
      const prefix = slot >= 0 ? `Pacote ${slot + 1}: ` : '';
      return NextResponse.json({ error: `${prefix}${parsed.error.issues[0]?.message ?? 'Dados inválidos.'}` }, { status: 400 });
    }
    valid.push(parsed.data);
  }
  if (new Set(valid.map((item) => item.plan)).size !== valid.length) {
    return NextResponse.json({ error: 'Há pacotes repetidos no envio.' }, { status: 400 });
  }

  // Tudo ou nada: se algum falhar, nenhum pacote é gravado pela metade.
  await prisma.$transaction(valid.map(({ plan, ...data }) => prisma.adPlanConfig.upsert({
    where: { plan },
    update: { ...data, updatedById: session.user.id },
    create: { plan, ...data, updatedById: session.user.id },
  })));
  return NextResponse.json({ plans: await getAdPlanCatalog() });
}
