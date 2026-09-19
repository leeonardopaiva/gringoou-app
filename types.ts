
export enum UserRole {
  USER = 'USER',
  BUSINESS_OWNER = 'BUSINESS_OWNER',
  COMPANY = 'COMPANY',
  ADMIN = 'ADMIN'
}

export type PersonaMode = 'personal' | 'professional';

export interface User {
  id: string;
  name: string;
  username?: string | null;
  role: UserRole;
  avatar: string;
  coverImageUrl?: string | null;
  bio?: string | null;
  interests?: string[];
  galleryUrls?: string[];
  location: string;
  regionKey?: string | null;
  email?: string | null;
  phone?: string | null;
  recruiterVerified?: boolean;
}

export interface ProfessionalProfileBusiness {
  id: string;
  slug: string;
  name: string;
  category: string;
  status: string;
  imageUrl?: string | null;
  locationLabel?: string | null;
  regionKey?: string | null;
  updatedAt: string;
  publicPath: string;
}

export interface ProfessionalProfileEvent {
  id: string;
  slug: string;
  title: string;
  startsAt: string;
  status: string;
  imageUrl?: string | null;
  locationLabel?: string | null;
  regionKey?: string | null;
  updatedAt: string;
  publicPath: string;
}

export interface ProfessionalProfileIdentity {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string | null;
  locationLabel?: string | null;
  regionKey?: string | null;
  publicPath: string;
}

export interface ProfessionalProfileSummary {
  businessCount: number;
  eventCount: number;
  identity: ProfessionalProfileIdentity | null;
  businesses: ProfessionalProfileBusiness[];
  events: ProfessionalProfileEvent[];
}

export interface PublicProfessionalProfile {
  id: string;
  name: string;
  username: string;
  image?: string | null;
  coverImageUrl?: string | null;
  locationLabel?: string | null;
  joinedAt: string;
  personalPublicPath: string;
  professionalPublicPath: string;
  headline: string;
  stats: {
    businessCount: number;
    eventCount: number;
  };
  businesses: Array<{
    id: string;
    slug: string;
    name: string;
    category: string;
    imageUrl?: string | null;
    locationLabel?: string | null;
    ratingAverage: number;
    ratingCount: number;
  }>;
  events: Array<{
    id: string;
    slug: string;
    title: string;
    venueName: string;
    startsAt: string;
    imageUrl?: string | null;
    locationLabel?: string | null;
    ratingAverage: number;
    ratingCount: number;
  }>;
}

export interface PublicUserProfile {
  id: string;
  name: string;
  username: string;
  image?: string | null;
  coverImageUrl?: string | null;
  bio?: string | null;
  interests: string[];
  galleryUrls: string[];
  locationLabel?: string | null;
  joinedAt: string;
  publicPath: string;
  friendFeature: {
    available: boolean;
    canRequest: boolean;
    status?: 'signed_out' | 'self' | 'none' | 'pending_sent' | 'pending_received' | 'accepted';
    requestId?: string | null;
  };
  stats: {
    friendCount: number;
    businessCount: number;
    eventCount: number;
    postCount: number;
  };
  friends: Array<{
    id: string;
    name: string;
    username?: string | null;
    image?: string | null;
    locationLabel?: string | null;
    publicPath?: string | null;
  }>;
  groups: Array<{
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    imageUrl?: string | null;
    category?: string | null;
    regionKey?: string | null;
    regionLabel?: string | null;
    role: string;
    memberCount: number;
    publicPath: string;
  }>;
  businesses: Array<{
    id: string;
    slug: string;
    name: string;
    category: string;
    imageUrl?: string | null;
    locationLabel?: string | null;
    ratingAverage: number;
    ratingCount: number;
  }>;
  events: Array<{
    id: string;
    slug: string;
    title: string;
    venueName: string;
    startsAt: string;
    imageUrl?: string | null;
    locationLabel?: string | null;
    ratingAverage: number;
    ratingCount: number;
  }>;
  posts: Array<{
    id: string;
    content: string;
    imageUrl?: string | null;
    createdAt: string;
    locationLabel: string;
    _count: {
      reactions: number;
      comments: number;
    };
  }>;
}

