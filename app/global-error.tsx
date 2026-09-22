'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body className="grid min-h-screen place-items-center bg-slate-50 px-6 text-slate-900">
        <main className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold">Algo nao saiu como esperado</h1>
          <p className="mt-3 text-sm text-slate-600">Nossa equipe pode acompanhar este erro. Tente novamente em instantes.</p>
          <button type="button" onClick={reset} className="mt-6 min-h-11 rounded-full bg-[#0086ff] px-6 font-semibold text-white">
            Tentar novamente
          </button>
        </main>
      </body>
    </html>
  );
}
