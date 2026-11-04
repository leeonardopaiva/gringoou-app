'use client';

import React, { startTransition, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Plus, Search, ShoppingBag, X } from 'lucide-react';
import PageHeader from '../components/navigation/PageHeader';
import { MarketplaceCard } from '../components/marketplace/MarketplaceCard';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { SectionTabs } from '../components/ui/SectionTabs';
import { FilterPopover } from '../components/ui/FilterPopover';
import { Pagination } from '../components/ui/Pagination';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { useToast } from '../components/feedback/ToastProvider';
import CloudinaryImageField from '../components/forms/CloudinaryImageField';
import ImageGalleryField from '../components/forms/ImageGalleryField';
import FieldErrorMessage from '../components/forms/FieldErrorMessage';
import { useActiveRegion } from '../components/RegionContext';
import { ContentColumn } from '../components/ui/ContentColumn';
import AddressAutocomplete from '../components/ui/AddressAutocomplete';
import type { User } from '../types';
import type { MarketplaceInitialData, MarketplaceItemContract } from '../lib/content-contracts';
import {
  type FieldErrors,
  hasFieldErrors,
  normalizeUrlFieldValue,
  requiredFieldError,
  validateOptionalUrlField,
} from '../lib/forms/validation';

const CATEGORIES = [
  'Eletrônicos',
  'Móveis',
  'Eletrodomésticos',
  'Roupas',
  'Brinquedos',
  'Esportes',
  'Livros',
  'Ferramentas',
  'Automóveis',
  'Outros',
];

const CONDITIONS = [
  { id: 'NEW', label: 'Novo' },
  { id: 'LIKE_NEW', label: 'Como novo' },
  { id: 'GOOD', label: 'Bom' },
  { id: 'FAIR', label: 'Regular' },
  { id: 'POOR', label: 'Ruim' },
];

const SCOPE_TABS = [
  { id: 'all', label: 'Todos' },
  { id: 'mine', label: 'Meus anúncios' },
  { id: 'favorites', label: 'Salvos' },
];

const SORT_OPTIONS = [
  { id: 'recent', label: 'Mais recentes' },
  { id: 'price_asc', label: 'Menor preço' },
  { id: 'price_desc', label: 'Maior preço' },
];

const PAGE_SIZE = 24;



const emptyForm = {
  title: '',
  description: '',
  category: 'Outros',
  price: '',
  isFree: false,
  condition: 'GOOD',
  regionKey: '',
  locationLabel: '',
  imageUrl: '',
  galleryUrls: [] as string[],
};

type FormField = 'title' | 'description' | 'category' | 'price' | 'condition' | 'regionKey' | 'locationLabel' | 'imageUrl';

type MarketplaceListProps = {
  user: User;
  initialData?: MarketplaceInitialData;
};

