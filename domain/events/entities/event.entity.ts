/**
 * Entidade de domínio Evento.
 *
 * PURA — sem dependências de React, Next, NextAuth ou Prisma.
 */

export type EventStatus = 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'REJECTED' | 'CANCELED';

export type VisibilityScope = 'GLOBAL' | 'USER_REGION' | 'SPECIFIC_REGION';

export interface EventEntity {
  id: string;
  slug: string;
  title: string;
  description: string;
  venueName: string;
  category: string;
  startsAt: Date;
  endsAt: Date | null;
  locationLabel: string;
  regionKey: string;
  visibilityScope: VisibilityScope;
  visibilityRegionKey: string | null;
  externalUrl: string | null;
  imageUrl: string | null;
  galleryUrls: string[];
  ratingAverage: number;
  ratingCount: number;
  status: EventStatus;
  ownershipVerifiedAt: Date | null;
  businessId: string | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Item resumido para listagem (já serializado para strings) */
export interface EventListItem {
  id: string;
  slug: string;
  title: string;
  description: string;
  venueName: string;
  category: string;
  startsAt: string;
  endsAt: string | null;
  locationLabel: string;
  regionKey: string;
  externalUrl: string | null;
  imageUrl: string | null;
  galleryUrls: string[];
  ratingAverage: number;
  ratingCount: number;
  status: string;
  isFavorite: boolean;
  canEdit: boolean;
  isPendingReview: boolean;
  publicPath: string;
  interestCount: number;
  interestPreview: Array<{ id: string; name: string | null; image: string | null }>;
  canViewInterestedUsers: boolean;
  canUnlockInterestedUsers: boolean;
}

/** Item completo de detalhe (já serializado para strings) */
export interface EventDetailItem {
  id: string;
  slug: string;
  title: string;
  category: string;
  description: string;
  venueName: string;
  startsAt: string;
  endsAt: string | null;
  locationLabel: string;
  regionKey: string;
  city: string | null;
  state: string | null;
  externalUrl: string;
  imageUrl: string;
  galleryUrls: string[];
  ratingAverage: number;
  ratingCount: number;
  viewerRating: number | null;
  isFavorite: boolean;
  canEdit: boolean;
  canRate: boolean;
  createdByName: string;
  publicPath: string;
  status: string;
  ownershipVerifiedAt: string | null;
  businessId: string | null;
}

export interface EventsPage {
  events: EventListItem[];
  scope: 'local' | 'global';
}