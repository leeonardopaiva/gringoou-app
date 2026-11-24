'use client';

import React, { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { waitlistSchema } from '@/lib/waitlist';

/**
 * "Avise-me" da página de região indisponível. Grava na mesma lista de interesse
 * (WaitlistEntry) usada pela landing, guardando o país detectado no acesso.
 */
export function RegionWaitlistForm({ country }: { country?: string }) {
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) return;

    const parsed = waitlistSchema.safeParse({ email, country, website });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Confira o e-mail informado.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setError(data?.error ?? 'Não foi possível salvar agora. Tente novamente.');
        return;
      }

      setDone(true);
    } catch {
      setError('Não foi possível salvar agora. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div
        role="status"
        className="flex items-center justify-center gap-3 rounded-full border border-emerald-100 bg-emerald-50 px-6 py-4 text-left text-sm font-semibold text-emerald-700"
      >
        <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
        Pronto! Avisaremos por e-mail quando chegarmos à sua região.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div
        className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-2 sm:rounded-full sm:border sm:bg-surface sm:p-[7px] sm:pl-6 sm:focus-within:ring-2 sm:focus-within:ring-brand-200 ${
          error ? 'sm:border-red-300' : 'sm:border-slate-200'
        }`}
      >
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="Seu e-mail"
          aria-label="Seu e-mail"
          aria-invalid={Boolean(error)}
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            if (error) setError(null);
          }}
          className={`h-14 w-full min-w-0 rounded-full border bg-surface px-6 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 sm:h-auto sm:flex-1 sm:border-0 sm:bg-transparent sm:px-0 sm:py-2 sm:text-[15px] sm:focus-visible:ring-0 ${
            error ? 'border-red-300' : 'border-slate-200'
          }`}
        />

        {/* Honeypot: pessoas não veem nem preenchem; bots sim. */}
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
          className="absolute -left-[9999px] h-0 w-0 opacity-0"
        />

        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-14 w-full shrink-0 items-center justify-center rounded-full bg-brand-strong px-6 text-[15px] font-bold text-white transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 disabled:opacity-60 sm:h-[46px] sm:w-auto sm:px-6"
        >
          {loading ? (
            'Enviando...'
          ) : (
            <>
              <span className="sm:hidden">Avise-me quando chegar</span>
              <span className="hidden sm:inline">Avise-me</span>
            </>
          )}
        </button>
      </div>

      {error ? (
        <p role="alert" className="mt-3 text-sm font-medium text-red-600">
          {error}
        </p>
      ) : (
        <p className="mt-4 text-[13px] text-slate-400">
          <span className="sm:hidden">Um único e-mail, quando chegarmos.</span>
          <span className="hidden sm:inline">Enviamos um único e-mail quando chegarmos à sua região.</span>
        </p>
      )}
    </form>
  );
}

export default RegionWaitlistForm;
