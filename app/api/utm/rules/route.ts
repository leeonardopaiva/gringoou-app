import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { UTM_KEYS, type UtmRulesMap } from '@/lib/utm';

export const runtime = 'nodejs';

/** Overrides de UTM definidos no admin (sem dados sensíveis). Sem linha para uma chave = vale o padrão do código. */
export async function GET() {
  const rows = await prisma.utmRule.findMany({ where: { key: { in: UTM_KEYS } } });
  const rules: UtmRulesMap = {};
  for (const row of rows) {
    rules[row.key] = { enabled: row.enabled, source: row.source, medium: row.medium, campaign: row.campaign, content: row.content, term: row.term };
  }
  return NextResponse.json({ rules }, { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } });
}
