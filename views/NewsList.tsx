'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Clock, ExternalLink, Globe, Newspaper, Search } from 'lucide-react';
import PageHeader from '../components/navigation/PageHeader';
import { ContentColumn } from '../components/ui/ContentColumn';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { SectionTabs } from '../components/ui/SectionTabs';
import { useActiveRegion } from '../components/RegionContext';
import { useLanguage } from '../components/i18n/LanguageProvider';
import type { NewsInitialData, NewsItemContract } from '../lib/content-contracts';

type NewsCategory = NewsItemContract['category'];

const CATEGORY_TABS: Array<{ id: NewsCategory; label: string }> = [
  { id: 'for-you', label: 'Para você' },
  { id: 'region', label: 'Sua região' },
  { id: 'immigration', label: 'Imigração' },
  { id: 'community', label: 'Comunidade brasileira' },
  { id: 'headlines', label: 'Atualidades' },
];

const CATEGORY_QUERY: Record<NewsCategory, string> = {
  'for-you': '',
  region: '',
  immigration: 'imigração brasileiros exterior',
  community: 'comunidade brasileira exterior',
  headlines: 'brasileiros no exterior atualidades',
};

const formatRelativeTime = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `há ${days} d`;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
};

type NewsListProps = {
  initialData?: NewsInitialData;
};

