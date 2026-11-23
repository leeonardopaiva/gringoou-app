'use client';

import { useCallback, useEffect, useState } from 'react';
import type { BannerAd, Post } from '../types';
import type { RegionalGroupCard } from '../lib/content-contracts';
import {
  loadRegionBanners,
  loadRegionCommunityPosts,
  loadRegionGroups,
} from '../lib/content-api';

const EMPTY_BANNERS: BannerAd[] = [];
const EMPTY_POSTS: Post[] = [];
const EMPTY_GROUPS: RegionalGroupCard[] = [];

type AsyncState<T> = {
  data: T;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
};

function useAsyncResource<T>(loader: () => Promise<T>, enabled: boolean, initialValue: T): AsyncState<T> {
  const [data, setData] = useState<T>(initialValue);
  const [loading, setLoading] = useState<boolean>(enabled);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!enabled) {
      setData(initialValue);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const nextData = await loader();
      setData(nextData);
    } catch (loadError) {
      setData(initialValue);
      setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar os dados.');
    } finally {
      setLoading(false);
    }
  }, [enabled, initialValue, loader]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}

export function useRegionBanners(placement: 'home' | 'feed', regionKey?: string | null) {
  const loader = useCallback(async () => loadRegionBanners(placement, regionKey), [placement, regionKey]);

  return useAsyncResource<BannerAd[]>(loader, true, EMPTY_BANNERS);
}

export function useRegionCommunityPosts(regionKey?: string | null, limit = 5) {
  const loader = useCallback(async () => {
    const payload = await loadRegionCommunityPosts({ regionKey, limit, offset: 0 });
    return payload.posts;
  }, [limit, regionKey]);

  return useAsyncResource<Post[]>(loader, Boolean(regionKey), EMPTY_POSTS);
}

export function useRegionGroups(regionKey?: string | null, limit = 2) {
  const loader = useCallback(async () => {
    if (!regionKey) {
      return [];
    }

    const effectiveLimit = Math.max(limit * 4, 12);
    const payload = await loadRegionGroups({ regionKey, limit: effectiveLimit, offset: 0 });
    return [...payload.groups]
      .sort((left, right) => {
        if (left.memberCount !== right.memberCount) {
          return right.memberCount - left.memberCount;
        }

        return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
      })
      .slice(0, limit);
  }, [limit, regionKey]);

  return useAsyncResource<RegionalGroupCard[]>(loader, Boolean(regionKey), EMPTY_GROUPS);
}