export interface CommunityAuthor {
  id: string;
  name: string;
  username?: string | null;
  image?: string | null;
  locationLabel?: string | null;
}

export interface PostLikeUser {
  id: string;
  name: string;
  username?: string | null;
  image?: string | null;
}

export interface Post {
  id: string;
  author: CommunityAuthor;
  authorHref?: string;
  authorType?: 'USER' | 'BUSINESS';
  content: string;
  createdAt: string;
  locationLabel: string;
  imageUrl?: string | null;
  externalUrl?: string | null;
  likeCount: number;
  commentCount: number;
  viewerHasLiked: boolean;
  likedBy: PostLikeUser[];
  comments: PostComment[];
  status?: 'PUBLISHED' | 'PENDING_REVIEW' | 'REMOVED';
  canEdit?: boolean;
  canDelete?: boolean;
}

export interface PostComment {
  id: string;
  content: string;
  createdAt: string;
  author: CommunityAuthor;
  canEdit?: boolean;
  canDelete?: boolean;
}

export interface Business {
  id: string;
  slug?: string;
  name: string;
  category: string;
  address: string;
  description?: string | null;
  imageUrl?: string | null;
  galleryUrls?: string[];
  locationLabel?: string;
  phone?: string | null;
  whatsapp?: string | null;
  website?: string | null;
  instagram?: string | null;
  status?: string;
  isFavorite?: boolean;
  ratingAverage?: number;
  ratingCount?: number;
  viewerRating?: number | null;
  canRate?: boolean;
  canEdit?: boolean;
  isPendingReview?: boolean;
  publicPath?: string;
}

export interface EventItem {
  id: string;
  slug?: string;
  title: string;
  venueName: string;
  startsAt: string;
  locationLabel: string;
  description?: string;
  endsAt?: string | null;
  regionKey?: string;
  externalUrl?: string | null;
  imageUrl?: string | null;
  galleryUrls?: string[];
  status?: string;
  isFavorite?: boolean;
  ratingAverage?: number;
  ratingCount?: number;
  viewerRating?: number | null;
  canRate?: boolean;
  canEdit?: boolean;
  isPendingReview?: boolean;
  publicPath?: string;
  city?: string;
  state?: string;
  interestCount?: number;
  interestPreview?: Array<{
    id: string;
    name?: string | null;
    image?: string | null;
  }>;
  canViewInterestedUsers?: boolean;
  canUnlockInterestedUsers?: boolean;
}

export interface BannerAd {
  id: string;
  name: string;
  imageUrl: string;
  type?: 'LINK' | 'REGISTRATION';
  placement?: 'HOME' | 'FEED' | 'BOTH';
  targetUrl?: string | null;
  regionKey?: string | null;
  regionLabel?: string | null;
  scope?: 'global' | 'regional';
  objective?: 'TRAFFIC' | 'LEAD' | 'AWARENESS';
  matchedBy?: string[];
  deliveryReasons?: string[];
  sponsored?: boolean;
  headline?: string | null;
  description?: string | null;
  ctaLabel?: string | null;
  goal?: 'WHATSAPP' | 'EXTERNAL_URL' | 'MARKETPLACE' | null;
  advertiserName?: string | null;
  advertiserLogoUrl?: string | null;
}

export interface ReferralSummary {
  referralUrl: string | null;
  registrationCount: number;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  salary: string;
  type: 'Full-time' | 'Part-time' | 'Freelance';
  image: string;
}

export interface Housing {
  id: string;
  title: string;
  price: string;
  location: string;
  type: 'Apartment' | 'House' | 'Room' | 'Studio';
  image: string;
  rating: number;
}