const NewsList: React.FC<NewsListProps> = ({ initialData }) => {
  const { data: session } = useSession();
  const { t } = useLanguage();
  const contextRegionKey = useActiveRegion();
  const regionKey = contextRegionKey || session?.user?.regionKey || null;

  const [activeCategory, setActiveCategory] = useState<NewsCategory>('for-you');
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<NewsItemContract[]>(initialData?.items ?? []);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);
  const [regionLabel, setRegionLabel] = useState<string | null>(initialData?.regionLabel ?? null);

  useEffect(() => {
    if (initialData && initialData.regionKey === regionKey) {
      setItems(initialData.items);
      setRegionLabel(initialData.regionLabel);
      setLoading(false);
      return;
    }

    let ignore = false;
    setLoading(true);
    setError(null);

    const fetchNews = async () => {
      try {
        const params = new URLSearchParams();
        if (regionKey) params.set('region', regionKey);
        if (activeCategory !== 'for-you') params.set('category', activeCategory);
        if (search.trim()) params.set('q', search.trim());

        const response = await fetch(`/api/news?${params.toString()}`, { cache: 'no-store' });
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(payload?.error ?? 'Não foi possível carregar as notícias.');
        }

        if (!ignore) {
          setItems(payload.items ?? []);
          setRegionLabel(payload.regionLabel ?? null);
        }
      } catch (err) {
        console.error('Failed to load news:', err);
        if (!ignore) {
          setError('Não foi possível carregar as notícias agora. Tente novamente em instantes.');
          setItems([]);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    void fetchNews();

    return () => {
      ignore = true;
    };
  }, [activeCategory, initialData, regionKey, search]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(query) ||
        (item.description ?? '').toLowerCase().includes(query) ||
        item.source.toLowerCase().includes(query),
    );
  }, [items, search]);

  const featured = filteredItems[0] ?? null;
  const rest = filteredItems.slice(1);

  const handleSearch = (value: string) => {
    setSearch(value);
  };

  return (
    <ContentColumn size="feed" className="px-5 pb-20 pt-2">
      <PageHeader title={t('news.title')} backHref="/inicio" />

      <div className="mt-4 space-y-4">
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(event) => handleSearch(event.target.value)}
            placeholder={t('news.search')}
            aria-label="Buscar notícias"
            className="w-full rounded-2xl border border-slate-100 bg-white py-3.5 pl-12 pr-4 text-sm shadow-sm focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        </div>

        <SectionTabs
          options={CATEGORY_TABS}
          value={activeCategory}
          onChange={(id) => setActiveCategory(id as NewsCategory)}
          ariaLabel="Categorias de notícias"
        />

        {regionLabel ? (
          <p className="text-xs font-medium text-slate-500">
            {t('news.region')} <span className="font-bold text-brand-600">{regionLabel}</span>
          </p>
        ) : null}
      </div>

      {loading ? (
        <div className="mt-6 space-y-4">
          <Skeleton className="h-48 w-full" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton.Card />
            <Skeleton.Card />
            <Skeleton.Card />
            <Skeleton.Card />
          </div>
        </div>
      ) : error ? (
        <div className="mt-6">
          <EmptyState
            icon={<Newspaper size={28} />}
            title="Notícias indisponíveis"
            description={error}
          />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={<Newspaper size={28} />}
            title="Nenhuma notícia encontrada"
            description="Tente outra busca ou categoria. As notícias são atualizadas ao longo do dia."
          />
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {filteredItems.length > 1 ? (
            <div>
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">{t('news.trending')}</h2>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {filteredItems.slice(0, 6).map((item, index) => (
                  <a
                    key={item.id}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group w-40 shrink-0 overflow-hidden rounded-card bg-white shadow-sm transition hover:shadow-md"
                  >
                    <div className="relative flex aspect-[4/3] w-full items-center justify-center bg-gradient-to-br from-brand-50 to-slate-100">
                      {item.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover" loading="lazy" />
                      ) : (
                        <Newspaper className="text-brand-300" size={24} />
                      )}
                      <span className="absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900/70 text-[11px] font-bold text-white">
                        {index + 1}
                      </span>
                    </div>
                    <div className="p-2.5">
                      <p className="line-clamp-2 text-xs font-semibold leading-snug text-slate-700 group-hover:text-brand-700">
                        {item.title}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          ) : null}

          {featured ? (
            <a
              href={featured.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group block overflow-hidden rounded-card bg-white shadow-sm transition hover:shadow-md"
            >
              <div className="flex aspect-[16/9] w-full items-center justify-center bg-gradient-to-br from-brand-50 to-slate-100">
                <Newspaper className="text-brand-300" size={40} />
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 text-[11px] font-bold text-brand-600">
                  <span className="rounded-full bg-brand-50 px-2 py-0.5">{t('news.featured')}</span>
                  <span>{featured.source}</span>
                  {featured.language === 'en' ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-slate-500">
                      <Globe size={10} /> EN
                    </span>
                  ) : null}
                </div>
                <h2 className="mt-2 text-lg font-bold leading-snug text-foreground group-hover:text-brand-700">
                  {featured.title}
                </h2>
                {featured.description ? (
                  <p className="mt-1 line-clamp-2 text-sm text-slate-500">{featured.description}</p>
                ) : null}
                <div className="mt-3 flex items-center gap-1 text-xs text-slate-400">
                  <Clock size={12} />
                  {formatRelativeTime(featured.publishedAt)}
                  <span className="ml-auto inline-flex items-center gap-1 font-semibold text-brand-600">
                    {t('news.read')} <ExternalLink size={12} />
                  </span>
                </div>
              </div>
            </a>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((item) => (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col overflow-hidden rounded-card bg-white p-4 shadow-sm transition hover:shadow-md"
              >
                <div className="flex items-center gap-2 text-[11px] font-bold text-brand-600">
                  <span className="truncate">{item.source}</span>
                  {item.language === 'en' ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-slate-500">
                      <Globe size={10} /> EN
                    </span>
                  ) : null}
                </div>
                <h3 className="mt-2 line-clamp-3 text-sm font-bold leading-snug text-foreground group-hover:text-brand-700">
                  {item.title}
                </h3>
                {item.description ? (
                  <p className="mt-1 line-clamp-2 text-xs text-slate-500">{item.description}</p>
                ) : null}
                <div className="mt-auto flex items-center gap-1 pt-3 text-xs text-slate-400">
                  <Clock size={12} />
                  {formatRelativeTime(item.publishedAt)}
                </div>
              </a>
            ))}
          </div>

          <p className="pt-2 text-center text-[11px] text-slate-400">
            As notícias abrem no site original do publicador. Conteúdo agregado apenas como referência.
          </p>
        </div>
      )}
    </ContentColumn>
  );
};

export default NewsList;
