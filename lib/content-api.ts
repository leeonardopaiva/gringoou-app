'use client';

import type { BannerAd, Post } from '../types';
import type { RegionalGroupCard } from './content-contracts';

type JsonResponse<T> = {
  error?: string;
} & T;

const fetchJson = async <T,>(url: string): Promise<JsonResponse<T>> => {
  const response = await fetch(url, { cache: 'no-store' });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error ?? 'Nao foi possivel carregar os dados.');
  }

  return payload as JsonResponse<T>;
};

export const loadRegionBanners = async (placement: 'home' | 'feed', regionKey?: string | null) => {
  const query = new URLSearchParams({ placement });

  if (regionKey) {
    query.set('region', regionKey);
  }

  const payload = await fetchJson<{ banners?: BannerAd[] }>(`/api/banners?${query.toString()}`);
  return Array.isArray(payload.banners) ? payload.banners : [];
};

export const loadRegionCommunityPosts = async ({
  regionKey,
  limit = 5,
  offset = 0,
}: {
  regionKey?: string | null;
  limit?: number;
  offset?: number;
}) => {
  if (!regionKey) {
    return { posts: [] as Post[], hasMore: false, nextOffset: 0 };
  }

  const query = new URLSearchParams({ region: regionKey, limit: String(limit), offset: String(offset) });

  const payload = await fetchJson<{
    posts?: Post[];
    hasMore?: boolean;
    nextOffset?: number;
  }>(`/api/community/posts?${query.toString()}`);

  return {
    posts: Array.isArray(payload.posts) ? payload.posts : [],
    hasMore: Boolean(payload.hasMore),
    nextOffset: Number(payload.nextOffset ?? offset),
  };
};

export const loadRegionGroups = async ({
  regionKey,
  country,
  limit = 2,
  offset = 0,
}: {
  regionKey?: string | null;
  country?: string | null;
  limit?: number;
  offset?: number;
}) => {
  if (!regionKey && !country) {
    return { groups: [] as RegionalGroupCard[], hasMore: false, nextOffset: 0 };
  }

  const query = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (regionKey) query.set('region', regionKey);
  if (country) query.set('country', country);

  const payload = await fetchJson<{
    groups?: RegionalGroupCard[];
    hasMore?: boolean;
    nextOffset?: number;
  }>(`/api/groups?${query.toString()}`);

  return {
    groups: Array.isArray(payload.groups) ? payload.groups : [],
    hasMore: Boolean(payload.hasMore),
    nextOffset: Number(payload.nextOffset ?? offset),
  };
};
