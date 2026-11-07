'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { ExternalLink, MapPin, Newspaper, Search } from 'lucide-react';
import PageHeader from '../components/navigation/PageHeader';
import { ContentColumn } from '../components/ui/ContentColumn';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { SectionTabs } from '../components/ui/SectionTabs';
import { Button } from '../components/ui';
import { formatRelativeTime } from '../components/marketplace/MarketplaceCard';
import { useActiveRegion } from '../components/RegionContext';
import { useLanguage } from '../components/i18n/LanguageProvider';
import { useIntersectionTrigger } from '../hooks/useIntersectionTrigger';
import { NEWS_CATEGORIES, getNewsCategoryLabel } from '../lib/news';
import type { NewsArticleContract, NewsInitialData } from '../lib/content-contracts';

const ALL = 'all';
const CATEGORY_TABS = [{ id: ALL, label: 'Todas' }, ...NEWS_CATEGORIES.map((c) => ({ id: c.id, label: c.label }))];

type Sort = 'recent' | 'oldest';

const selectClass =
  'h-10 min-w-0 flex-1 rounded-2xl border border-slate-100 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-100';

const formatPublishedAt = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(
    new Date(iso),
  );

const NewsCard: React.FC<{ article: NewsArticleContract }> = ({ article }) => {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(article.imageUrl) && !imageFailed;

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      <div className="relative aspect-[16/9] w-full bg-slate-100">
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={article.imageUrl as string}
            alt=""
            loading="lazy"
            onError={() => setImageFailed(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-50 to-slate-100">
            <Newspaper size={36} className="text-brand-300" aria-hidden />
          </div>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-brand-700 shadow-sm backdrop-blur">
          {getNewsCategoryLabel(article.category)}
        </span>
      </div>

      <div className="p-4">
        <h2 className="text-base font-bold leading-snug text-foreground">{article.title}</h2>
        {article.subtitle ? <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{article.subtitle}</p> : null}

        <div className="mt-3 flex items-end justify-between gap-3">
          <div className="min-w-0 space-y-1 text-xs text-slate-400">
            <p className="flex flex-wrap items-center gap-x-1.5">
              <span className="font-semibold text-slate-600">{article.source}</span>
              <span aria-hidden>·</span>
              <time dateTime={article.publishedAt} title={formatPublishedAt(article.publishedAt)}>
                {formatPublishedAt(article.publishedAt)}
              </time>
              <span className="text-slate-300">({formatRelativeTime(article.publishedAt)})</span>
            </p>
            {article.regionLabel ? (
              <p className="flex items-center gap-1">
                <MapPin size={12} className="shrink-0" aria-hidden />
                <span className="truncate">{article.regionLabel}</span>
              </p>
            ) : null}
          </div>
          <a
            href={article.externalUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            aria-label={`Ler matéria original em ${article.source} (abre em nova aba)`}
            title="Ler matéria original"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 transition hover:bg-brand-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
          >
            <ExternalLink size={18} aria-hidden />
          </a>
        </div>
      </div>
    </article>
  );
};

const NewsSkeleton: React.FC = () => (
  <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm" aria-hidden>
    <Skeleton className="aspect-[16/9] w-full rounded-none" />
    <div className="space-y-2 p-4">
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  </div>
);

type NewsListProps = {
  initialData?: NewsInitialData;
};

const NewsList: React.FC<NewsListProps> = ({ initialData }) => {
  const { data: session } = useSession();
  const { t } = useLanguage();
  const contextRegionKey = useActiveRegion();
  const regionKey = contextRegionKey || session?.user?.regionKey || null;

  const [category, setCategory] = useState(ALL);
  const [scope, setScope] = useState<'mine' | 'all'>('mine');
  const [sort, setSort] = useState<Sort>('recent');
  const [source, setSource] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [sources, setSources] = useState<string[]>([]);

  const [items, setItems] = useState<NewsArticleContract[]>(initialData?.items ?? []);
  const [nextCursor, setNextCursor] = useState<string | null>(initialData?.nextCursor ?? null);
  const [hasMore, setHasMore] = useState(initialData?.hasMore ?? false);
  const [loading, setLoading] = useState(!initialData);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // A primeira página pré-carregada no servidor só vale para os filtros padrão.
  const usedInitial = useRef(Boolean(initialData));
  const inFlight = useRef(false);
  const requestId = useRef(0);

  const effectiveRegion = scope === 'mine' ? regionKey : null;

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    let ignore = false;
    void fetch('/api/news?sources=1&limit=1', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (!ignore && Array.isArray(payload?.sources)) setSources(payload.sources);
      })
      .catch(() => undefined);
    return () => {
      ignore = true;
    };
  }, []);

  const buildParams = useCallback(
    (cursor?: string | null) => {
      const params = new URLSearchParams();
      if (effectiveRegion) params.set('region', effectiveRegion);
      if (category !== ALL) params.set('category', category);
      if (source) params.set('source', source);
      if (search) params.set('q', search);
      if (sort !== 'recent') params.set('sort', sort);
      if (cursor) params.set('cursor', cursor);
      return params;
    },
    [category, effectiveRegion, search, sort, source],
  );

  // Nova consulta sempre que um filtro muda (reinicia a paginação).
  useEffect(() => {
    const isDefaultQuery =
      category === ALL && !source && !search && sort === 'recent' && effectiveRegion === (initialData?.regionKey ?? null);
    if (usedInitial.current && isDefaultQuery) {
      usedInitial.current = false;
      return;
    }
    usedInitial.current = false;

    const id = ++requestId.current;
    inFlight.current = true;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const response = await fetch(`/api/news?${buildParams().toString()}`, { cache: 'no-store' });
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error ?? 'Não foi possível carregar as notícias.');
        if (id !== requestId.current) return;
        setItems(payload.items ?? []);
        setNextCursor(payload.nextCursor ?? null);
        setHasMore(Boolean(payload.hasMore));
      } catch (err) {
        if (id !== requestId.current) return;
        console.error('Failed to load news:', err);
        setError('Não foi possível carregar as notícias agora. Tente novamente em instantes.');
        setItems([]);
        setHasMore(false);
      } finally {
        if (id === requestId.current) {
          inFlight.current = false;
          setLoading(false);
        }
      }
    })();
  }, [buildParams, category, effectiveRegion, initialData?.regionKey, reloadKey, search, sort, source]);

  const loadMore = useCallback(async () => {
    if (inFlight.current || !hasMore || !nextCursor) return;
    inFlight.current = true;
    const id = requestId.current;
    setLoadingMore(true);
    try {
      const response = await fetch(`/api/news?${buildParams(nextCursor).toString()}`, { cache: 'no-store' });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? 'Não foi possível carregar mais notícias.');
      if (id !== requestId.current) return;
      setItems((current) => {
        const seen = new Set(current.map((item) => item.id));
        return [...current, ...(payload.items as NewsArticleContract[]).filter((item) => !seen.has(item.id))];
      });
      setNextCursor(payload.nextCursor ?? null);
      setHasMore(Boolean(payload.hasMore));
    } catch (err) {
      console.error('Failed to load more news:', err);
      if (id === requestId.current) setHasMore(false);
    } finally {
      if (id === requestId.current) {
        inFlight.current = false;
        setLoadingMore(false);
      }
    }
  }, [buildParams, hasMore, nextCursor]);

  const sentinelRef = useIntersectionTrigger(() => void loadMore(), {
    enabled: hasMore && !loading && !loadingMore && !error,
    rootMargin: '0px 0px 400px 0px',
  });

  return (
    <ContentColumn size="feed" className="pb-20 pt-2">
      <PageHeader title={t('news.title')} backHref="/home" />

      <div className="mt-4 space-y-3">
        <div className="relative">
          <input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder={t('news.search')}
            aria-label="Buscar notícias"
            className="w-full rounded-2xl border border-slate-100 bg-white py-3.5 pl-12 pr-4 text-sm shadow-sm focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} aria-hidden />
        </div>

        <SectionTabs options={CATEGORY_TABS} value={category} onChange={setCategory} ariaLabel="Categorias de notícias" />

        <div className="flex gap-2">
          <select
            aria-label="Região"
            value={scope}
            onChange={(event) => setScope(event.target.value as 'mine' | 'all')}
            className={selectClass}
          >
            <option value="mine" disabled={!regionKey}>
              Minha região
            </option>
            <option value="all">Todas as regiões</option>
          </select>
          <select
            aria-label="Ordenar por data"
            value={sort}
            onChange={(event) => setSort(event.target.value as Sort)}
            className={selectClass}
          >
            <option value="recent">Mais recentes</option>
            <option value="oldest">Mais antigas</option>
          </select>
          {sources.length > 1 ? (
            <select aria-label="Fonte" value={source} onChange={(event) => setSource(event.target.value)} className={selectClass}>
              <option value="">Todas as fontes</option>
              {sources.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          ) : null}
        </div>
      </div>

      <div className="mt-5 space-y-4" aria-busy={loading || loadingMore}>
        {loading ? (
          <>
            <NewsSkeleton />
            <NewsSkeleton />
            <NewsSkeleton />
          </>
        ) : error ? (
          <EmptyState
            icon={<Newspaper size={28} />}
            title={t('news.unavailable')}
            description={error}
            action={<Button onClick={() => setReloadKey((key) => key + 1)}>Tentar novamente</Button>}
          />
        ) : items.length === 0 ? (
          <EmptyState icon={<Newspaper size={28} />} title={t('news.empty')} description="Ajuste a busca ou os filtros para ver outras notícias." />
        ) : (
          <>
            {items.map((article) => (
              <NewsCard key={article.id} article={article} />
            ))}
            {loadingMore ? <NewsSkeleton /> : null}
            <div ref={sentinelRef} className="h-1" aria-hidden />
            {!hasMore && !loadingMore ? (
              <p className="pt-2 text-center text-xs text-slate-400">Você chegou ao fim das notícias.</p>
            ) : null}
          </>
        )}
      </div>
    </ContentColumn>
  );
};

export default NewsList;
