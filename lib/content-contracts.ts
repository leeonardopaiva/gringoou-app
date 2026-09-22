import type { Business, EventItem, Post, ProfessionalProfileSummary } from '../types';

export interface HomeInitialData {
  latestPost: Post | null;
  latestBusiness: Business | null;
  latestEvent: EventItem | null;
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
