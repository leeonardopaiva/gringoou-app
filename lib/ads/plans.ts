import type { AdPlan } from '@prisma/client';
import { AD_PLANS, AD_PLAN_CATALOG, type AdPlanValue } from '@/lib/ads/contracts';
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

const defaults = (plan: AdPlanValue): AdPlanInfo => ({ plan, ...AD_PLAN_CATALOG[plan], isActive: true });

/** Catálogo efetivo: o que foi salvo no painel raiz sobrepõe os valores padrão do código. */
export async function getAdPlanCatalog(): Promise<AdPlanInfo[]> {
  const rows = await prisma.adPlanConfig.findMany().catch(() => [] as Awaited<ReturnType<typeof prisma.adPlanConfig.findMany>>);
  const byPlan = new Map(rows.map((row) => [row.plan as AdPlan, row]));
  return AD_PLANS.map((plan) => {
    const row = byPlan.get(plan);
    if (!row) return defaults(plan);
    return {
      plan,
      name: row.name,
      monthlyPriceCents: row.monthlyPriceCents,
      durationMonths: (row.durationMonths === 3 || row.durationMonths === 6 ? row.durationMonths : 1) as 1 | 3 | 6,
      estimatedImpressions: row.estimatedImpressions,
      description: row.description,
      highlights: row.highlights,
      isActive: row.isActive,
    };
  });
}

export const adPlanTotalCents = (plan: Pick<AdPlanInfo, 'monthlyPriceCents' | 'durationMonths'>) => plan.monthlyPriceCents * plan.durationMonths;
