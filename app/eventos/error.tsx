'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';

export default function EventsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Events page error:', error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-3xl">
        ⚠️
      </div>
      <h2 className="text-xl font-bold text-text">Algo deu errado</h2>
      <p className="text-sm text-slate-500">
        Não foi possível carregar a página de eventos. Tente novamente.
      </p>
      <Button onClick={reset} variant="primary">
        Tentar novamente
      </Button>
    </div>
  );
}