import type { Business, EventItem, Post, ProfessionalProfileSummary } from '../types';

export interface HomeInitialData {
  latestPost: Post | null;
  latestBusiness: Business | null;
  latestEvent: EventItem | null;
  latestNews: NewsArticleContract | null;
}

export interface CommunityInitialData {
  posts: Post[];
  hasMore: boolean;
  nextOffset: number;
  nextCursor?: string | null;
  regionKey: string;
}

export interface BusinessesInitialData {
  businesses: Business[];
  scope: 'local' | 'global';
  regionKey: string;
}

export interface EventsInitialData {
  events: EventItem[];
  scope: 'local' | 'global';
  regionKey: string;
}

export interface JobsInitialData {
  jobs: any[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

export interface MarketplaceItemContract {
  id: string;
  title: string;
  description: string;
  category: string;
  priceCents: number | null;
  isFree: boolean;
  condition: 'NEW' | 'LIKE_NEW' | 'GOOD' | 'FAIR' | 'POOR';
  locationLabel: string;
  regionKey: string;
  imageUrl: string | null;
  galleryUrls: string[];
  status: 'PENDING_REVIEW' | 'ACTIVE' | 'SOLD' | 'UNAVAILABLE' | 'REMOVED' | 'REJECTED';
  isFavorite: boolean;
  canEdit: boolean;
  isPendingReview: boolean;
  moderationReason?: string | null;
  publicPath: string;
  createdAt: string;
  sellerName: string | null;
  sellerUsername: string | null;
  sellerImage: string | null;
  city?: string | null;
  state?: string | null;
  sellerId?: string;
  isOwner?: boolean;
  canModerate?: boolean;
  sellerLocationLabel?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface MarketplaceInitialData {
  items: MarketplaceItemContract[];
  scope: 'local' | 'global';
  regionKey: string;
  total: number;
}

export interface NewsArticleContract {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string | null;
  category: string;
  regionKey: string | null;
  regionLabel: string | null;
  source: string;
  externalUrl: string;
  publishedAt: string;
  likeCount: number;
  /** A pessoa logada já curtiu esta notícia. */
  viewerLiked: boolean;
  /** Últimas pessoas que curtiram (até 3), para o grupo de avatares. */
  recentLikers: Array<{ id: string; name: string | null; username: string | null; image: string | null }>;
}

export interface NewsAdminArticleContract extends NewsArticleContract {
  status: 'DRAFT' | 'PUBLISHED';
  authorId: string | null;
  authorName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewsInitialData {
  items: NewsArticleContract[];
  hasMore: boolean;
  nextCursor: string | null;
  regionKey: string | null;
}

export interface ProfileInitialData {
  user: {
    id: string;
    name: string | null;
    username: string | null;
    email: string | null;
    phone: string | null;
    image: string | null;
    coverImageUrl: string | null;
    bio: string | null;
    interests: string[];
    galleryUrls: string[];
    locationLabel: string | null;
    regionKey: string | null;
    gender: 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY' | null;
    age: number | null;
    timeAbroad: 'LESS_THAN_ONE_YEAR' | 'ONE_TO_THREE_YEARS' | 'THREE_TO_FIVE_YEARS' | 'MORE_THAN_FIVE_YEARS' | null;
    birthCity: string | null;
    updatedAt: string;
  };
  professionalProfile: ProfessionalProfileSummary;
}

export interface RegionalGroupMemberPreview {
  id: string;
  name: string | null;
  username: string | null;
  image: string | null;
  locationLabel: string | null;
}

export interface RegionalGroupCard {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  coverImageUrl?: string | null;
  category: string | null;
  countryCode?: string;
  isPublic?: boolean;
  regionLabel: string | null;
  memberCount: number;
  createdAt: string;
  publicPath: string;
  memberPreviews: RegionalGroupMemberPreview[];
}
