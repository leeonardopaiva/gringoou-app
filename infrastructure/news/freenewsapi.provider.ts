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
 * A listagem /v1/news retorna apenas uuid/title/published_at/publisher (sem URL externa),
 * então usamos uma busca no Google News pelo título como link de fallback.
 * Em falha/indisponibilidade, retorna um feed curado para nunca deixar a página vazia.
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
  return 'pt';
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

const googleNewsSearchUrl = (term: string) =>
  `https://www.google.com/search?q=${encodeURIComponent(`"${term.replace(/[“”]/g, '"')}"`)}&tbm=nws&hl=pt-BR`;

const FALLBACK_ITEMS: Array<{ title: string; source: string; url: string; imageUrl: string; description: string }> = [
  {
    title: 'Brasileiros no exterior: como a comunidade se organiza nos EUA',
    source: 'Comunidade Gringoou',
    url: 'https://www.google.com/search?q=%22brasileiros%20no%20exterior%22&tbm=nws',
    imageUrl: 'https://picsum.photos/seed/gringoou1/600/400',
    description: 'Encontros, feiras e grupos fortalecem a rede de brasileiros que vivem fora do Brasil.',
  },
  {
    title: 'Imigração: o que mudou nas regras de visto em 2025',
    source: 'Atualidades',
    url: 'https://www.google.com/search?q=%22imigra%C3%A7%C3%A3o%20visto%22&tbm=nws',
    imageUrl: 'https://picsum.photos/seed/gringoou2/600/400',
    description: 'Entenda as principais mudanças e como elas afetam quem planeja morar no exterior.',
  },
  {
    title: 'Empreendedorismo brasileiro cresce entre a comunidade no exterior',
    source: 'Comunidade Gringoou',
    url: 'https://www.google.com/search?q=%22empreendedorismo%20brasileiro%22&tbm=nws',
    imageUrl: 'https://picsum.photos/seed/gringoou3/600/400',
    description: 'Cada vez mais brasileiros abrem negócios próprios e movimentam a economia local.',
  },
  {
    title: 'Dicas para recém-chegados: documentação e adaptação',
    source: 'Guia do Imigrante',
    url: 'https://www.google.com/search?q=%22guia%20para%20rec%C3%A9m-chegados%22&tbm=nws',
    imageUrl: 'https://picsum.photos/seed/gringoou4/600/400',
    description: 'Um passo a passo para quem está começando a vida em um novo país.',
  },
  {
    title: 'Comunidade brasileira celebra datas e tradições no exterior',
    source: 'Comunidade Gringoou',
    url: 'https://www.google.com/search?q=%22comunidade%20brasileira%22&tbm=nws',
    imageUrl: 'https://picsum.photos/seed/gringoou5/600/400',
    description: 'Festas, culinária e cultura aproximam os brasileiros que vivem longe do Brasil.',
  },
];

const buildFallbackFeed = (filters: NewsListFilters, regionKey: string | null, regionLabel: string | null): NewsFeed => {
  const category = mapCategory(filters);
  const items: NewsItem[] = FALLBACK_ITEMS.map((item, index) => ({
    id: `fallback-${index}`,
    title: item.title,
    source: item.source,
    publishedAt: new Date(Date.now() - index * 3600_000).toISOString(),
    url: item.url,
    imageUrl: item.imageUrl,
    description: item.description,
    category,
    language: 'pt',
    regionKey,
  }));
  return { items, regionKey, regionLabel, provider: 'fallback', fetchedAt: new Date().toISOString() };
};

export function makeFreeNewsProvider(): NewsProvider {
  return {
    name: 'freenewsapi',
    async fetch(filters: NewsListFilters): Promise<NewsFeed> {
      const regionKey = filters.regionKey ?? null;
      const regionLabel = filters.regionLabel ?? null;
      const limit = filters.limit ?? DEFAULT_LIMIT;
      if (!isEnabled()) { return buildFallbackFeed(filters, regionKey, regionLabel); }
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
          data?: Array<{ uuid?: string; title?: string; description?: string; snippet?: string; url?: string; article_url?: string; link?: string; uri?: string; source_url?: string; image?: string; image_url?: string; imageUrl?: string; thumbnail?: string; published_at?: string; publisher?: string; source?: string; }>;
          meta?: { returned?: number; has_more?: boolean; page_size?: number };
        };
        const category = mapCategory(filters);
        const seen = new Set<string>();
        const items: NewsItem[] = [];
        for (const article of payload.data ?? []) {
          const rawLink = article.url?.trim() || article.article_url?.trim() || article.link?.trim() || article.uri?.trim() || article.source_url?.trim() || '';
          
          const title = article.title?.trim() || '';
            const link = rawLink && isValidHttpUrl(rawLink)
            ? rawLink
          : googleNewsSearchUrl(title);
          const normalizedUrl = link.replace(/^https?:\/\//i, '').replace(/\/$/, '');
          if (seen.has(normalizedUrl)) continue; seen.add(normalizedUrl);
          
          if (!title) continue;
          const description = article.description?.trim() || article.snippet?.trim() || null;
          const rawImage = article.image || article.image_url || article.imageUrl || article.thumbnail || null;
          const imageUrl =
            rawImage && isValidHttpUrl(rawImage)
              ? rawImage
              : `https://picsum.photos/seed/${article.uuid ?? normalizedUrl}/600/400`;
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
        const feed: NewsFeed =
          items.length > 0
            ? { items: items.slice(0, limit), regionKey, regionLabel, provider: this.name, fetchedAt: new Date().toISOString() }
            : buildFallbackFeed(filters, regionKey, regionLabel);
        cache.set(url, { feed, expiresAt: Date.now() + DEFAULT_CACHE_TTL_MS });
        return feed;
      } catch (error) {
        console.warn('[news] FreeNewsApi unavailable:', error);
        return buildFallbackFeed(filters, regionKey, regionLabel);
      }
    },
  };
}
