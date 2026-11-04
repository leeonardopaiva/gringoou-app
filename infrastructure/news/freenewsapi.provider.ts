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
 * Provedor de Notícias baseado na FreeNewsApi (freenewsapi.io).
 *
 * 5.000 requisições gratuitas/dia, 2 req/s de rate limit.
 * Retorna dados estruturados com título, descrição, imagem, link e fonte.
 * Requer FREE_NEWS_API_KEY nas env vars.
 */

const BASE = 'https://api.freenewsapi.io/v1';

const DEFAULT_TIMEOUT_MS = 6000;
const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000;
const DEFAULT_LIMIT = 30;

type CacheEntry = { feed: NewsFeed; expiresAt: number };
const cache = new Map<string, CacheEntry>();

const isEnabled = () => Boolean(process.env.FREE_NEWS_API_KEY?.trim());

const getCountry = (countryCode?: string | null) => {
  if (countryCode === 'BR') return 'br';
  if (countryCode === 'PT') return 'pt';
  if (countryCode === 'CA') return 'ca';
  return 'us';
};

const getLanguage = (countryCode?: string | null): string => {
  if (countryCode === 'PT' || countryCode === 'BR') return 'pt';
  return 'en';
};

const buildQuery = (filters: NewsListFilters): string => {
  const { category, query, city, state } = filters;
  if (query) return query;
  if (category === 'immigration') return 'imigração brasileiros exterior';
  if (category === 'community') return 'comunidade brasileira exterior';
  if (category === 'headlines') return 'brasileiros no exterior';
  const location = [city, state].filter(Boolean).join(', ');
  if (location) return `brasileiros ${location}`;
  return 'brasileiros no exterior';
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
  let ptScore = 0; let enScore = 0;
  for (const m of ptMarkers) if (text.includes(m)) ptScore += 1;
  for (const m of enMarkers) if (text.includes(m)) enScore += 1;
  return ptScore >= enScore ? 'pt' : 'en';
};

const fetchWithTimeout = async (url: string, timeoutMs: number): Promise<unknown> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal, cache: 'no-store', headers: { 'x-api-key': process.env.FREE_NEWS_API_KEY! } });
    if (!response.ok) throw new Error('FreeNewsApi responded with ' + response.status);
    return await response.json();
  } finally { clearTimeout(timer); }
};

export function makeFreeNewsProvider(): NewsProvider {
  return {
    name: 'freenewsapi',
    async fetch(filters: NewsListFilters): Promise<NewsFeed> {
      const regionKey = filters.regionKey ?? null;
      const regionLabel = filters.regionLabel ?? null;
      const limit = filters.limit ?? DEFAULT_LIMIT;
      if (!isEnabled()) { return { items: [], regionKey, regionLabel, provider: this.name, fetchedAt: new Date().toISOString() }; }
      const params = new URLSearchParams();
      params.set('q', buildQuery(filters));
      params.set('language', getLanguage(filters.countryCode));
      params.set('country', getCountry(filters.countryCode));
      params.set('limit', String(Math.min(30, limit)));
      const url = `${BASE}/news?${params.toString()}`;
      const cached = cache.get(url);
      if (cached && cached.expiresAt > Date.now()) { return { ...cached.feed, items: cached.feed.items.slice(0, limit) }; }
      try {
        const payload = (await fetchWithTimeout(url, DEFAULT_TIMEOUT_MS)) as {
          data?: Array<{ uuid?: string; title?: string; description?: string; snippet?: string; url?: string; image?: string; image_url?: string; published_at?: string; publisher?: string; source?: string; }>;
          meta?: { returned?: number; has_more?: boolean; page_size?: number };
        };
        const category = mapCategory(filters);
        const seen = new Set<string>();
        const items: NewsItem[] = [];
        for (const article of payload.data ?? []) {
          const link = article.url?.trim() ?? '';
          if (!isValidHttpUrl(link)) continue;
          const normalizedUrl = link.replace(/^https?:\/\//i, '').replace(/\/$/, '');
          if (seen.has(normalizedUrl)) continue; seen.add(normalizedUrl);
          const title = article.title?.trim() ?? '';
          if (!title) continue;
          const description = article.description?.trim() || article.snippet?.trim() || null;
          const rawImage = article.image || article.image_url;
          const imageUrl = rawImage && isValidHttpUrl(rawImage) ? rawImage : null;
          const source = article.publisher?.trim() || article.source?.trim() || 'FreeNewsApi';
          items.push({
            id: article.uuid ?? 'freenews-' + Buffer.from(normalizedUrl).toString('base64url').slice(0, 24),
            title, source,
            publishedAt: article.published_at ? new Date(article.published_at).toISOString() : new Date().toISOString(),
            url: link, imageUrl, description, category,
            language: detectLanguage(title, description ?? ''),
            regionKey,
          });
        }
        const feed: NewsFeed = { items: items.slice(0, limit), regionKey, regionLabel, provider: this.name, fetchedAt: new Date().toISOString() };
        cache.set(url, { feed, expiresAt: Date.now() + DEFAULT_CACHE_TTL_MS });
        return feed;
      } catch (error) {
        console.warn('[news] FreeNewsApi unavailable:', error);
        return { items: [], regionKey, regionLabel, provider: this.name, fetchedAt: new Date().toISOString() };
      }
    },
  };
}