const MarketplaceList: React.FC<MarketplaceListProps> = ({ user, initialData }) => {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const contextRegionKey = useActiveRegion();
  const activeRegionKey = contextRegionKey || session?.user?.regionKey || user.regionKey || '';

  const [scope, setScope] = useState<'all' | 'mine' | 'favorites'>('all');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('recent');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<MarketplaceItemContract[]>(initialData?.items ?? []);
  const [total, setTotal] = useState(initialData?.total ?? 0);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<FormField>>({});
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const initialPageConsumedRef = React.useRef(false);

  useEffect(() => {
    if (searchParams?.get('create') === '1') {
      setShowCreate(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (activeRegionKey) {
      setForm((current) => (current.regionKey ? current : { ...current, regionKey: activeRegionKey }));
    }
  }, [activeRegionKey]);

  const fetchItems = React.useCallback(
    async (nextPage = page) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (activeRegionKey) params.set('region', activeRegionKey);
        if (scope !== 'all') params.set('scope', scope);
        if (search.trim()) params.set('q', search.trim());
        if (category) params.set('category', category);
        if (sort !== 'recent') params.set('sort', sort);
        if (minPrice) params.set('minPrice', String(Number(minPrice) * 100));
        if (maxPrice) params.set('maxPrice', String(Number(maxPrice) * 100));
        params.set('page', String(nextPage));

        const response = await fetch(`/api/marketplace?${params.toString()}`, { cache: 'no-store' });
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(payload?.error ?? 'Não foi possível carregar os anúncios.');
        }

        startTransition(() => {
          setItems(payload.items ?? []);
          setTotal(payload.total ?? 0);
        });
      } catch (err) {
        console.error('Failed to load marketplace:', err);
        setError('Não foi possível carregar os anúncios agora.');
        setItems([]);
      } finally {
        setLoading(false);
      }
    },
    [activeRegionKey, category, maxPrice, minPrice, page, scope, search, sort],
  );

  useEffect(() => {
    if (!initialPageConsumedRef.current && initialData?.regionKey === activeRegionKey && page === 1) {
      initialPageConsumedRef.current = true;
      return;
    }
    void fetchItems();
  }, [activeRegionKey, category, fetchItems, initialData?.regionKey, maxPrice, minPrice, page, scope, search, sort]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const clearFieldError = (field: FormField) => {
    setFieldErrors((current) => {
      if (!current[field]) return current;
      return { ...current, [field]: undefined };
    });
  };

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors: FieldErrors<FormField> = {};
    if (!form.title.trim()) nextErrors.title = requiredFieldError('o título');
    if (!form.description.trim()) nextErrors.description = requiredFieldError('a descrição');
    if (!form.regionKey.trim()) nextErrors.regionKey = requiredFieldError('uma região');
    if (!form.isFree && !form.price.trim()) nextErrors.price = requiredFieldError('o preço');

    const imageUrlError = validateOptionalUrlField(form.imageUrl, 'O link da imagem');
    if (imageUrlError) nextErrors.imageUrl = imageUrlError;

    setFieldErrors(nextErrors);
    if (hasFieldErrors(nextErrors)) return;

    setSubmitting(true);
    try {
      const response = await fetch('/api/marketplace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          category: form.category,
          priceCents: form.isFree ? null : Math.round(Number(form.price) * 100),
          isFree: form.isFree,
          condition: form.condition,
          regionKey: form.regionKey,
          locationLabel: form.locationLabel,
          imageUrl: normalizeUrlFieldValue(form.imageUrl),
          galleryUrls: form.galleryUrls,
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        showToast(payload?.error ?? 'Não foi possível publicar o anúncio.', 'error');
        return;
      }

      showToast('Seu anúncio foi enviado para aprovação.', 'success');
      setForm(emptyForm);
      setShowCreate(false);
      setPage(1);
      setScope('mine');
      void fetchItems(1);
    } catch (err) {
      console.error('Failed to create listing:', err);
      showToast('Não foi possível publicar o anúncio.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleFavorite = async (id: string) => {
    setTogglingId(id);
    try {
      const response = await fetch(`/api/marketplace/${id}/favorite`, { method: 'POST' });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        showToast(payload?.error ?? 'Não foi possível salvar.', 'error');
        return;
      }
      setItems((current) =>
        current.map((item) => (item.id === id ? { ...item, isFavorite: payload.isFavorite } : item)),
      );
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
      showToast('Não foi possível salvar.', 'error');
    } finally {
      setTogglingId(null);
    }
  };

  const filteredCount = useMemo(() => items.length, [items]);

  const activeFilters = useMemo(() => {
    const filters: { id: string; label: string; onClear: () => void }[] = [];
    if (search.trim()) {
      filters.push({ id: 'search', label: `Busca: ${search.trim()}`, onClear: () => { setSearch(''); setPage(1); } });
    }
    if (category) {
      filters.push({ id: 'category', label: category, onClear: () => { setCategory(''); setPage(1); } });
    }
    if (minPrice) {
      filters.push({ id: 'minPrice', label: `Min: US$ ${minPrice}`, onClear: () => { setMinPrice(''); setPage(1); } });
    }
    if (maxPrice) {
      filters.push({ id: 'maxPrice', label: `Máx: US$ ${maxPrice}`, onClear: () => { setMaxPrice(''); setPage(1); } });
    }
    const activeSortLabel = SORT_OPTIONS.find((option) => option.id === sort)?.label;
    if (sort !== 'recent' && activeSortLabel) {
      filters.push({ id: 'sort', label: activeSortLabel, onClear: () => { setSort('recent'); setPage(1); } });
    }
    return filters;
  }, [category, maxPrice, minPrice, search, sort]);

  return (
    <ContentColumn size="wide" className="px-5 pb-20 pt-2">
      <PageHeader
        title="Marketplace"
        backHref="/inicio"
        action={
          <Button size="sm" iconLeft={<Plus size={16} />} onClick={() => setShowCreate(true)}>
            Anunciar
          </Button>
        }
      />

      <div className="mt-4 space-y-4">
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <input
              type="text"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Buscar anúncios..."
              aria-label="Buscar anúncios"
              className="w-full rounded-full border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm shadow-sm focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          </div>
          <FilterPopover label="Filtros" triggerClassName="h-11 shrink-0">
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-600">Categoria</label>
                <select
                  value={category}
                  onChange={(event) => {
                    setCategory(event.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  <option value="">Todas</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-600">Ordenar por</label>
                <select
                  value={sort}
                  onChange={(event) => {
                    setSort(event.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-600">Preço mín. (US$)</label>
                  <input
                    type="number"
                    min="0"
                    value={minPrice}
                    onChange={(event) => {
                      setMinPrice(event.target.value);
                      setPage(1);
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-600">Preço máx. (US$)</label>
                  <input
                    type="number"
                    min="0"
                    value={maxPrice}
                    onChange={(event) => {
                      setMaxPrice(event.target.value);
                      setPage(1);
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>
          </FilterPopover>
        </div>

        <SectionTabs
          options={SCOPE_TABS}
          value={scope}
          onChange={(id) => {
            setScope(id as 'all' | 'mine' | 'favorites');
            setPage(1);
          }}
          ariaLabel="Filtro de anúncios"
        />

        

        {activeFilters.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2" aria-label="Filtros ativos">
            {activeFilters.map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={filter.onClear}
                aria-label={`Remover filtro: ${filter.label}`}
                className="inline-flex h-8 items-center gap-1.5 rounded-full border border-slate-200 bg-white pl-3 pr-2.5 text-xs font-semibold text-slate-600 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
              >
                {filter.label}
                <X size={13} aria-hidden />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {loading ? (
        <div className="mt-5 grid grid-cols-1 gap-x-4 gap-y-6 min-[420px]:grid-cols-2 lg:grid-cols-3 lg:gap-x-5">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="min-w-0">
              <Skeleton className="aspect-[4/3] w-full rounded-2xl" />
              <Skeleton className="mt-3 h-4 w-1/3 rounded-full" />
              <Skeleton className="mt-2 h-4 w-3/4 rounded-full" />
              <Skeleton className="mt-2 h-3 w-1/2 rounded-full" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="mt-6">
          <EmptyState icon={<ShoppingBag size={28} />} title="Anúncios indisponíveis" description={error} />
        </div>
      ) : filteredCount === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={<ShoppingBag size={28} />}
            title="Nenhum anúncio encontrado"
            description="Ajuste os filtros ou publique o primeiro anúncio da sua região."
            action={
              <Button size="sm" iconLeft={<Plus size={16} />} onClick={() => setShowCreate(true)}>
                Anunciar
              </Button>
            }
          />
        </div>
      ) : (
        <>
          <p className="mt-5 text-xs font-semibold text-slate-400">
            {total} {total === 1 ? 'anúncio' : 'anúncios'}
          </p>
          <div className="mt-3 grid grid-cols-1 gap-x-4 gap-y-6 min-[420px]:grid-cols-2 lg:grid-cols-3 lg:gap-x-5">
            {items.map((item) => (
              <MarketplaceCard
                key={item.id}
                item={item}
                onToggleFavorite={() => handleToggleFavorite(item.id)}
                favoriteToggling={togglingId === item.id}
              />
            ))}
          </div>

          {totalPages > 1 ? (
            <div className="mt-8 flex justify-center">
              <Pagination page={page} totalPages={totalPages} onChange={setPage} />
            </div>
          ) : null}
        </>
      )}

      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Publicar anúncio"
        description="Preencha os dados do item. Anúncios passam por aprovação antes de ficarem visíveis."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowCreate(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="marketplace-create-form" loading={submitting}>
              Publicar
            </Button>
          </div>
        }
      >
        <form id="marketplace-create-form" onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">Título</label>
            <Input
              value={form.title}
              onChange={(event) => {
                setForm((current) => ({ ...current, title: event.target.value }));
                clearFieldError('title');
              }}
              state={fieldErrors.title ? 'error' : 'default'}
              helperText={fieldErrors.title}
              placeholder="Ex.: Sofá 3 lugares"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">Descrição</label>
            <textarea
              value={form.description}
              onChange={(event) => {
                setForm((current) => ({ ...current, description: event.target.value }));
                clearFieldError('description');
              }}
              rows={4}
              placeholder="Descreva o item, estado e detalhes relevantes."
              className="w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-sm focus:border-brand-500 focus:outline-none"
            />
            {fieldErrors.description ? <FieldErrorMessage message={fieldErrors.description} /> : null}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">Categoria</label>
              <select
                value={form.category}
                onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                className="w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2.5 text-sm"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">Condição</label>
              <select
                value={form.condition}
                onChange={(event) => setForm((current) => ({ ...current, condition: event.target.value }))}
                className="w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2.5 text-sm"
              >
                {CONDITIONS.map((condition) => (
                  <option key={condition.id} value={condition.id}>
                    {condition.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={form.isFree}
                onChange={(event) => {
                  setForm((current) => ({ ...current, isFree: event.target.checked }));
                  clearFieldError('price');
                }}
                className="h-4 w-4 rounded border-slate-300 text-brand-500"
              />
              Grátis / Doação
            </label>
            {!form.isFree ? (
              <div className="flex-1">
                <label className="mb-1 block text-xs font-bold text-slate-600">Preço (US$)</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(event) => {
                    setForm((current) => ({ ...current, price: event.target.value }));
                    clearFieldError('price');
                  }}
                  state={fieldErrors.price ? 'error' : 'default'}
                  helperText={fieldErrors.price}
                  placeholder="0.00"
                />
              </div>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">Localização</label>
            <AddressAutocomplete
              value={form.locationLabel}
              onChange={(value) => setForm((current) => ({ ...current, locationLabel: value }))}
              placeholder="Bairro, cidade ou endereço"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">Imagem principal</label>
            <CloudinaryImageField
              value={form.imageUrl}
              onChange={(value) => {
                setForm((current) => ({ ...current, imageUrl: value }));
                clearFieldError('imageUrl');
              }}
              folder="marketplace"
              error={fieldErrors.imageUrl}
              onClearError={() => clearFieldError('imageUrl')}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">Galeria</label>
            <ImageGalleryField
              value={form.galleryUrls}
              onChange={(value) => setForm((current) => ({ ...current, galleryUrls: value }))}
              folder="marketplace"
              maxItems={8}
            />
          </div>
        </form>
      </Modal>
    </ContentColumn>
  );
};

export default MarketplaceList;