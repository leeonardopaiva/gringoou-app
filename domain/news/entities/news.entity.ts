/**
 * Entidade de domínio Notícia.
 *
 * PURA — sem dependências de React, Next, NextAuth ou Prisma.
 * Representa dados normalizados, independentes do provedor de origem.
 */

export type NewsCategory =
  | 'for-you'
  | 'region'
  | 'immigration'
  | 'community'
  | 'headlines';

export type NewsLanguage = 'pt' | 'en';

/** Item de notícia normalizado (independente do provedor). */
export interface NewsItem {
  id: string;
  title: string;
  source: string;
  publishedAt: string;
  url: string;
  imageUrl: string | null;
  description: string | null;
  category: NewsCategory;
  language: NewsLanguage;
  regionKey: string | null;
}

/** Resultado de uma consulta de notícias. */
export interface NewsFeed {
  items: NewsItem[];
  regionKey: string | null;
  regionLabel: string | null;
  provider: string;
  fetchedAt: string;
}

/** Filtros para consulta de notícias. */
export interface NewsListFilters {
  regionKey?: string | null;
  regionLabel?: string | null;
  city?: string | null;
  state?: string | null;
  countryCode?: string | null;
  category?: NewsCategory | null;
  query?: string | null;
  limit?: number;
}