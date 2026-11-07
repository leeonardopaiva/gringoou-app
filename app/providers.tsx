'use client';

import { SessionProvider } from 'next-auth/react';
import type { Session } from 'next-auth';
import { ToastProvider } from '@/components/feedback/ToastProvider';
import AddToHomeScreenPrompt from '@/components/pwa/AddToHomeScreenPrompt';
import WebVitalsReporter from '@/components/performance/WebVitalsReporter';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { MessagingProvider } from '@/lib/MessagingProvider';
import { NavigationTracker } from '@/lib/navigation-history';
import { PublicConfigProvider } from '@/lib/public-config';
import type { User } from '@/types';

type ProvidersProps = {
  children: React.ReactNode;
  session?: Session | null;
  /** Calculado no servidor (mesma regra do cadastro). */
  inviteRequired?: boolean;
};

// Local/mock dev has no real traffic to measure, so skip the Vercel beacons entirely.
const shouldLoadVercelTelemetry = process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_USE_MOCKS !== 'true';

export function Providers({ children, session, inviteRequired = false }: ProvidersProps) {
  return (
    <PublicConfigProvider value={{ inviteRequired }}>
    <SessionProvider session={session}>
      <ToastProvider>
        <MessagingProvider user={session?.user as unknown as User | null}>
          <NavigationTracker />
          {children}
          <AddToHomeScreenPrompt />
          <WebVitalsReporter />
          {shouldLoadVercelTelemetry ? <SpeedInsights sampleRate={0.2} /> : null}
        </MessagingProvider>
      </ToastProvider>
    </SessionProvider>
    </PublicConfigProvider>
  );
}
