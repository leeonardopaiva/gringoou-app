'use client';

import React, { FormEvent, startTransition, useDeferredValue, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { CalendarDays, Clock3, MapPin, Search, Store, Users } from 'lucide-react';
import type { Business, EventItem } from '@/types';
import { ContentColumn } from '@/components/ui';

type SearchPostResult = {
  id: string;
  content: string;
  imageUrl?: string | null;
  createdAt: string;
  locationLabel: string;
  author: {
    id: string;
    name?: string | null;
    username?: string | null;
    image?: string | null;
  };
  _count: {
    comments: number;
    reactions: number;
  };
};

type SearchResponse = {
  query: string;
  businesses: Business[];
  events: EventItem[];
  posts: SearchPostResult[];
  counts: {
    businesses: number;
    events: number;
    posts: number;
    total: number;
  };
};

const emptyResults: SearchResponse = {
  query: '',
  businesses: [],
  events: [],
  posts: [],
  counts: {
    businesses: 0,
    events: 0,
    posts: 0,
    total: 0,
  },
};

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

const SearchResults: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryFromUrl = searchParams?.get('q')?.trim() ?? '';
  const [query, setQuery] = useState(queryFromUrl);
  const [activeTab, setActiveTab] = useState<'all' | 'businesses' | 'events' | 'posts'>('all');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResponse>(emptyResults);
  const deferredQuery = useDeferredValue(queryFromUrl);

  useEffect(() => {
    setQuery(queryFromUrl);
  }, [queryFromUrl]);

  useEffect(() => {
    let ignore = false;

    const fetchResults = async () => {
      if (!deferredQuery) {
        startTransition(() => {
          setResults(emptyResults);
        });
        return;
      }

      setLoading(true);

      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(deferredQuery)}`, {
          cache: 'no-store',
        });
        const payload = (await response.json().catch(() => null)) as SearchResponse | null;

        if (!response.ok || !payload) {
          throw new Error('Nao foi possivel buscar agora.');
        }

        if (!ignore) {
          startTransition(() => {
            setResults(payload);
          });
        }
      } catch (error) {
        console.error('Failed to search:', error);

        if (!ignore) {
          startTransition(() => {
            setResults(emptyResults);
          });
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    void fetchResults();

    return () => {
      ignore = true;
    };
  }, [deferredQuery]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = query.trim();

    if (!trimmed) {
      router.push('/buscar');
      return;
    }

    router.push(`/buscar?q=${encodeURIComponent(trimmed)}`);
  };

  const visibleBusinesses = activeTab === 'all' || activeTab === 'businesses';
  const visibleEvents = activeTab === 'all' || activeTab === 'events';
  const visiblePosts = activeTab === 'all' || activeTab === 'posts';

  return (
    <ContentColumn className="animate-in space-y-6 px-5 py-4 fade-in duration-500">
      <div className="space-y-4">
        <div>
          <h1 className="text-h2 font-bold text-foreground">Busca</h1>
          <p className="mt-1 text-sm text-slate-500">
            Encontre negocios, eventos e conversas da comunidade.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="relative">
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar na Gringoou"
            className="w-full rounded-full bg-bg py-4 pl-12 pr-4 text-sm outline-none focus:ring-2 focus:ring-brand-200"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        </form>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <SearchTab label="Tudo" active={activeTab === 'all'} onClick={() => setActiveTab('all')} />
          <SearchTab
            label={`Negocios (${results.counts.businesses})`}
            active={activeTab === 'businesses'}
            onClick={() => setActiveTab('businesses')}
          />
          <SearchTab
            label={`Eventos (${results.counts.events})`}
            active={activeTab === 'events'}
            onClick={() => setActiveTab('events')}
          />
          <SearchTab
            label={`Comunidade (${results.counts.posts})`}
            active={activeTab === 'posts'}
            onClick={() => setActiveTab('posts')}
          />
        </div>
      </div>

      {!queryFromUrl ? (
        <EmptyState text="Digite um termo para buscar no app." />
      ) : null}

      {queryFromUrl && !loading && results.counts.total === 0 ? (
        <EmptyState text={`Nenhum resultado encontrado para "${queryFromUrl}".`} />
      ) : null}

      {loading ? (
        <div className="space-y-3 pb-20">
          <div className="h-24 animate-pulse rounded-3xl bg-white shadow-sm" />
          <div className="h-24 animate-pulse rounded-3xl bg-white shadow-sm" />
          <div className="h-24 animate-pulse rounded-3xl bg-white shadow-sm" />
        </div>
      ) : null}

      {!loading && queryFromUrl ? (
        <div className="space-y-6 pb-20">
          {visibleBusinesses ? (
            <section className="space-y-3">
              <SectionHeader
                icon={<Store size={16} />}
                title="Negocios"
                count={results.counts.businesses}
              />
              {results.businesses.length === 0 ? (
                <SectionEmpty text="Nenhum negocio encontrado." />
              ) : (
                results.businesses.map((business) => (
                  <Link
                    key={business.id}
                    href={`/negocios/${business.slug || business.id}`}
                    className="flex min-h-32 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition hover:border-slate-200"
                  >
                    <img
                      src={business.imageUrl || `https://picsum.photos/seed/${business.id}/240`}
                      alt={business.name}
                      className="w-28 shrink-0 self-stretch object-cover"
                    />
                    <div className="min-w-0 flex-1 p-4">
                      <h2 className="text-body-sm font-bold text-foreground">{business.name}</h2>
                      <p className="mt-1 text-caption font-bold uppercase tracking-wide text-brand-500">
                        {business.category}
                      </p>
                      <p className="mt-2 line-clamp-2 text-sm text-slate-600">
                        {business.description || business.address}
                      </p>
                      <div className="mt-2 flex items-center gap-1 text-[11px] text-slate-500">
                        <MapPin size={12} />
                        <span className="truncate">{business.locationLabel || business.address}</span>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </section>
          ) : null}

          {visibleEvents ? (
            <section className="space-y-3">
              <SectionHeader
                icon={<CalendarDays size={16} />}
                title="Eventos"
                count={results.counts.events}
              />
              {results.events.length === 0 ? (
                <SectionEmpty text="Nenhum evento encontrado." />
              ) : (
                results.events.map((event) => (
                  <Link
                    key={event.id}
                    href={`/eventos/${event.slug || event.id}`}
                    className="flex min-h-32 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition hover:border-slate-200"
                  >
                    <img
                      src={event.imageUrl || `https://picsum.photos/seed/${event.id}/240`}
                      alt={event.title}
                      className="w-28 shrink-0 self-stretch object-cover"
                    />
                    <div className="min-w-0 flex-1 p-4">
                      <h2 className="text-body-sm font-bold text-foreground">{event.title}</h2>
                      <div className="mt-2 flex items-center gap-1 text-[11px] font-medium text-slate-500">
                        <Clock3 size={12} />
                        <span>{formatDateTime(event.startsAt)}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
                        <MapPin size={12} />
                        <span className="truncate">{event.venueName}</span>
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm text-slate-600">
                        {event.description || event.locationLabel}
                      </p>
                    </div>
                  </Link>
                ))
              )}
            </section>
          ) : null}

          {visiblePosts ? (
            <section className="space-y-3">
              <SectionHeader
                icon={<Users size={16} />}
                title="Comunidade"
                count={results.counts.posts}
              />
              {results.posts.length === 0 ? (
                <SectionEmpty text="Nenhuma publicacao encontrada." />
              ) : (
                results.posts.map((post) => (
                  <div
                    key={post.id}
                    role="link"
                    tabIndex={0}
                    onClick={() => router.push(`/community?post=${post.id}`)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        router.push(`/community?post=${post.id}`);
                      }
                    }}
                    className="flex gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:border-slate-200"
                  >
                    <Link
                      href={post.author.username ? `/${post.author.username}` : '/community'}
                      onClick={(event) => event.stopPropagation()}
                      className="shrink-0 transition hover:opacity-80"
                    >
                      <img
                        src={post.author.image || `https://picsum.photos/seed/${post.id}/160`}
                        alt={post.author.name || 'Comunidade'}
                        className="h-12 w-12 rounded-full object-cover"
                      />
                    </Link>
                    <Link href={`/community?post=${post.id}`} className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h2 className="truncate text-body-sm font-bold text-foreground">
                          {post.author.name || 'Usuario da comunidade'}
                        </h2>
                        {post.author.username ? (
                          <span className="truncate text-xs text-slate-400">@{post.author.username}</span>
                        ) : null}
                      </div>
                      <p className="mt-2 line-clamp-3 text-sm text-slate-600">{post.content}</p>
                      <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-slate-500">
                        <span>{formatDateTime(post.createdAt)}</span>
                        <span>{post.locationLabel}</span>
                        <span>{post._count.reactions} curtidas</span>
                        <span>{post._count.comments} comentarios</span>
                      </div>
                    </Link>
                  </div>
                ))
              )}
            </section>
          ) : null}
        </div>
      ) : null}
    </ContentColumn>
  );
};

const SearchTab: React.FC<{ label: string; active: boolean; onClick: () => void }> = ({
  label,
  active,
  onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`whitespace-nowrap rounded-2xl border px-4 py-2 text-xs font-bold transition ${
      active
        ? 'border-brand-500 bg-brand-500 text-white'
        : 'border-slate-200 bg-white text-slate-700'
    }`}
  >
    {label}
  </button>
);

const SectionHeader: React.FC<{ icon: React.ReactNode; title: string; count: number }> = ({
  icon,
  title,
  count,
}) => (
  <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500">
    <span className="text-brand-500">{icon}</span>
    <span>{title}</span>
    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
      {count}
    </span>
  </div>
);

const EmptyState: React.FC<{ text: string }> = ({ text }) => (
  <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-5 py-10 text-center text-sm font-medium text-slate-500">
    {text}
  </div>
);

const SectionEmpty: React.FC<{ text: string }> = ({ text }) => (
  <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-5 py-6 text-sm font-medium text-slate-500">
    {text}
  </div>
);

export default SearchResults;
