'use client';

import { VerifyPhoneForm } from './VerifyPhoneForm';

// Shown to any signed-in account that has not confirmed its phone by SMS yet.
// Confirming refreshes the session, which lets the app continue to the profile step.
export function PhoneVerificationGate({ onVerified }: { onVerified: () => void }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#f7f8fb] px-6 py-10">
      <div className="flex w-full max-w-lg flex-col gap-6 rounded-[32px] bg-white px-8 py-10 shadow-sm">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-extrabold tracking-tight text-[#0f2b63]">Confirme seu telefone</h1>
          <p className="text-sm leading-6 text-[#4a5672]">
            Para continuar, confirme o seu numero de telefone com um codigo enviado por SMS.
          </p>
        </div>
        <VerifyPhoneForm onVerified={onVerified} />
      </div>
    </main>
  );
}
