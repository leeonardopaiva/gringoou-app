export const AD_GOALS = ['WHATSAPP', 'EXTERNAL_URL', 'MARKETPLACE'] as const;
/** Posições (slots) de pacote disponíveis. Nome, valor e vigência de cada uma vêm SEMPRE do banco (admin raiz › Planos). */
export const AD_PLANS = ['BRONZE', 'SILVER', 'GOLD'] as const;
export const AD_DURATIONS = [1, 3, 6] as const;

export type AdGoalValue = (typeof AD_GOALS)[number];
export type AdPlanValue = (typeof AD_PLANS)[number];
export type AdDuration = (typeof AD_DURATIONS)[number];

export const formatAdCurrency = (amountCents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'USD' }).format(amountCents / 100);
