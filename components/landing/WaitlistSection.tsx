'use client';

import { useState } from 'react';
import Link from 'next/link';
import { LocateFixed } from 'lucide-react';
import { waitlistSchema } from '@/lib/waitlist';
import { COUNTRY_CALLING_CODE_OPTIONS } from '@/lib/country-calling-codes';

const inputClassName =
  'w-full rounded-2xl border border-[#dde3ef] bg-white px-4 py-3 text-sm text-[#0f2b63] placeholder:text-[#8a94a8] focus:border-[#0086ff] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0086ff]';

export function WaitlistSection() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [country, setCountry] = useState('');
  const [website, setWebsite] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  const detectLocation = () => {
    if (!('geolocation' in navigator)) {
      setError('Seu navegador nao suporta localizacao. Selecione o pais manualmente.');
      return;
    }

    setLocating(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

        try {
          if (token) {
            const response = await fetch(
              `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${token}&types=country&limit=1`,
            );
            const data = await response.json().catch(() => null);
            const countryName = data?.features?.[0]?.text;
            if (countryName) {
              setCountry(countryName);
              setLocating(false);
              return;
            }
          }

          // Fallback: inferir o pais a partir do fuso horario.
          const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
          const match = COUNTRY_CALLING_CODE_OPTIONS.find((option) =>
            timeZone.toUpperCase().includes(option.iso2.toUpperCase()),
          );
          if (match) {
            setCountry(match.country);
          } else {
            setError('Nao foi possivel detectar o pais. Selecione manualmente.');
          }
        } catch {
          setError('Nao foi possivel detectar o pais. Selecione manualmente.');
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocating(false);
        setError('Permita o acesso a localizacao para detectar o pais automaticamente.');
      },
      { timeout: 10000 },
    );
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (loading) {
      return;
    }

    const parsed = waitlistSchema.safeParse({ email, name, country, website });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Dados invalidos.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setError(data?.error ?? 'Nao foi possivel concluir agora. Tente novamente.');
        return;
      }

      setSuccess(data?.message ?? 'Pronto! Voce esta na lista.');
    } catch {
      setError('Nao foi possivel concluir agora. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="lista" className="mx-auto w-full max-w-[1440px] px-5 pb-16 sm:px-8 lg:px-16">
      <div className="mx-auto flex max-w-2xl flex-col gap-6 rounded-[32px] bg-white px-6 py-10 text-center shadow-[0_8px_24px_rgba(15,43,99,0.08)] sm:px-10">
        <div className="flex flex-col gap-3">
          <h2 className="text-2xl font-extrabold tracking-tight text-[#0f2b63] sm:text-3xl">
            Entre na lista de espera
          </h2>
          <p className="text-sm leading-6 text-[#4a5672] sm:text-base">
            Estamos liberando a Gringoou aos poucos. Deixe seu email e avisaremos assim que o seu acesso estiver disponivel.
          </p>
        </div>

        {success ? (
          <p role="status" className="rounded-2xl bg-[#f0f7ff] px-4 py-4 text-sm font-semibold text-[#0f2b63]">
            {success}
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3 text-left" noValidate>
            <label htmlFor="waitlist-name" className="sr-only">
              Nome
            </label>
            <input
              id="waitlist-name"
              name="name"
              type="text"
              autoComplete="name"
              placeholder="Seu nome"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={inputClassName}
            />

            <label htmlFor="waitlist-email" className="sr-only">
              Email
            </label>
            <input
              id="waitlist-email"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="Seu melhor email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value.toLowerCase())}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'waitlist-error' : undefined}
              className={inputClassName}
            />

            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label htmlFor="waitlist-country" className="sr-only">
                  Pais onde voce mora
                </label>
                <select
                  id="waitlist-country"
                  name="country"
                  autoComplete="country-name"
                  value={country}
                  onChange={(event) => setCountry(event.target.value)}
                  className={inputClassName}
                >
                  <option value="">Selecione o pais</option>
                  {COUNTRY_CALLING_CODE_OPTIONS.map((option) => (
                    <option key={option.iso2} value={option.country}>
                      {option.country}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={detectLocation}
                disabled={locating}
                aria-label="Usar minha localizacao"
                title="Usar minha localizacao"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#dde3ef] bg-white text-[#0086ff] transition hover:bg-[#f0f7ff] disabled:opacity-60"
              >
                <LocateFixed size={18} className={locating ? 'animate-pulse' : ''} />
              </button>
            </div>

            {/* Honeypot: hidden from people and screen readers, bots tend to fill it. */}
            <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
              <label htmlFor="waitlist-website">Site</label>
              <input
                id="waitlist-website"
                name="website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(event) => setWebsite(event.target.value)}
              />
            </div>

            {error && (
              <p id="waitlist-error" role="alert" className="text-sm font-semibold text-[#c2410c]">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 rounded-full bg-[#0086ff] px-6 py-3.5 text-sm font-extrabold text-white shadow-[0_8px_20px_rgba(0,134,255,0.22)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#006ed4] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0086ff]"
            >
              {loading ? 'Enviando...' : 'Quero entrar na lista'}
            </button>
          </form>
        )}

        <div className="flex justify-center border-t border-[#eef1f7] pt-5">
          <Link
            href="/login"
            className="text-sm font-bold text-[#0086ff] transition hover:text-[#006ed4]"
          >
            Já tem convite ou conta? Entrar
          </Link>
        </div>
      </div>
    </section>
  );
}
