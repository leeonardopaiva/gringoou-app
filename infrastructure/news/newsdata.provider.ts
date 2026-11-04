import 'server-only';

import type { NewsProvider } from '@/domain/news/repositories/news.repository';
import type { NewsCategory, NewsFeed, NewsItem, NewsLanguage, NewsListFilters } from '@/domain/news/entities/news.entity';
import { isValidHttpUrl } from '@/lib/url';

/**
 * Provedor de Notícias baseado na NewsData.io (newsdata.io).
 *
 * Plano gratuito: 200 requisições/dia, 1 req/seg.
 * Retorna URL real do artigo, imagem (image_url) e fonte.
 * Requer NEWSDATA_API_KEY nas env vars.
 */

const BASE = 'https://newsdata.io/api/1/news';

const DEFAULT_TIMEOUT_MS = 7000;
const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000;
const DEFAULT_LIMIT = 30;

type CacheEntry = { feed: NewsFeed; expiresAt: number };
const cache = new Map<string, CacheEntry>();

const isEnabled = () => Boolean(process.env.NEWSDATA_API_KEY?.trim());

const getCountry = (countryCode?: string | null) => {
  if (countryCode === 'BR') return 'br';
  if (countryCode === 'PT') return 'pt';
  if (countryCode === 'CA') return 'ca';
  return undefined; // sem country = busca global em português
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

const fetchWithTimeout = async (url: string, timeoutMs: number): Promise<unknown> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      cache: 'no-store',
      headers: { 'X-ACCESS-KEY': process.env.NEWSDATA_API_KEY! },
    });
    if (!response.ok) throw new Error(`NewsData responded with ${response.status}`);
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

export function makeNewsDataProvider(): NewsProvider {
  return {
    name: 'newsdata',

    async fetch(filters: NewsListFilters): Promise<NewsFeed> {
      const regionKey = filters.regionKey ?? null;
      const regionLabel = filters.regionLabel ?? null;
      const limit = filters.limit ?? DEFAULT_LIMIT;

      if (!isEnabled()) {
        return buildFallbackFeed(filters, regionKey, regionLabel);
      }

      const params = new URLSearchParams();
      params.set('q', buildQuery(filters));
      params.set('language', 'pt');
      params.set('size', String(Math.min(30, limit)));
      const country = getCountry(filters.countryCode);
      if (country) params.set('country', country);

      const url = `${BASE}?${params.toString()}`;

      const cached = cache.get(url);
      if (cached && cached.expiresAt > Date.now()) {
        return { ...cached.feed, items: cached.feed.items.slice(0, limit) };
      }

      try {
        const payload = (await fetchWithTimeout(url, DEFAULT_TIMEOUT_MS)) as {
          status?: string;
          results?: Array<{
            article_id?: string | null;
            title?: string | null;
            link?: string | null;
            description?: string | null;
            image_url?: string | null;
            pubDate?: string | null;
            source_id?: string | null;
            source_name?: string | null;
          }>;
        };

        const category = mapCategory(filters);
        const seen = new Set<string>();
        const items: NewsItem[] = [];

        for (const article of payload.results ?? []) {
          const link = article.link?.trim() ?? '';
          if (!isValidHttpUrl(link)) continue;

          const normalizedUrl = link.replace(/^https?:\/\//i, '').replace(/\/$/, '');
          if (seen.has(normalizedUrl)) continue;
          seen.add(normalizedUrl);

          const title = article.title?.trim() ?? '';
          if (!title) continue;

          const rawImage = article.image_url?.trim() || '';
          const imageUrl =
            rawImage && isValidHttpUrl(rawImage)
              ? rawImage
              : `https://picsum.photos/seed/${article.article_id ?? normalizedUrl}/600/400`;
          const source = article.source_name?.trim() || article.source_id?.trim() || 'NewsData';

          // pubDate vem como "2026-11-03 16:08:56" com pubDateTZ=UTC.
          const pubDate = article.pubDate ? new Date(article.pubDate.replace(/ /g, 'T') + 'Z') : null;

          items.push({
            id: article.article_id ?? `newsdata-${Buffer.from(normalizedUrl).toString('base64url').slice(0, 24)}`,
            title,
            source,
            publishedAt: pubDate && !Number.isNaN(pubDate.getTime()) ? pubDate.toISOString() : new Date().toISOString(),
            url: link,
            imageUrl,
            description: article.description?.trim() || null,
            category,
            language: 'pt',
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
        console.warn('[news] NewsData unavailable:', error);
        return buildFallbackFeed(filters, regionKey, regionLabel);
      }
    },
  };
}
