import '@/lib/zod-messages';
import { z } from 'zod';
import { AD_DURATIONS, AD_GOALS, AD_PLANS } from './contracts';

const destinationSchema = z.string().trim().min(1, 'Informe o destino do anuncio.').max(500);

export const adGoalStepSchema = z.object({
  goal: z.enum(AD_GOALS, { message: 'Selecione um objetivo.' }),
});

export const adCreativeStepSchema = z
  .object({
    goal: z.enum(AD_GOALS),
    headline: z.string().trim().min(2, 'Informe um titulo.').max(70, 'Use no maximo 70 caracteres.'),
    description: z.string().trim().min(10, 'Descreva melhor o anuncio.').max(600, 'Use no maximo 600 caracteres.'),
    imageUrl: z.string().url('Envie uma imagem valida.'),
    ctaLabel: z.string().trim().min(2, 'Selecione uma chamada para acao.').max(40),
    destination: destinationSchema,
  })
  .superRefine((data, context) => {
    if (data.goal === 'EXTERNAL_URL') {
      const parsedUrl = z.string().url().safeParse(data.destination);
      if (!parsedUrl.success) {
        context.addIssue({ code: 'custom', path: ['destination'], message: 'Informe uma URL valida.' });
      }
    }

    if (data.goal === 'WHATSAPP') {
      const digits = data.destination.replace(/\D/g, '');
      if (digits.length < 8 || digits.length > 15) {
        context.addIssue({ code: 'custom', path: ['destination'], message: 'Informe um WhatsApp com DDI e DDD.' });
      }
    }
  });

export const adReachStepSchema = z.object({
  regionKey: z.string().trim().min(1, 'Selecione uma regiao.'),
  plan: z.enum(AD_PLANS, { message: 'Selecione um plano.' }),
  durationMonths: z.coerce.number().refine(
    (value): value is (typeof AD_DURATIONS)[number] => AD_DURATIONS.includes(value as never),
    'Selecione uma vigencia de 1, 3 ou 6 meses.',
  ),
});

export const adDraftSchema = adCreativeStepSchema.and(
  z.object({
    bannerId: z.string().cuid().optional(),
    adAccountId: z.string().cuid(),
    regionKey: z.preprocess(
      (value) => (typeof value === 'string' && !value.trim() ? undefined : value),
      z.string().trim().min(1).optional(),
    ),
    plan: z.enum(AD_PLANS).optional(),
    durationMonths: z.coerce.number().refine(
      (value) => AD_DURATIONS.includes(value as never),
      'Vigencia invalida.',
    ).optional(),
  }),
);

export const adCheckoutSchema = adCreativeStepSchema.and(adReachStepSchema).and(
  z.object({
    bannerId: z.string().cuid(),
    adAccountId: z.string().cuid(),
    idempotencyKey: z.string().trim().min(16).max(255),
    couponCode: z.string().trim().toUpperCase().max(32).optional(),
  }),
);

export type AdWizardData = {
  draftId?: string;
  step: 1 | 2 | 3 | 4;
  goal?: (typeof AD_GOALS)[number];
  headline: string;
  description: string;
  imageUrl: string;
  ctaLabel: string;
  destination: string;
  regionKey: string;
  plan?: (typeof AD_PLANS)[number];
  durationMonths?: (typeof AD_DURATIONS)[number];
};
