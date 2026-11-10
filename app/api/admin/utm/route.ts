import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUtmManager } from '@/lib/utm-access';
import { UTM_KEYS, UTM_LINK_KINDS } from '@/lib/utm';

export const runtime = 'nodejs';

// Valores livres com variáveis {id}/{campanha}/{posicao}/{regiao}; o resultado final é normalizado em lib/utm.ts.
const valueSchema = z.string().trim().min(1, 'Obrigatório.').max(100, 'Máximo de 100 caracteres.');
const optionalValue = z.string().trim().max(100, 'Máximo de 100 caracteres.').optional().nullable();

const ruleSchema = z.object({
  key: z.string().refine((key) => UTM_KEYS.includes(key), 'Ponto de origem inválido.'),
  enabled: z.boolean(),
  source: valueSchema,
  medium: valueSchema,
  campaign: valueSchema,
  content: optionalValue,
  term: optionalValue,
});

export async function GET() {
  const { isAdmin, response } = await requireUtmManager();
  if (response) return response;
  const rows = await prisma.utmRule.findMany({ where: { key: { in: UTM_KEYS } } });
  const overrides = new Map(rows.map((row) => [row.key, row]));
  return NextResponse.json({
    isAdmin,
    kinds: UTM_LINK_KINDS.map((kind) => {
      const row = overrides.get(kind.key);
      return {
        key: kind.key,
        label: kind.label,
        group: kind.group,
        description: kind.description,
        variables: kind.variables,
        defaults: kind.defaults,
        customized: Boolean(row),
        rule: row
          ? { enabled: row.enabled, source: row.source, medium: row.medium, campaign: row.campaign, content: row.content, term: row.term, updatedAt: row.updatedAt }
          : { enabled: true, ...kind.defaults },
      };
    }),
  });
}

export async function PUT(request: Request) {
  const { userId, response } = await requireUtmManager();
  if (response || !userId) return response;
  const parsed = ruleSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }, { status: 400 });
  }
  const { key, enabled, source, medium, campaign } = parsed.data;
  const content = parsed.data.content?.trim() || null;
  const term = parsed.data.term?.trim() || null;
  await prisma.utmRule.upsert({
    where: { key },
    create: { key, enabled, source, medium, campaign, content, term, updatedById: userId },
    update: { enabled, source, medium, campaign, content, term, updatedById: userId },
  });
  return NextResponse.json({ ok: true });
}

/** Restaura o padrão do código (remove o override). */
export async function DELETE(request: Request) {
  const { response } = await requireUtmManager();
  if (response) return response;
  const key = new URL(request.url).searchParams.get('key') ?? '';
  if (!UTM_KEYS.includes(key)) return NextResponse.json({ error: 'Ponto de origem inválido.' }, { status: 400 });
  await prisma.utmRule.deleteMany({ where: { key } });
  return NextResponse.json({ ok: true });
}
