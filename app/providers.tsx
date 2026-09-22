'use client';

import { SessionProvider } from 'next-auth/react';
import type { Session } from 'next-auth';
import { ToastProvider } from '@/components/feedback/ToastProvider';
import AddToHomeScreenPrompt from '@/components/pwa/AddToHomeScreenPrompt';

type ProvidersProps = {
  children: React.ReactNode;
  session?: Session | null;
};

export function Providers({ children, session }: ProvidersProps) {
  return (
    <SessionProvider session={session}>
      <ToastProvider>
        {children}
        <AddToHomeScreenPrompt />
      </ToastProvider>
    </SessionProvider>
  );
}
