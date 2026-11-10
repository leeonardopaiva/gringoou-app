'use client';

import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ChevronLeft, ChevronRight, Heart, MapPin, Maximize2, MessageCircle, MoreHorizontal, Share2, ShoppingBag, Trash2, User as UserIcon, X, RotateCcw, Edit, Map } from 'lucide-react';
import PageHeader from '../components/navigation/PageHeader';
import { ApproximateAreaMap } from '../components/ui/ApproximateAreaMap';
import { MarketplaceCard, formatPrice, formatRelativeTime } from '../components/marketplace/MarketplaceCard';
import { ContentColumn } from '../components/ui/ContentColumn';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { Modal } from '../components/ui/Modal';
import { Dropdown, DropdownItem, DropdownSection } from '../components/ui/Dropdown';
import { useToast } from '../components/feedback/ToastProvider';
import { useMessaging } from '../lib/MessagingProvider';
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

type MarketplaceDetailProps = {
  itemId: string;
  user: User;
};

const MarketplaceDetail: React.FC<MarketplaceDetailProps> = ({ itemId, user }) => {
  const { data: session } = useSession();
  const router = useRouter();
  const { showToast } = useToast();
  const { startConversation } = useMessaging();
  const contextRegionKey = useActiveRegion();
  const activeRegionKey = contextRegionKey || session?.user?.regionKey || user.regionKey || '';

  const [item, setItem] = useState<MarketplaceItemContract | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState(0);
  const [suggestions, setSuggestions] = useState<MarketplaceItemContract[]>([]);
  const [togglingFavorite, setTogglingFavorite] = useState(false);
  const [contacting, setContacting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

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

  useEffect(() => {
    if (!lightboxOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLightboxOpen(false);
      if (event.key === 'ArrowLeft') setActiveImage((current) => (current - 1 + gallery.length) % gallery.length);
      if (event.key === 'ArrowRight') setActiveImage((current) => (current + 1) % gallery.length);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [gallery.length, lightboxOpen]);

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

  const handleContactSeller = async () => {
    if (!item) return;
    setContacting(true);
    const contactError = await startConversation(item.id, item.sellerUsername, `Olá! Tenho interesse no anúncio "${item.title}".`);
    if (contactError) showToast(contactError, 'error');
    setContacting(false);
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
      <ContentColumn size="wide" className="pb-20 pt-2">
        <PageHeader title="Anúncio" backHref="/marketplace" />
        <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4">
            <Skeleton className="aspect-[4/3] w-full rounded-2xl sm:aspect-[16/10]" />
            <Skeleton className="h-4 w-1/2 rounded-full" />
            <Skeleton className="h-4 w-3/4 rounded-full" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-8 w-1/3 rounded-full" />
            <Skeleton className="h-4 w-full rounded-full" />
            <Skeleton className="h-4 w-5/6 rounded-full" />
            <Skeleton className="h-11 w-full rounded-full" />
          </div>
        </div>
      </ContentColumn>
    );
  }

  if (error || !item) {
    return (
      <ContentColumn size="wide" className="pb-20 pt-2">
        <PageHeader title="Anúncio" backHref="/marketplace" />
        <div className="mt-6">
          <EmptyState icon={<ShoppingBag size={28} />} title="Anúncio indisponível" description={error ?? 'Este anúncio não está mais disponível.'} />
        </div>
      </ContentColumn>
    );
  }

  const sellerLocation = item.city ? `${item.city}${item.state ? `, ${item.state}` : ''}` : item.locationLabel;

  // Largura total (size="wide") no desktop é INTENCIONAL: melhor exibição da galeria e dos itens. Não padronizar.
  return (
    <ContentColumn size="wide" className="pb-24 pt-2">
      <PageHeader title="Anúncio" backHref="/marketplace" />

      <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        {/* Galeria */}
        <section className="min-w-0" aria-label="Galeria de imagens">
          <div className="relative overflow-hidden rounded-2xl bg-slate-100">
            <div className="aspect-[4/3] w-full sm:aspect-[16/10]">
              {currentImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentImage}
                  alt={item.title}
                  onClick={() => setLightboxOpen(true)}
                  className="h-full w-full cursor-zoom-in object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <ShoppingBag size={48} className="text-slate-300" />
                </div>
              )}
            </div>
            {gallery.length > 1 ? (
              <>
                <button
                  type="button"
                  onClick={() => setActiveImage((current) => (current - 1 + gallery.length) % gallery.length)}
                  aria-label="Imagem anterior"
                  className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur transition hover:bg-white"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveImage((current) => (current + 1) % gallery.length)}
                  aria-label="Próxima imagem"
                  className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur transition hover:bg-white"
                >
                  <ChevronRight size={18} />
                </button>
                <span className="absolute bottom-3 left-3 rounded-full bg-slate-900/60 px-2.5 py-1 text-[11px] font-bold text-white">
                  {activeImage + 1} / {gallery.length}
                </span>
              </>
            ) : null}
            {item.status === 'SOLD' ? (
              <span className="absolute left-3 top-3 rounded-full bg-slate-900/80 px-3 py-1 text-xs font-bold text-white">
                Vendido
              </span>
            ) : null}
            {currentImage ? (
              <button
                type="button"
                onClick={() => setLightboxOpen(true)}
                aria-label="Ampliar imagem"
                className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur transition hover:bg-white"
              >
                <Maximize2 size={16} />
              </button>
            ) : null}
          </div>

          {gallery.length > 1 ? (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {gallery.map((url, index) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => setActiveImage(index)}
                  aria-label={`Ir para imagem ${index + 1}`}
                  className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition ${
                    index === activeImage ? 'border-brand-500' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          ) : null}
        </section>

      {/* Painel de informações */}
        <aside className="min-w-0 lg:sticky lg:top-4 lg:self-start">
          <div className="rounded-2xl border border-slate-100 bg-white p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className={item.isFree ? 'text-2xl font-bold text-emerald-600' : 'text-2xl font-bold text-text'}>
                {formatPrice(item.priceCents, item.isFree)}
              </p>
            </div>
            <div className="flex shrink-0 gap-1.5">
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
              {item.canEdit ? (
                <Dropdown
                  trigger={
                    <span
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50"
                    >
                      <MoreHorizontal size={17} />
                      <span className="sr-only">Mais opções</span>
                    </span>
                  }
                  sections={[
                    {
                      items: [
                        {
                          label: 'Editar anúncio',
                          icon: <Edit size={14} />,
                          onClick: () => router.push(`/marketplace/${item.id}/editar`),
                        },
                        {
                          label: 'Excluir anúncio',
                          icon: <Trash2 size={14} />,
                          onClick: () => setShowDeleteConfirm(true),
                          destructive: true,
                        },
                        ...(item.status === 'SOLD' || item.status === 'UNAVAILABLE' ? [{
                          label: 'Reativar anúncio',
                          icon: <RotateCcw size={14} />,
                          onClick: () => handleStatusChange('ACTIVE'),
                        }] : []),
                      ],
                    },
                  ]}
                  align="right"
                />
              ) : null}
            </div>
          </div>
          <div className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-400">
            <MapPin size={13} className="shrink-0" aria-hidden />
            <span className="truncate">{item.locationLabel}</span>
            <span aria-hidden>·</span>
            <span className="shrink-0">{formatRelativeTime(item.createdAt)}</span>
          </div>

            <h1 className="mt-3 break-words text-lg font-bold leading-snug text-text">{item.title}</h1>

            <div className="mt-3 flex flex-wrap gap-2">
              <Badge tone="neutro">{item.category}</Badge>
              <Badge tone="primary" variant="outline">
                {CONDITION_LABELS[item.condition] ?? item.condition}
              </Badge>
              {item.status === 'SOLD' ? <Badge tone="erro">Vendido</Badge> : null}
              {item.status === 'PENDING_REVIEW' ? <Badge tone="neutro">Em análise</Badge> : null}
              {item.status === 'REJECTED' ? <Badge tone="erro">Rejeitado</Badge> : null}
              {item.status === 'REMOVED' ? <Badge tone="erro">Removido</Badge> : null}
            </div>

            {item.canEdit && (item.status === 'REJECTED' || item.status === 'REMOVED') ? (
              <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
                {item.status === 'REJECTED' ? 'Anúncio rejeitado pela moderação.' : 'Anúncio removido pela moderação.'}
                {item.moderationReason ? <span className="mt-1 block font-medium">Motivo: {item.moderationReason}</span> : null}
                {item.status === 'REJECTED' ? <span className="mt-1 block text-xs">Edite o anúncio para reenviá-lo à revisão.</span> : null}
              </p>
            ) : null}

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
                  <div className="flex gap-2">
                    {item.status === 'SOLD' || item.status === 'UNAVAILABLE' ? (
                    <Button size="sm" variant="secondary" iconLeft={<RotateCcw size={14} />} onClick={() => handleStatusChange('ACTIVE')}>
                      Reativar
                    </Button>
                    ) : null}
                    <Dropdown
                      trigger={
                        <span className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100">
                          <MoreHorizontal size={14} />
                          <span className="sr-only">Mais opções</span>
                        </span>
                      }
                      sections={[
                        {
                          items: [
                            {
                              label: 'Excluir anúncio',
                              icon: <Trash2 size={14} />,
                              onClick: () => setShowDeleteConfirm(true),
                              destructive: true,
                            },
                          ],
                        },
                      ]}
                      align="right"
                    />
                  </div>
                )}
              </div>
            ) : null}

            {/* Mensagem: qualquer pessoa pode negociar, inclusive administradores. Só o anunciante não conversa consigo mesmo. */}
            {!item.isOwner ? (
              <div className="mt-4">
                {item.sellerUsername ? (
                  <Button
                    size="md"
                    fullWidth
                    iconLeft={<MessageCircle size={16} />}
                    loading={contacting}
                    onClick={() => void handleContactSeller()}
                  >
                    Enviar Mensagem
                  </Button>
                ) : (
                  <Button size="md" fullWidth disabled>
                    Enviar Mensagem
                  </Button>
                )}
                <p className="mt-2 text-center text-[11px] text-slate-400">
                  A conversa acontece dentro do Gringoou, sem abrir seus contatos.
                </p>
              </div>
            ) : null}

            <div className="mt-5 flex items-center gap-3 border-t border-slate-100 pt-4">
              {(() => {
                const sellerContent = (
                  <>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-50">
                {item.sellerImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.sellerImage} alt={item.sellerName ?? 'Anunciante'} className="h-full w-full object-cover" />
                ) : (
                  <UserIcon size={18} className="text-brand-500" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-text">{item.sellerName ?? 'Membro da comunidade'}</p>
                <p className="truncate text-xs text-slate-400">
                  {item.sellerUsername ? `@${item.sellerUsername} · ` : ''}
                  {item.sellerLocationLabel ?? sellerLocation}
                </p>
              </div>
                  </>
                );
                return item.sellerUsername ? (
                  <Link href={`/${item.sellerUsername}`} aria-label={`Ver perfil de ${item.sellerName ?? item.sellerUsername}`} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl transition hover:opacity-80">
                    {sellerContent}
                  </Link>
                ) : (
                  <div className="flex min-w-0 flex-1 items-center gap-3">{sellerContent}</div>
                );
              })()}
            </div>

            {/* Com coordenadas (já aproximadas pelo servidor): círculo de ~800 m. Sem coordenadas: mapa da região, sem círculo. */}
            <ApproximateAreaMap
              latitude={item.latitude}
              longitude={item.longitude}
              place={sellerLocation}
              label={`Área aproximada: ${sellerLocation}`}
            />

            <div className="mt-5 border-t border-slate-100 pt-4">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Descrição</h2>
              <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-slate-700">{item.description}</p>
            </div>
          </div>
        </aside>

      {/* Sugestões */}
        <section className="min-w-0">
          {suggestions.length > 0 ? (
            <div>
              <h2 className="text-base font-bold text-text">Mais anúncios perto de você</h2>
              <div className="mt-3 grid grid-cols-1 gap-x-4 gap-y-6 min-[420px]:grid-cols-2 lg:grid-cols-3">
                {suggestions.map((suggestion) => (
                  <MarketplaceCard key={suggestion.id} item={suggestion} />
                ))}
              </div>
            </div>
          ) : null}
        </section>
      </div>

      {lightboxOpen && currentImage ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Visualização ampliada do anúncio"
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95"
          onClick={(event) => event.target === event.currentTarget && setLightboxOpen(false)}
        >
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            aria-label="Fechar visualização ampliada"
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
          >
            <X size={20} />
          </button>
          {gallery.length > 1 ? (
            <button
              type="button"
              onClick={() => setActiveImage((current) => (current - 1 + gallery.length) % gallery.length)}
              aria-label="Imagem anterior"
              className="absolute left-2 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:left-6"
            >
              <ChevronLeft size={24} />
            </button>
          ) : null}
          {currentImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={currentImage} alt={item.title} className="max-h-full max-w-full px-4 py-14 object-contain sm:px-12" />
          ) : null}
          {gallery.length > 1 ? (
            <>
              <button
                type="button"
                onClick={() => setActiveImage((current) => (current + 1) % gallery.length)}
                aria-label="Próxima imagem"
                className="absolute right-2 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:right-6"
              >
                <ChevronRight size={24} />
              </button>
              <span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-white">
                {activeImage + 1} / {gallery.length}
              </span>
            </>
          ) : null}
        </div>
      ) : null}

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
