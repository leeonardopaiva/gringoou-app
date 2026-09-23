'use client';

type ContentRefreshDetail = {
  refreshSession?: boolean;
  regionKey?: string;
  locationLabel?: string;
};

const CONTENT_REFRESH_EVENT = 'gringoou:content-updated';

export const notifyContentUpdated = (detail: ContentRefreshDetail = {}) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<ContentRefreshDetail>(CONTENT_REFRESH_EVENT, { detail }));
};

export const onContentUpdated = (handler: (detail: ContentRefreshDetail) => void) => {
  if (typeof window === 'undefined') return () => undefined;
  const listener = (event: Event) => handler((event as CustomEvent<ContentRefreshDetail>).detail || {});
  window.addEventListener(CONTENT_REFRESH_EVENT, listener);
  return () => window.removeEventListener(CONTENT_REFRESH_EVENT, listener);
};
