import * as Sentry from '@sentry/nextjs';
import { scrubSentryEvent } from './lib/sentry-scrub';

const tracesSampleRate = Number(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1');

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN),
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
  release: process.env.VERCEL_GIT_COMMIT_SHA,
  sendDefaultPii: false,
  beforeSend: scrubSentryEvent,
  tracesSampleRate: Number.isFinite(tracesSampleRate) ? tracesSampleRate : 0.1,
});
