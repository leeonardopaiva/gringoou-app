'use client';

import { signOut } from 'next-auth/react';
import { VerifyPhoneForm } from './VerifyPhoneForm';
import { useLanguage } from '@/components/i18n/LanguageProvider';

// Shown to any signed-in account that has not confirmed its phone by SMS yet, including
// accounts created before the verification existed. The app stays locked until the phone is
// confirmed; confirming refreshes the session and lets the user continue.
export function PhoneVerificationGate({ onVerified }: { onVerified: () => void }) {
  const { tx } = useLanguage();
  return (
    <main className="flex min-h-dvh items-center justify-center bg-wash-2 px-5 py-8">
      <div className="flex w-full max-w-md flex-col gap-8 rounded-[32px] bg-surface px-6 py-9 shadow-sm sm:px-9">
        <VerifyPhoneForm onVerified={() => onVerified()} />
        <button
          type="button"
          onClick={() => void signOut({ callbackUrl: '/login' })}
          className="self-center text-sm font-semibold text-ink-6 underline-offset-4 hover:underline"
        >
          {tx('Sair da conta')}
        </button>
      </div>
    </main>
  );
}
