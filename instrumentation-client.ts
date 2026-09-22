import * as Sentry from '@sentry/nextjs';
import { scrubSentryEvent } from './lib/sentry-scrub';

const numericEnvironment = (value: string | undefined, fallback: number) => {
  const parsed = Number(value || fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
};

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV,
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
  sendDefaultPii: false,
  beforeSend: scrubSentryEvent,
  tracesSampleRate: numericEnvironment(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE, 0.1),
  replaysSessionSampleRate: numericEnvironment(process.env.NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE, 0),
  replaysOnErrorSampleRate: numericEnvironment(process.env.NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE, 0.1),
  integrations: [Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true })],
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
