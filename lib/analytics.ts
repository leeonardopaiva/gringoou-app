import { getStoredUtm } from '@/lib/utm-capture';
export type TrackAnalyticsPayload = {
  type: 'disabled_feature_click' | 'banner_click' | 'banner_registration' | 'search_query';
  targetType: 'feature' | 'banner' | 'search';
  targetKey: string;
  label: string;
  sourcePath?: string;
  sourceSection?: string;
  regionKey?: string | null;
  /** Preenchido automaticamente com a última origem de chegada (utm_*), se houver. */
  utm?: Record<string, string>;
};

export const trackAnalyticsEvent = (payload: TrackAnalyticsPayload) => {
  if (typeof window === 'undefined') {
    return;
  }

  const utm = getStoredUtm();
  const body = JSON.stringify(utm && !payload.utm ? { ...payload, utm } : payload);

  if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
    const blob = new Blob([body], { type: 'application/json' });
    navigator.sendBeacon('/api/analytics/track', blob);
    return;
  }

  void fetch('/api/analytics/track', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body,
    keepalive: true,
  }).catch(() => undefined);
};
