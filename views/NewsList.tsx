'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { ExternalLink, MapPin, Newspaper, Search, Share2, ThumbsUp } from 'lucide-react';
import PageHeader from '../components/navigation/PageHeader';
import { ContentColumn } from '../components/ui/ContentColumn';
import { EmptyState } from '../components/ui/EmptyState';
import Link from 'next/link';
import { Avatar } from '../components/ui/Avatar';
import { Modal } from '../components/ui/Modal';
import { Skeleton } from '../components/ui/Skeleton';
import { NewsComments } from '../components/news/NewsComments';
import { SectionTabs } from '../components/ui/SectionTabs';
import { Button } from '../components/ui';
import { formatRelativeTime } from '../components/marketplace/MarketplaceCard';
import { useToast } from '../components/feedback/ToastProvider';
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

/** Cartão da notícia: na lista mostra a prévia; na página da notícia (`detail`) abre os comentários completos. */
export const NewsCard: React.FC<{ article: NewsArticleContract; detail?: boolean }> = ({ article, detail = false }) => {
  const { showToast } = useToast();
  const [imageFailed, setImageFailed] = useState(false);
  const [liked, setLiked] = useState(article.viewerLiked);
  const [likeCount, setLikeCount] = useState(article.likeCount);
  const [likeBusy, setLikeBusy] = useState(false);
  const { data: session } = useSession();
  const [likers, setLikers] = useState(article.recentLikers);
  const [likersOpen, setLikersOpen] = useState(false);
  const [likersList, setLikersList] = useState<Array<{ id: string; name: string | null; username: string | null; image: string | null; locationLabel?: string | null }> | null>(null);
  const showImage = Boolean(article.imageUrl) && !imageFailed;

  /** Curtir com atualização imediata; desfaz se o servidor recusar. */
  const handleLike = async () => {
    if (likeBusy) return;
    const nextLiked = !liked;
    setLikeBusy(true);
    setLiked(nextLiked);
    setLikeCount((count) => Math.max(0, count + (nextLiked ? 1 : -1)));
    const me = session?.user;
    if (me?.id) {
      setLikers((current) =>
        nextLiked
          ? [{ id: me.id, name: me.name ?? null, username: me.username ?? null, image: me.image ?? null }, ...current.filter((p) => p.id !== me.id)].slice(0, 3)
          : current.filter((p) => p.id !== me.id),
      );
    }
    setLikersList(null);
    try {
      const response = await fetch(`/api/news/${article.id}/like`, { method: nextLiked ? 'POST' : 'DELETE' });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? 'Não foi possível curtir agora.');
      if (typeof payload?.likeCount === 'number') setLikeCount(payload.likeCount);
    } catch (error) {
      setLikers(article.recentLikers);
      setLiked(!nextLiked);
      setLikeCount((count) => Math.max(0, count + (nextLiked ? -1 : 1)));
      showToast(error instanceof Error ? error.message : 'Não foi possível curtir agora.', 'error');
    } finally {
      setLikeBusy(false);
    }
  };

  const openLikers = async () => {
    setLikersOpen(true);
    if (likersList) return;
    try {
      const response = await fetch(`/api/news/${article.id}/likes`);
      const payload = await response.json().catch(() => null);
      setLikersList(response.ok && Array.isArray(payload?.users) ? payload.users : []);
    } catch {
      setLikersList([]);
    }
  };

  const handleShare = async () => {
    // Compartilha a página da notícia no Gringoou, não o link da matéria original.
    const shareUrl = `${window.location.origin}${article.path}`;
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title: article.title, text: article.subtitle ?? undefined, url: shareUrl });
        return;
      }
      await navigator.clipboard.writeText(shareUrl);
      showToast('Link da notícia copiado.', 'success');
    } catch (error) {
      // Cancelar o menu de compartilhamento não é erro.
      if ((error as Error)?.name !== 'AbortError') showToast('Não foi possível compartilhar agora.', 'error');
    }
  };

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
        {!detail ? <Link href={article.path} aria-label={`Abrir notícia: ${article.title}`} className="absolute inset-0" /> : null}
        <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-brand-700 shadow-sm backdrop-blur">
          {getNewsCategoryLabel(article.category)}
        </span>
      </div>

      <div className="p-4">
        {detail ? (
          <h1 className="text-lg font-bold leading-snug text-foreground">{article.title}</h1>
        ) : (
          <h2 className="text-base font-bold leading-snug text-foreground">
            <Link href={article.path} className="transition hover:text-brand-600">{article.title}</Link>
          </h2>
        )}
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
        </div>

        <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={() => void handleLike()}
            aria-pressed={liked}
            aria-label={liked ? 'Remover curtida' : 'Curtir notícia'}
            title={liked ? 'Remover curtida' : 'Curtir'}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 ${liked ? 'bg-brand-50 text-brand-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            <ThumbsUp size={18} fill={liked ? 'currentColor' : 'none'} aria-hidden />
          </button>
          {likeCount > 0 ? (
            <button
              type="button"
              onClick={() => void openLikers()}
              aria-label={`Ver quem curtiu (${likeCount})`}
              className="flex min-w-0 items-center gap-2 rounded-full py-1 pr-2 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
            >
              <span className="flex -space-x-2">
                {likers.map((person) => (
                  <Avatar key={person.id} src={person.image} name={person.name || person.username || 'Membro'} size="xs" />
                ))}
              </span>
              <span className="truncate text-xs font-semibold text-slate-600">
                {likeCount === 1 ? '1 curtida' : `${likeCount} curtidas`}
              </span>
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => void handleShare()}
            aria-label="Compartilhar notícia"
            className="inline-flex h-10 items-center gap-1.5 rounded-full border border-slate-200 bg-transparent px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 sm:px-4"
          >
            <Share2 size={17} aria-hidden />
            <span className="hidden sm:inline">Compartilhar</span>
          </button>
          <a
            href={article.externalUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            aria-label={`Ler matéria original em ${article.source} (abre em nova aba)`}
            title="Ler matéria original"
            className="ml-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 transition hover:bg-brand-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
          >
            <ExternalLink size={18} aria-hidden />
          </a>
        </div>
        <div className="mt-3">
          <NewsComments articleId={article.id} initialCount={article.commentCount} expanded={detail} />
        </div>
      </div>
      <Modal open={likersOpen} onClose={() => setLikersOpen(false)} title="Quem curtiu" className="max-w-md">
        {likersList === null ? (
          <div className="space-y-3" role="status" aria-label="Carregando curtidas">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : likersList.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-500">Ninguém curtiu ainda.</p>
        ) : (
          <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
            {likersList.map((person) => {
              const name = person.name || person.username || 'Membro da comunidade';
              const row = (
                <>
                  <Avatar src={person.image} name={name} size="sm" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-slate-800">{name}</span>
                    {person.username ? <span className="block truncate text-xs text-slate-400">@{person.username}</span> : null}
                  </span>
                </>
              );
              return (
                <li key={person.id}>
                  {person.username ? (
                    <Link href={`/${person.username}`} className="flex items-center gap-3 rounded-xl px-1 py-2.5 transition hover:bg-slate-50">
                      {row}
                    </Link>
                  ) : (
                    <div className="flex items-center gap-3 px-1 py-2.5">{row}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Modal>
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
