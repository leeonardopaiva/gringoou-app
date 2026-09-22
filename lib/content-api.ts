'use client';

import type { BannerAd, Post } from '../types';
import type { RegionalGroupCard } from './content-contracts';

type JsonResponse<T> = {
  error?: string;
} & T;

const inFlightRequests = new Map<string, Promise<unknown>>();

const fetchJson = async <T,>(url: string): Promise<JsonResponse<T>> => {
  const response = await fetch(url, { cache: 'no-store' });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error ?? 'Nao foi possivel carregar os dados.');
  }

  return payload as JsonResponse<T>;
};

const fetchJsonDeduped = <T,>(url: string): Promise<JsonResponse<T>> => {
  const existing = inFlightRequests.get(url) as Promise<JsonResponse<T>> | undefined;
  if (existing) return existing;

  const request = fetchJson<T>(url).finally(() => inFlightRequests.delete(url));
  inFlightRequests.set(url, request);
  return request;
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
  cursor,
}: {
  regionKey?: string | null;
  limit?: number;
  offset?: number;
  cursor?: string | null;
}) => {
  if (!regionKey) {
    return { posts: [] as Post[], hasMore: false, nextOffset: 0, nextCursor: null as string | null };
  }

  const query = new URLSearchParams({ region: regionKey, limit: String(limit), offset: String(offset) });
  if (cursor) query.set('cursor', cursor);

  const payload = await fetchJsonDeduped<{
    posts?: Post[];
    hasMore?: boolean;
    nextOffset?: number;
    nextCursor?: string | null;
  }>(`/api/community/posts?${query.toString()}`);

  return {
    posts: Array.isArray(payload.posts) ? payload.posts : [],
    hasMore: Boolean(payload.hasMore),
    nextOffset: Number(payload.nextOffset ?? offset),
    nextCursor: payload.nextCursor ?? null,
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
