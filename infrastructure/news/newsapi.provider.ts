import 'server-only';

import type { NewsProvider } from '@/domain/news/repositories/news.repository';
import type { NewsCategory, NewsFeed, NewsItem, NewsLanguage, NewsListFilters } from '@/domain/news/entities/news.entity';
import { isValidHttpUrl } from '@/lib/url';

/**
 * Provedor de Notícias baseado na NewsAPI.org (newsapi.org).
 *
 * Plano gratuito: 100 requisições/dia, dados com ~24h de atraso, sem uso
 * comercial. Diferente da FreeNewsApi, retorna URL real do artigo e imagem
 * (urlToImage), resolvendo foto de capa e link direto para a página original.
 * Requer NEWS_API_KEY nas env vars.
 */

const BASE = 'https://newsapi.org/v2/everything';

const DEFAULT_TIMEOUT_MS = 6000;
const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000;
const DEFAULT_LIMIT = 30;

type CacheEntry = { feed: NewsFeed; expiresAt: number };
const cache = new Map<string, CacheEntry>();

const isEnabled = () => Boolean(process.env.NEWS_API_KEY?.trim());

const getLanguage = (_countryCode?: string | null): string => {
  // As queries do app são sempre em português (público brasileiro). Forçar
  // language=pt evita 0 resultados quando a região do usuário é en (ex.: EUA).
  return 'pt';
};

const buildQuery = (filters: NewsListFilters): string => {
  const { category, query, city, state } = filters;
  if (query) return query;
  if (category === 'immigration') return 'imigração brasileiros exterior';
  if (category === 'community') return 'comunidade brasileira exterior';
  if (category === 'headlines') return 'brasileiros no exterior';
  const location = [city, state].filter(Boolean).join(' ');
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
    const response = await fetch(url, {
      signal: controller.signal,
      cache: 'no-store',
      headers: { 'X-Api-Key': process.env.NEWS_API_KEY! },
    });
    if (!response.ok) throw new Error(`NewsAPI responded with ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
};

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

export function makeNewsApiProvider(): NewsProvider {
  return {
    name: 'newsapi',

    async fetch(filters: NewsListFilters): Promise<NewsFeed> {
      const regionKey = filters.regionKey ?? null;
      const regionLabel = filters.regionLabel ?? null;
      const limit = filters.limit ?? DEFAULT_LIMIT;

      if (!isEnabled()) {
        return buildFallbackFeed(filters, regionKey, regionLabel);
      }

      const params = new URLSearchParams();
      params.set('q', buildQuery(filters));
      params.set('language', getLanguage(filters.countryCode));
      params.set('sortBy', 'publishedAt');
      params.set('pageSize', String(Math.min(30, limit)));

      const url = `${BASE}?${params.toString()}`;

      const cached = cache.get(url);
      if (cached && cached.expiresAt > Date.now()) {
        return { ...cached.feed, items: cached.feed.items.slice(0, limit) };
      }

      try {
        const payload = (await fetchWithTimeout(url, DEFAULT_TIMEOUT_MS)) as {
          status?: string;
          articles?: Array<{
            source?: { id?: string | null; name?: string };
            author?: string | null;
            title?: string;
            description?: string | null;
            url?: string;
            urlToImage?: string | null;
            publishedAt?: string;
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
          const rawImage = article.urlToImage?.trim() || '';
          const imageUrl = rawImage && isValidHttpUrl(rawImage) ? rawImage : null;
          const source = article.source?.name?.trim() || 'NewsAPI';

          items.push({
            id: `newsapi-${Buffer.from(normalizedUrl).toString('base64url').slice(0, 24)}`,
            title,
            source,
            publishedAt: article.publishedAt ? new Date(article.publishedAt).toISOString() : new Date().toISOString(),
            url: link,
            imageUrl,
            description,
            category,
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
        console.warn('[news] NewsAPI unavailable:', error);
        return buildFallbackFeed(filters, regionKey, regionLabel);
      }
    },
  };
}
