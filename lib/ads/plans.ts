import { AD_PLANS, type AdPlanValue } from '@/lib/ads/contracts';
import { prisma } from '@/lib/prisma';

export type AdPlanInfo = {
  plan: AdPlanValue;
  name: string;
  monthlyPriceCents: number;
  durationMonths: 1 | 3 | 6;
  estimatedImpressions: number;
  description: string;
  highlights: string[];
  isActive: boolean;
};

const toDuration = (value: number): 1 | 3 | 6 => (value === 3 || value === 6 ? value : 1);

/**
 * Pacotes cadastrados no painel raiz. Não existe valor padrão no código: o que não está no banco não é vendido.
 * Erros de leitura propagam (o pagamento falha em vez de cobrar um valor diferente do cadastrado).
 */
export async function getAdPlanCatalog(): Promise<AdPlanInfo[]> {
  const rows = await prisma.adPlanConfig.findMany();
  const order = new Map<string, number>(AD_PLANS.map((plan, index) => [plan, index]));
  return rows
    .sort((a, b) => (order.get(a.plan) ?? 0) - (order.get(b.plan) ?? 0))
    .map((row) => ({
      plan: row.plan as AdPlanValue,
      name: row.name,
      monthlyPriceCents: row.monthlyPriceCents,
      durationMonths: toDuration(row.durationMonths),
      estimatedImpressions: row.estimatedImpressions,
      description: row.description,
      highlights: row.highlights,
      isActive: row.isActive,
    }));
}

export const adPlanTotalCents = (plan: Pick<AdPlanInfo, 'monthlyPriceCents' | 'durationMonths'>) => plan.monthlyPriceCents * plan.durationMonths;
