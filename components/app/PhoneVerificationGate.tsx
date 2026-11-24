'use client';

import { signOut } from 'next-auth/react';
import { VerifyPhoneForm } from './VerifyPhoneForm';

// Shown to any signed-in account that has not confirmed its phone by SMS yet, including
// accounts created before the verification existed. The app stays locked until the phone is
// confirmed; confirming refreshes the session and lets the user continue.
export function PhoneVerificationGate({ onVerified }: { onVerified: () => void }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-wash-2 px-6 py-10">
      <div className="flex w-full max-w-lg flex-col gap-6 rounded-[32px] bg-surface px-8 py-10 shadow-sm">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-3">Confirme seu telefone</h1>
          <p className="text-sm leading-6 text-ink-5">
            Para continuar, confirme o seu número de telefone com um código enviado por SMS. Essa
            verificação protege a comunidade e é obrigatória para usar o Gringoou.
          </p>
        </div>
        <VerifyPhoneForm onVerified={onVerified} />
        <button
          type="button"
          onClick={() => void signOut({ callbackUrl: '/login' })}
          className="text-sm font-semibold text-ink-5 underline-offset-4 hover:underline"
        >
          Sair da conta
        </button>
      </div>
    </main>
  );
}
