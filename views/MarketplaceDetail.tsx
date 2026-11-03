'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ChevronLeft, ChevronRight, Heart, MapPin, Share2, ShoppingBag, Trash2, User as UserIcon } from 'lucide-react';
import PageHeader from '../components/navigation/PageHeader';
import { ContentColumn } from '../components/ui/ContentColumn';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../components/feedback/ToastProvider';
import { useActiveRegion } from '../components/RegionContext';
import type { User } from '../types';
import type { MarketplaceItemContract } from '../lib/content-contracts';

const CONDITION_LABELS: Record<string, string> = {
  NEW: 'Novo',
  LIKE_NEW: 'Como novo',
  GOOD: 'Bom',
  FAIR: 'Regular',
  POOR: 'Ruim',
};

const formatPrice = (priceCents: number | null, isFree: boolean) => {
  if (isFree || priceCents == null || priceCents === 0) return 'Grátis';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(priceCents / 100);
};

type MarketplaceDetailProps = {
  itemId: string;
  user: User;
};

const MarketplaceDetail: React.FC<MarketplaceDetailProps> = ({ itemId, user }) => {
  const { data: session } = useSession();
  const router = useRouter();
  const { showToast } = useToast();
  const contextRegionKey = useActiveRegion();
  const activeRegionKey = contextRegionKey || session?.user?.regionKey || user.regionKey || '';

  const [item, setItem] = useState<MarketplaceItemContract | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState(0);
  const [suggestions, setSuggestions] = useState<MarketplaceItemContract[]>([]);
  const [togglingFavorite, setTogglingFavorite] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const gallery = item ? [item.imageUrl, ...item.galleryUrls].filter((url): url is string => Boolean(url)) : [];
  const currentImage = gallery[activeImage] ?? null;

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError(null);

    const load = async () => {
      try {
        const response = await fetch(`/api/marketplace/${itemId}`, { cache: 'no-store' });
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(payload?.error ?? 'Anúncio não encontrado.');
        }

        if (!ignore) {
          setItem(payload.item);
          setActiveImage(0);
        }
      } catch (err) {
        console.error('Failed to load listing:', err);
        if (!ignore) setError('Não foi possível carregar o anúncio.');
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    void load();
    return () => {
      ignore = true;
    };
  }, [itemId]);

  useEffect(() => {
    if (!item || !activeRegionKey) return;
    let ignore = false;

    const loadSuggestions = async () => {
      try {
        const params = new URLSearchParams();
        params.set('region', activeRegionKey);
        if (item.category) params.set('category', item.category);
        const response = await fetch(`/api/marketplace?${params.toString()}`, { cache: 'no-store' });
        const payload = await response.json().catch(() => null);
        if (!ignore) {
          setSuggestions((payload?.items ?? []).filter((s: MarketplaceItemContract) => s.id !== item.id).slice(0, 6));
        }
      } catch {
        if (!ignore) setSuggestions([]);
      }
    };

    void loadSuggestions();
    return () => {
      ignore = true;
    };
  }, [activeRegionKey, item]);

  const handleToggleFavorite = async () => {
    if (!item) return;
    setTogglingFavorite(true);
    try {
      const response = await fetch(`/api/marketplace/${item.id}/favorite`, { method: 'POST' });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        showToast(payload?.error ?? 'Não foi possível salvar.', 'error');
        return;
      }
      setItem((current) => (current ? { ...current, isFavorite: payload.isFavorite } : current));
    } catch {
      showToast('Não foi possível salvar.', 'error');
    } finally {
      setTogglingFavorite(false);
    }
  };

  const handleShare = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    try {
      if (navigator.share) {
        await navigator.share({ title: item?.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        showToast('Link copiado.', 'success');
      }
    } catch {
      showToast('Não foi possível compartilhar.', 'error');
    }
  };

  const handleDelete = async () => {
    if (!item) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/marketplace/${item.id}`, { method: 'DELETE' });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        showToast(payload?.error ?? 'Não foi possível excluir.', 'error');
        return;
      }
      showToast('Anúncio removido.', 'success');
      router.push('/marketplace');
    } catch {
      showToast('Não foi possível excluir.', 'error');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleStatusChange = async (status: 'SOLD' | 'UNAVAILABLE' | 'ACTIVE') => {
    if (!item) return;
    try {
      const response = await fetch(`/api/marketplace/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        showToast(payload?.error ?? 'Não foi possível atualizar.', 'error');
        return;
      }
      setItem(payload.item);
      showToast(status === 'SOLD' ? 'Anúncio marcado como vendido.' : status === 'UNAVAILABLE' ? 'Anúncio marcado como indisponível.' : 'Anúncio reativado.', 'success');
    } catch {
      showToast('Não foi possível atualizar.', 'error');
    }
  };

  if (loading) {
    return (
      <ContentColumn size="feed" className="px-5 pb-20 pt-2">
        <PageHeader title="Anúncio" backHref="/marketplace" />
        <div className="mt-4 space-y-4">
          <Skeleton className="aspect-[4/3] w-full" />
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </ContentColumn>
    );
  }

  if (error || !item) {
    return (
      <ContentColumn size="feed" className="px-5 pb-20 pt-2">
        <PageHeader title="Anúncio" backHref="/marketplace" />
        <div className="mt-6">
          <EmptyState icon={<ShoppingBag size={28} />} title="Anúncio indisponível" description={error ?? 'Este anúncio não está mais disponível.'} />
        </div>
      </ContentColumn>
    );
  }

  const sellerProfilePath = item.sellerUsername ? `/perfil/${encodeURIComponent(item.sellerUsername)}` : null;

  return (
    <ContentColumn size="feed" className="px-5 pb-20 pt-2">
      <PageHeader title="Anúncio" backHref="/marketplace" />

      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-card bg-slate-100">
            <div className="flex aspect-[4/3] w-full items-center justify-center">
              {currentImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={currentImage} alt={item.title} className="h-full w-full object-cover" />
              ) : (
                <ShoppingBag className="text-brand-300" size={48} />
              )}
            </div>
            {gallery.length > 1 ? (
              <>
                <button
                  type="button"
                  onClick={() => setActiveImage((current) => (current - 1 + gallery.length) % gallery.length)}
                  aria-label="Imagem anterior"
                  className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-sm"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveImage((current) => (current + 1) % gallery.length)}
                  aria-label="Próxima imagem"
                  className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-sm"
                >
                  <ChevronRight size={18} />
                </button>
              </>
            ) : null}
            {item.status === 'SOLD' ? (
              <span className="absolute left-3 top-3 rounded-full bg-slate-900/80 px-3 py-1 text-xs font-bold text-white">
                Vendido
              </span>
            ) : null}
          </div>

          {gallery.length > 1 ? (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {gallery.map((url, index) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => setActiveImage(index)}
                  aria-label={`Imagem ${index + 1}`}
                  className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 ${index === activeImage ? 'border-brand-500' : 'border-transparent'}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          ) : null}

          <div className="rounded-card bg-white p-4 shadow-sm">
            <h2 className="text-lg font-bold text-foreground">Descrição</h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-600">{item.description}</p>
          </div>

          {suggestions.length > 0 ? (
            <div>
              <h2 className="mb-3 text-base font-bold text-foreground">Mais anúncios perto de você</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {suggestions.map((suggestion) => (
                  <Link
                    key={suggestion.id}
                    href={suggestion.publicPath}
                    className="group overflow-hidden rounded-card bg-white shadow-sm transition hover:shadow-md"
                  >
                    <div className="flex aspect-[4/3] w-full items-center justify-center bg-gradient-to-br from-brand-50 to-slate-100">
                      {suggestion.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={suggestion.imageUrl} alt={suggestion.title} className="h-full w-full object-cover" loading="lazy" />
                      ) : (
                        <ShoppingBag className="text-brand-300" size={28} />
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-bold text-foreground">{formatPrice(suggestion.priceCents, suggestion.isFree)}</p>
                      <h3 className="mt-0.5 line-clamp-2 text-sm font-semibold text-slate-700">{suggestion.title}</h3>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <div className="rounded-card bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-2xl font-bold text-foreground">{formatPrice(item.priceCents, item.isFree)}</p>
                <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                  <MapPin size={12} /> {item.locationLabel}
                </p>
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={handleToggleFavorite}
                  disabled={togglingFavorite}
                  aria-label={item.isFavorite ? 'Remover dos salvos' : 'Salvar anúncio'}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  <Heart size={17} className={item.isFavorite ? 'fill-red-500 text-red-500' : ''} />
                </button>
                <button
                  type="button"
                  onClick={handleShare}
                  aria-label="Compartilhar anúncio"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50"
                >
                  <Share2 size={17} />
                </button>
              </div>
            </div>

            <h1 className="mt-3 text-lg font-bold leading-snug text-foreground">{item.title}</h1>

            <div className="mt-3 flex flex-wrap gap-2">
              <Badge tone="neutro">{item.category}</Badge>
              <Badge tone="primary" variant="outline">
                {CONDITION_LABELS[item.condition] ?? item.condition}
              </Badge>
            </div>

            {item.canEdit ? (
              <div className="mt-4 space-y-2">
                {item.status === 'ACTIVE' ? (
                  <div className="grid grid-cols-2 gap-2">
                    <Button size="sm" variant="secondary" onClick={() => handleStatusChange('SOLD')}>
                      Marcar vendido
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleStatusChange('UNAVAILABLE')}>
                      Indisponível
                    </Button>
                  </div>
                ) : (
                  <Button size="sm" variant="secondary" fullWidth onClick={() => handleStatusChange('ACTIVE')}>
                    Reativar anúncio
                  </Button>
                )}
                <Button size="sm" variant="destructive" fullWidth iconLeft={<Trash2 size={15} />} onClick={() => setShowDeleteConfirm(true)}>
                  Excluir anúncio
                </Button>
              </div>
            ) : (
              <div className="mt-4">
                {sellerProfilePath ? (
                  <Link href={sellerProfilePath} className="block">
                    <Button size="md" fullWidth iconLeft={<UserIcon size={16} />}>
                      Contatar anunciante
                    </Button>
                  </Link>
                ) : (
                  <Button size="md" fullWidth disabled>
                    Contatar anunciante
                  </Button>
                )}
                <p className="mt-2 text-center text-[11px] text-slate-400">
                  O contato é feito pelo perfil público do anunciante.
                </p>
              </div>
            )}
          </div>

          <div className="rounded-card bg-white p-4 shadow-sm">
            <h2 className="text-sm font-bold text-foreground">Anunciante</h2>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-brand-50">
                {item.sellerImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.sellerImage} alt={item.sellerName ?? 'Anunciante'} className="h-full w-full object-cover" />
                ) : (
                  <UserIcon size={18} className="text-brand-500" />
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{item.sellerName ?? 'Membro da comunidade'}</p>
                {item.sellerUsername ? <p className="truncate text-xs text-slate-400">@{item.sellerUsername}</p> : null}
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-400">
              Localização aproximada: {item.city ? `${item.city}${item.state ? `, ${item.state}` : ''}` : item.locationLabel}
            </p>
          </div>
        </aside>
      </div>

      <Modal
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Excluir anúncio"
        description="Tem certeza que deseja excluir este anúncio? Esta ação não pode ser desfeita."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" loading={deleting} onClick={handleDelete}>
              Excluir
            </Button>
          </div>
        }
      />
    </ContentColumn>
  );
};

export default MarketplaceDetail;