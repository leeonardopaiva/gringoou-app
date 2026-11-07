/**
 * Entidade de domínio Marketplace.
 *
 * PURA — sem dependências de React, Next, NextAuth ou Prisma.
 */

export type MarketplaceStatus =
  | 'PENDING_REVIEW'
  | 'ACTIVE'
  | 'SOLD'
  | 'UNAVAILABLE'
  | 'REMOVED'
  | 'REJECTED';

export type MarketplaceCondition = 'NEW' | 'LIKE_NEW' | 'GOOD' | 'FAIR' | 'POOR';

export interface MarketplaceItemEntity {
  id: string;
  title: string;
  description: string;
  category: string;
  priceCents: number | null;
  isFree: boolean;
  condition: MarketplaceCondition;
  locationLabel: string;
  regionKey: string;
  imageUrl: string | null;
  galleryUrls: string[];
  status: MarketplaceStatus;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Item resumido para listagem (já serializado para strings). */
export interface MarketplaceListItem {
  id: string;
  title: string;
  description: string;
  category: string;
  priceCents: number | null;
  isFree: boolean;
  condition: MarketplaceCondition;
  locationLabel: string;
  regionKey: string;
  imageUrl: string | null;
  galleryUrls: string[];
  status: MarketplaceStatus;
  isFavorite: boolean;
  /** Pode editar: dono ou administrador. */
  canEdit: boolean;
  /** É o anunciante (só o dono; administrador NÃO é dono dos anúncios dos outros). */
  isOwner: boolean;
  isPendingReview: boolean;
  /** Motivo da rejeição/remoção — visível apenas para dono e moderadores. */
  moderationReason: string | null;
  publicPath: string;
  createdAt: string;
  sellerName: string | null;
  sellerUsername: string | null;
  sellerImage: string | null;
}

/** Item completo de detalhe (já serializado para strings). */
export interface MarketplaceDetailItem {
  id: string;
  title: string;
  description: string;
  category: string;
  priceCents: number | null;
  isFree: boolean;
  condition: MarketplaceCondition;
  locationLabel: string;
  regionKey: string;
  city: string | null;
  state: string | null;
  imageUrl: string | null;
  galleryUrls: string[];
  status: MarketplaceStatus;
  isFavorite: boolean;
  canEdit: boolean;
  isOwner: boolean;
  canModerate: boolean;
  moderationReason: string | null;
  publicPath: string;
  createdAt: string;
  sellerId: string;
  sellerName: string | null;
  sellerUsername: string | null;
  sellerImage: string | null;
  sellerLocationLabel: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface MarketplacePage {
  items: MarketplaceListItem[];
  scope: 'local' | 'global';
  total: number;
}

export interface MarketplaceListFilters {
  viewerId: string;
  isAdmin: boolean;
  regionKey?: string | null;
  category?: string | null;
  query?: string | null;
  minPriceCents?: number | null;
  maxPriceCents?: number | null;
  sort?: 'recent' | 'price_asc' | 'price_desc' | null;
  scope?: 'all' | 'mine' | 'favorites' | null;
  page?: number;
  pageSize?: number;
}

export type MarketplaceModerationDecision = 'APPROVE' | 'REJECT' | 'REMOVE';

export interface MarketplaceModerationLogEntry {
  id: string;
  decision: MarketplaceModerationDecision;
  reason: string | null;
  moderatorName: string | null;
  createdAt: string;
}

/** Item exibido na fila de moderação. */
export interface MarketplaceModerationItem {
  id: string;
  title: string;
  description: string;
  category: string;
  priceCents: number | null;
  isFree: boolean;
  imageUrl: string | null;
  locationLabel: string;
  regionKey: string;
  status: MarketplaceStatus;
  publicPath: string;
  createdAt: string;
  sellerId: string;
  sellerName: string | null;
  sellerUsername: string | null;
  moderationReason: string | null;
  moderatedAt: string | null;
  logs: MarketplaceModerationLogEntry[];
}

export interface MarketplaceModerationPage {
  items: MarketplaceModerationItem[];
  total: number;
}
