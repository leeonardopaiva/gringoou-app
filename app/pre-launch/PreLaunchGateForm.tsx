'use client';

import React, { useEffect, useState } from 'react';
import { Logo } from '@/components/Layout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const DEFAULT_NEXT_PATH = '/inicio';

// Only allow same-origin, relative redirects to avoid open-redirect abuse via
// a crafted `?next=` value.
const sanitizeNextPath = (value: string | null) => {
  if (!value) {
    return DEFAULT_NEXT_PATH;
  }

  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
    return DEFAULT_NEXT_PATH;
  }

  return value;
};

export function PreLaunchGateForm() {
  const [code, setCode] = useState('');
  const [nextPath, setNextPath] = useState(DEFAULT_NEXT_PATH);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setNextPath(sanitizeNextPath(params.get('next')));
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (loading || !code.trim()) {
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const response = await fetch('/api/pre-launch/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      if (!response.ok) {
        setError('Codigo de acesso invalido.');
        return;
      }

      window.location.assign(nextPath);
    } catch {
      setError('Nao foi possivel validar o codigo agora. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-bg px-6 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-2xl items-center justify-center">
        <div className="w-full max-w-lg rounded-[32px] bg-white px-8 py-10 text-center shadow-sm sm:px-10 sm:py-12">
          <div className="flex justify-center">
            <Logo size="lg" />
          </div>

          <p className="mt-8 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Acesso restrito
          </p>
          <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-slate-500 sm:text-base">
            Estamos em fase de pre-lancamento. Informe o codigo de acesso para continuar.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4 text-left">
            <label htmlFor="pre-launch-code" className="text-sm font-semibold text-slate-700">
              Codigo de acesso
            </label>
            <Input
              id="pre-launch-code"
              name="code"
              type="password"
              inputMode="text"
              autoComplete="off"
              autoFocus
              value={code}
              onChange={(event) => setCode(event.target.value)}
              state={error ? 'error' : 'default'}
              helperText={error ?? undefined}
              placeholder="Digite o codigo"
            />
            <Button type="submit" size="lg" fullWidth loading={loading} disabled={!code.trim()}>
              Continuar
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}
