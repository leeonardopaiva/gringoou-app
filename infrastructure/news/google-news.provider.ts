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
 * Provedor de Notícias baseado no Google News RSS.
 *
 * ATENÇÃO — LICENCIAMENTO:
 * Este provedor destina-se EXCLUSIVAMENTE a desenvolvimento / prova de conceito.
 * O Google News RSS não garante licença para republicação comercial de conteúdo.
 * Antes de usar em produção, verifique as condições de licenciamento e uso
 * comercial. A integração de produção deve usar um provedor com licenciamento
 * compatível (a troca é feita apenas substituindo o provedor injetado).
 *
 * O provedor apenas agrega títulos, fontes, datas e links para o artigo
 * original — não faz scraping de artigos nem republica conteúdo integral.
 */

const GOOGLE_NEWS_BASE = 'https://news.google.com/rss';

const DEFAULT_TIMEOUT_MS = 6000;
const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos
const DEFAULT_LIMIT = 30;

type CacheEntry = { feed: NewsFeed; expiresAt: number };

const cache = new Map<string, CacheEntry>();

const isEnabled = () => {
  const flag = process.env.NEWS_GOOGLE_RSS_ENABLED?.trim().toLowerCase();
  // Habilitado por padrão; desative com NEWS_GOOGLE_RSS_ENABLED=false.
  return flag !== 'false';
};

// Locale do país da região (para notícias locais relevantes).
const getLocale = (countryCode?: string | null) => {
  if (countryCode === 'US' || countryCode === 'CA') {
    return { hl: 'en-US', gl: 'US', ceid: 'US:en' };
  }
  if (countryCode === 'PT') {
    return { hl: 'pt-PT', gl: 'PT', ceid: 'PT:pt-150' };
  }
  // Padrão: edição brasileira (comunidade brasileira no exterior).
  return { hl: 'pt-BR', gl: 'BR', ceid: 'BR:pt-419' };
};

const buildUrl = (filters: NewsListFilters): string => {
  const { city, state, countryCode, category, query } = filters;
  const locale = getLocale(countryCode);

  if (query) {
    return `${GOOGLE_NEWS_BASE}/search?q=${encodeURIComponent(query)}&hl=${locale.hl}&gl=${locale.gl}&ceid=${locale.ceid}`;
  }

  if (category === 'immigration') {
    return `${GOOGLE_NEWS_BASE}/search?q=${encodeURIComponent('imigração brasileiros exterior')}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;
  }

  if (category === 'community') {
    return `${GOOGLE_NEWS_BASE}/search?q=${encodeURIComponent('comunidade brasileira exterior')}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;
  }

  if (category === 'headlines') {
    return `${GOOGLE_NEWS_BASE}/headlines/section/topic/WORLD?hl=pt-BR&gl=BR&ceid=BR:pt-419`;
  }

  // Regional: busca por cidade/estado (mais confiável que o feed geo).
  const location = [city, state].filter(Boolean).join(', ') || countryCode || 'United States';
  return `${GOOGLE_NEWS_BASE}/search?q=${encodeURIComponent(location)}&hl=${locale.hl}&gl=${locale.gl}&ceid=${locale.ceid}`;
};

const decodeEntities = (value: string) =>
  value
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, "'")
    .replace(/'/g, "'");

const stripHtml = (value: string) =>
  value
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const detectLanguage = (title: string, description: string): NewsLanguage => {
  const text = `${title} ${description}`.toLowerCase();
  const ptMarkers = ['ã', 'õ', 'ç', 'á', 'é', 'í', 'ó', 'ú', 'ê', 'ô', 'à', 'não', 'para', 'com', 'brasil', 'brasileiros'];
  const enMarkers = ['the', 'and', 'for', 'with', 'from', 'this', 'that', 'are', 'was'];

  let ptScore = 0;
  let enScore = 0;

  for (const marker of ptMarkers) {
    if (text.includes(marker)) ptScore += 1;
  }
  for (const marker of enMarkers) {
    if (text.includes(marker)) enScore += 1;
  }

  return ptScore >= enScore ? 'pt' : 'en';
};

const parseRssItems = (xml: string): Array<Record<string, string>> => {
  const items: Array<Record<string, string>> = [];
  const itemPattern = /<item>([\s\S]*?)<\/item>/gi;
  let match: RegExpExecArray | null;

  while ((match = itemPattern.exec(xml)) !== null) {
    const block = match[1];
    const extract = (tag: string) => {
      const inner = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i').exec(block);
      return inner ? decodeEntities(stripHtml(inner[1])) : '';
    };

    const title = extract('title');
    const link = extract('link');
    const pubDate = extract('pubDate');
    const source = extract('source');
    const description = extract('description');

    // Imagem via media:content (Google News RSS expõe quando disponível).
    const mediaMatch = /<media:content[^>]*url="([^"]+)"/i.exec(block);
    const imageUrl = mediaMatch?.[1] ? decodeEntities(mediaMatch[1]) : '';

    if (title && link) {
      items.push({ title, link, pubDate, source, description, imageUrl });
    }
  }

  return items;
};

