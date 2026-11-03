import { z } from 'zod';

// Kept free of Prisma imports so the client form can share the same rules.
export const waitlistSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'Informe seu email')
    .max(254)
    .email('Use um email valido'),
  name: z.string().trim().max(80, 'Nome muito longo').optional(),
  country: z.string().trim().max(60, 'Pais muito longo').optional(),
  // Honeypot: real users never fill this hidden field.
  website: z.string().max(0).optional(),
});

export type WaitlistInput = z.infer<typeof waitlistSchema>;
