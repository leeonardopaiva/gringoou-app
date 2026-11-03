import 'server-only';

import type { NewsProvider } from '@/domain/news/repositories/news.repository';
import type {
  NewsCategory,
  NewsFeed,
  NewsItem,
  NewsLanguage,
  NewsListFilters,
} from '@/domain/news/entities/news.entity';
import { isValidHttpUrl } from '@/lib/url';

/**
 * Provedor de Notícias baseado na GNews API (gnews.io).
 *
 * Serviço com camada gratuita que retorna dados estruturados: título,
 * descrição, imagem, link e fonte. Requer GNEWS_API_KEY.
 * Verifique os limites e termos de uso da camada gratuita antes do uso comercial.
 */

const GNEWS_BASE = 'https://gnews.io/api/v4';

const DEFAULT_TIMEOUT_MS = 6000;
const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000;
const DEFAULT_LIMIT = 30;

type CacheEntry = { feed: NewsFeed; expiresAt: number };
const cache = new Map<string, CacheEntry>();

const isEnabled = () => Boolean(process.env.GNEWS_API_KEY?.trim());

const getCountry = (countryCode?: string | null) => {
  if (countryCode === 'US' || countryCode === 'CA') return 'us';
  if (countryCode === 'PT') return 'pt';
  return 'br';
};

const buildQuery = (filters: NewsListFilters): string => {
  const { city, state, category, query } = filters;
  if (query) return query;
  if (category === 'immigration') return 'imigração brasileiros exterior';
  if (category === 'community') return 'comunidade brasileira exterior';
  if (category === 'headlines') return 'brasileiros no exterior';
  return [city, state].filter(Boolean).join(' ') || 'brasileiros no exterior';
};

const mapCategory = (filters: NewsListFilters): NewsCategory => {
  if (filters.category === 'immigration') return 'immigration';
  if (filters.category === 'community') return 'community';
  if (filters.category === 'headlines') return 'headlines';
  if (filters.category === 'for-you') return 'for-you';
  return 'region';
};

const detectLanguage = (title: string, description: string): NewsLanguage => {
  const text = `${title} ${description}`.toLowerCase();
  const ptMarkers = ['ã', 'õ', 'ç', 'á', 'é', 'í', 'ó', 'ú', 'ê', 'ô', 'à', 'não', 'para', 'com', 'brasil', 'brasileiros'];
  const enMarkers = ['the', 'and', 'for', 'with', 'from', 'this', 'that', 'are', 'was'];
  let ptScore = 0;
  let enScore = 0;
  for (const marker of ptMarkers) if (text.includes(marker)) ptScore += 1;
  for (const marker of enMarkers) if (text.includes(marker)) enScore += 1;
  return ptScore >= enScore ? 'pt' : 'en';
};

const fetchWithTimeout = async (url: string, timeoutMs: number): Promise<unknown> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal, cache: 'no-store' });
    if (!response.ok) throw new Error(`GNews responded with ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
};

export function makeGNewsProvider(): NewsProvider {
  return {
    name: 'gnews',

    async fetch(filters: NewsListFilters): Promise<NewsFeed> {
      const regionKey = filters.regionKey ?? null;
      const regionLabel = filters.regionLabel ?? null;
      const limit = filters.limit ?? DEFAULT_LIMIT;

      if (!isEnabled()) {
        return { items: [], regionKey, regionLabel, provider: this.name, fetchedAt: new Date().toISOString() };
      }

      const params = new URLSearchParams({
        q: buildQuery(filters),
        token: process.env.GNEWS_API_KEY!,
        lang: 'pt',
        country: getCountry(filters.countryCode),
        max: String(Math.min(30, limit)),
      });
      const url = `${GNEWS_BASE}/search?${params.toString()}`;

      const cached = cache.get(url);
      if (cached && cached.expiresAt > Date.now()) {
        return { ...cached.feed, items: cached.feed.items.slice(0, limit) };
      }

      try {
        const payload = (await fetchWithTimeout(url, DEFAULT_TIMEOUT_MS)) as {
          articles?: Array<{
            title?: string;
            description?: string;
            url?: string;
            image?: string;
            publishedAt?: string;
            source?: { name?: string };
          }>;
        };

        const category = mapCategory(filters);
        const seen = new Set<string>();
        const items: NewsItem[] = [];

        for (const article of payload.articles ?? []) {
          const link = article.url?.trim() ?? '';
          if (!isValidHttpUrl(link)) continue;

          const normalizedUrl = link.replace(/^https?:\/\//i, '').replace(/\/$/, '');
          if (seen.has(normalizedUrl)) continue;
          seen.add(normalizedUrl);

          const title = article.title?.trim() ?? '';
          if (!title) continue;

          const description = article.description?.trim() || null;
          const imageUrl = article.image && isValidHttpUrl(article.image) ? article.image : null;

          items.push({
            id: `gnews-${Buffer.from(normalizedUrl).toString('base64url').slice(0, 24)}`,
            title,
            source: article.source?.name?.trim() || 'GNews',
            publishedAt: article.publishedAt ? new Date(article.publishedAt).toISOString() : new Date().toISOString(),
            url: link,
            imageUrl,
            description,
            category,
            language: detectLanguage(title, description ?? ''),
            regionKey,
          });
        }

        const feed: NewsFeed = {
          items: items.slice(0, limit),
          regionKey,
          regionLabel,
          provider: this.name,
          fetchedAt: new Date().toISOString(),
        };

        cache.set(url, { feed, expiresAt: Date.now() + DEFAULT_CACHE_TTL_MS });
        return feed;
      } catch (error) {
        console.warn('[news] GNews unavailable:', error);
        return { items: [], regionKey, regionLabel, provider: this.name, fetchedAt: new Date().toISOString() };
      }
    },
  };
}