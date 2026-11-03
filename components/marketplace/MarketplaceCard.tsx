'use client';

import React from 'react';
import Link from 'next/link';
import { Heart, MapPin, ShoppingBag } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { MarketplaceItemContract } from '@/lib/content-contracts';

export const formatPrice = (priceCents: number | null, isFree: boolean): string => {
  if (isFree || priceCents == null || priceCents === 0) return 'Grátis';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(priceCents / 100);
};

export const formatRelativeTime = (iso: string): string => {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '';
  const minutes = Math.max(0, Math.floor((Date.now() - then) / 60000));
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `${minutes} min atrás`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h atrás`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} d atrás`;
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
};

export interface MarketplaceCardProps {
  item: MarketplaceItemContract;
  /** Quando presente, exibe o botão de favorito sobre a imagem. */
  onToggleFavorite?: (id: string) => void;
  favoriteToggling?: boolean;
  className?: string;
}

/** Card minimalista de anúncio (imagem, preço, título, local e data) usado na
 *  listagem e nas recomendações do detalhe. */
export const MarketplaceCard: React.FC<MarketplaceCardProps> = ({
  item,
  onToggleFavorite,
  favoriteToggling,
  className,
}) => {
  const showFavorite = Boolean(onToggleFavorite);

  return (
    <div className={cn('relative', className)}>
      <Link href={item.publicPath} className="group block" aria-label={item.title}>
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-slate-100 bg-slate-100">
          {item.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.imageUrl}
              alt={item.title}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <ShoppingBag size={32} className="text-slate-300" />
            </div>
          )}
          {item.status === 'SOLD' ? (
            <span className="absolute left-2 top-2 rounded-full bg-slate-900/75 px-2.5 py-1 text-[10px] font-bold text-white">
              Vendido
            </span>
          ) : null}
          {item.isPendingReview ? (
            <span className="absolute left-2 top-2 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold text-amber-700">
              Em análise
            </span>
          ) : null}
        </div>

        <div className="mt-2.5">
          <p className={cn('text-[15px] font-bold leading-snug', item.isFree ? 'text-emerald-600' : 'text-text')}>
            {formatPrice(item.priceCents, item.isFree)}
          </p>
          <h3 className="mt-0.5 line-clamp-2 text-sm font-medium leading-snug text-slate-800 group-hover:text-brand-600">
            {item.title}
          </h3>
          <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
            <MapPin size={12} className="shrink-0" aria-hidden />
            <span className="truncate">{item.locationLabel}</span>
            <span aria-hidden>·</span>
            <span className="shrink-0">{formatRelativeTime(item.createdAt)}</span>
          </p>
        </div>
      </Link>

      {showFavorite ? (
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            onToggleFavorite?.(item.id);
          }}
          disabled={favoriteToggling}
          aria-label={item.isFavorite ? 'Remover dos salvos' : 'Salvar anúncio'}
          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 disabled:opacity-60"
        >
          <Heart size={16} className={cn('transition-colors', item.isFavorite ? 'fill-red-500 text-red-500' : 'text-slate-500')} />
        </button>
      ) : null}
    </div>
  );
};