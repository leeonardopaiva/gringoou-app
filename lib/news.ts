import { z } from 'zod';

/** Categorias editoriais de Notícias (compartilhadas por feed público e área do Moderador). */
export const NEWS_CATEGORIES = [
  { id: 'immigration', label: 'Imigração' },
  { id: 'community', label: 'Comunidade' },
  { id: 'headlines', label: 'Atualidades' },
  { id: 'economy', label: 'Economia' },
  { id: 'culture', label: 'Cultura' },
] as const;

export type NewsCategoryId = (typeof NEWS_CATEGORIES)[number]['id'];

const CATEGORY_IDS = NEWS_CATEGORIES.map((c) => c.id) as [NewsCategoryId, ...NewsCategoryId[]];

export const getNewsCategoryLabel = (id: string) =>
  NEWS_CATEGORIES.find((c) => c.id === id)?.label ?? id;

const httpUrl = z
  .string()
  .trim()
  .max(2048)
  .refine((value) => {
    try {
      const url = new URL(value);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }, 'Informe um link válido (http ou https).');

const emptyToNull = (value: unknown) => (typeof value === 'string' && value.trim() === '' ? null : value);

export const newsArticleInputSchema = z.object({
  title: z.string().trim().min(3, 'Informe o título.').max(200),
  subtitle: z.preprocess(emptyToNull, z.string().trim().max(400).nullable().optional()),
  imageUrl: z.preprocess(emptyToNull, httpUrl.nullable().optional()),
  category: z.enum(CATEGORY_IDS),
  regionKey: z.preprocess(emptyToNull, z.string().trim().max(80).nullable().optional()),
  source: z.string().trim().min(2, 'Informe a fonte.').max(120),
  externalUrl: httpUrl,
  status: z.enum(['DRAFT', 'PUBLISHED']).default('DRAFT'),
  publishedAt: z.preprocess(emptyToNull, z.string().datetime({ offset: true }).nullable().optional()),
});

export type NewsArticleInput = z.infer<typeof newsArticleInputSchema>;
