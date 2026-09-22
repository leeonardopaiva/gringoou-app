import type { ErrorEvent } from '@sentry/nextjs';

export function scrubSentryEvent(event: ErrorEvent): ErrorEvent {
  if (event.request) {
    event.request.url = event.request.url?.split('?')[0];
    event.request.query_string = undefined;
    event.request.cookies = undefined;
    event.request.data = undefined;
    event.request.headers = undefined;
  }

  event.user = undefined;
  event.breadcrumbs = undefined;
  return event;
}
