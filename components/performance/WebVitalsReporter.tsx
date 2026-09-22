'use client';

import { useRef } from 'react';
import { useReportWebVitals } from 'next/web-vitals';

export default function WebVitalsReporter() {
  const sampledRef = useRef(process.env.NODE_ENV !== 'production' || Math.random() < 0.2);

  useReportWebVitals((metric) => {
    if (!sampledRef.current) return;

    const body = JSON.stringify({
      id: metric.id,
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      navigationType: metric.navigationType,
      path: window.location.pathname,
    });

    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/monitoring/web-vitals', new Blob([body], { type: 'application/json' }));
      return;
    }

    void fetch('/api/monitoring/web-vitals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => undefined);
  });

  return null;
}
