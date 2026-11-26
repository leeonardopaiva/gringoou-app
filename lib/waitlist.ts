import { z } from 'zod';
import '@/lib/zod-messages';

// Kept free of Prisma imports so the client form can share the same rules.
// Name, email and country are all required: without them the list cannot be used to invite
// people or to decide which region to open next.
export const waitlistSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'Informe seu e-mail.')
    .max(254)
    .email('Use um e-mail válido.'),
  name: z
    .string({ message: 'Informe seu nome.' })
    .trim()
    .min(2, 'Informe seu nome.')
    .max(80, 'Nome muito longo.'),
  country: z
    .string({ message: 'Selecione o seu país.' })
    .trim()
    .min(2, 'Selecione o seu país.')
    .max(60, 'País muito longo.'),
  // Honeypot: real users never fill this hidden field.
  website: z.string().max(0).optional(),
});

export type WaitlistInput = z.infer<typeof waitlistSchema>;