const mapCategory = (filters: NewsListFilters): NewsCategory => {
  if (filters.category === 'immigration') return 'immigration';
  if (filters.category === 'community') return 'community';
  if (filters.category === 'headlines') return 'headlines';
  if (filters.category === 'for-you') return 'for-you';
  return 'region';
};

const normalizeItems = (
  rawItems: Array<Record<string, string>>,
  filters: NewsListFilters,
  regionKey: string | null,
): NewsItem[] => {
  const category = mapCategory(filters);
  const seen = new Set<string>();
  const items: NewsItem[] = [];

  for (const raw of rawItems) {
    const url = raw.link.trim();
    if (!isValidHttpUrl(url)) continue;

    // Deduplicação por URL normalizada.
    const normalizedUrl = url.replace(/^https?:\/\//i, '').replace(/\/$/, '');
    if (seen.has(normalizedUrl)) continue;
    seen.add(normalizedUrl);

    const title = raw.title.trim();
    if (!title) continue;

    const description = raw.description.trim() || null;
    const language = detectLanguage(title, description ?? '');
    const imageUrl = raw.imageUrl && isValidHttpUrl(raw.imageUrl) ? raw.imageUrl : null;

    items.push({
      id: `news-${Buffer.from(normalizedUrl).toString('base64url').slice(0, 24)}`,
      title,
      source: raw.source.trim() || 'Google News',
      publishedAt: raw.pubDate ? new Date(raw.pubDate).toISOString() : new Date().toISOString(),
      url,
      imageUrl,
      description,
      category,
      language,
      regionKey,
    });
  }

  return items;
};

const fetchWithTimeout = async (url: string, timeoutMs: number): Promise<string> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/rss+xml, application/xml, text/xml, */*' },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Google News RSS responded with ${response.status}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timer);
  }
};

export function makeGoogleNewsProvider(): NewsProvider {
  return {
    name: 'google-news-rss',

    async fetch(filters: NewsListFilters): Promise<NewsFeed> {
      const regionKey = filters.regionKey ?? null;
      const regionLabel = filters.regionLabel ?? null;
      const limit = filters.limit ?? DEFAULT_LIMIT;

      if (!isEnabled()) {
        return { items: [], regionKey, regionLabel, provider: this.name, fetchedAt: new Date().toISOString() };
      }

      const url = buildUrl(filters);
      const cacheKey = url;

      const cached = cache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        return { ...cached.feed, items: cached.feed.items.slice(0, limit) };
      }

      try {
        const xml = await fetchWithTimeout(url, DEFAULT_TIMEOUT_MS);
        const rawItems = parseRssItems(xml);
        const items = normalizeItems(rawItems, filters, regionKey).slice(0, limit);

        const feed: NewsFeed = {
          items,
          regionKey,
          regionLabel,
          provider: this.name,
          fetchedAt: new Date().toISOString(),
        };

        cache.set(cacheKey, { feed, expiresAt: Date.now() + DEFAULT_CACHE_TTL_MS });

        return feed;
      } catch (error) {
        // Indisponibilidade não deve quebrar a página: retorna feed vazio.
        console.warn('[news] Google News RSS unavailable:', error);
        return { items: [], regionKey, regionLabel, provider: this.name, fetchedAt: new Date().toISOString() };
      }
    },
  };
}