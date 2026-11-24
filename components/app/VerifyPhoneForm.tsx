'use client';

import { useState } from 'react';
import PhoneNumberField from '@/components/forms/PhoneNumberField';
import { buildInternationalPhone } from '@/lib/forms/phone';

const inputClassName =
  'w-full rounded-2xl border border-line-soft bg-surface px-4 py-3 text-sm text-ink-3 placeholder:text-ink-7 focus:border-brand-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';

const buttonClassName =
  'rounded-full bg-brand-500 px-6 py-3.5 text-sm font-extrabold text-white shadow-[0_8px_20px_rgba(0,134,255,0.22)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500';

type Step = 'phone' | 'code' | 'done';

export function VerifyPhoneForm({ onVerified }: { onVerified?: () => void }) {
  const [step, setStep] = useState<Step>('phone');
  const [countryIso2, setCountryIso2] = useState('US');
  const [localNumber, setLocalNumber] = useState('');
  const phone = buildInternationalPhone(countryIso2, localNumber);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedPhone, setConfirmedPhone] = useState<string | null>(null);

  const postJson = async (url: string, body: unknown) => {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => null);
    return { ok: response.ok, data };
  };

  const sendCode = async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (loading) return;

    setError(null);
    setLoading(true);

    try {
      const { ok, data } = await postJson('/api/phone/verification/start', { phone });

      if (!ok) {
        setError(data?.error ?? 'Não foi possível enviar o código agora.');
        return;
      }

      setStep('code');
      setCode('');
    } catch {
      setError('Não foi possível enviar o código agora. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const confirmCode = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading) return;

    setError(null);
    setLoading(true);

    try {
      const { ok, data } = await postJson('/api/phone/verification/check', { phone, code });

      if (!ok) {
        setError(data?.error ?? 'Código inválido. Tente novamente.');
        return;
      }

      setConfirmedPhone(data?.phone ?? phone);
      setStep('done');
      onVerified?.();
    } catch {
      setError('Não foi possível confirmar o código agora. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'done') {
    return (
      <div className="flex flex-col gap-4 text-center">
        <p role="status" className="rounded-2xl bg-[#f0f7ff] px-4 py-4 text-sm font-semibold text-ink-3">
          Telefone confirmado: {confirmedPhone}
        </p>
      </div>
    );
  }

  if (step === 'code') {
    return (
      <form onSubmit={confirmCode} className="flex flex-col gap-4 text-center" noValidate>
        <p className="text-sm text-ink-5">
          Enviamos um código por SMS para <strong className="text-ink-3">{phone}</strong>.
        </p>

        <label htmlFor="verify-code" className="text-sm font-semibold text-ink-3">
          Código recebido
        </label>
        <input
          id="verify-code"
          name="code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 8))}
          className={inputClassName}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'verify-error' : undefined}
        />

        {error && (
          <p id="verify-error" role="alert" className="text-sm font-semibold text-[#c2410c]">
            {error}
          </p>
        )}

        <button type="submit" disabled={loading || code.length < 4} className={`${buttonClassName} w-full`}>
          {loading ? 'Confirmando...' : 'Confirmar código'}
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => {
            setStep('phone');
            setError(null);
          }}
          className="text-sm font-semibold text-brand-500 disabled:opacity-60"
        >
          Usar outro telefone ou reenviar código
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={sendCode} className="flex flex-col gap-4 text-center" noValidate>
      <span className="text-sm font-semibold text-ink-3">Seu telefone</span>
      <PhoneNumberField
        countryIso2={countryIso2}
        onCountryChange={(iso2) => {
          setCountryIso2(iso2);
          setError(null);
        }}
        value={localNumber}
        onValueChange={setLocalNumber}
        onInteract={() => setError(null)}
        placeholder="Número com DDD"
        invalid={Boolean(error)}
      />
      <p className="text-xs text-ink-5">Enviaremos um código de 6 dígitos por SMS.</p>

      {error && (
        <p id="verify-error" role="alert" className="text-sm font-semibold text-[#c2410c]">
          {error}
        </p>
      )}

      <button type="submit" disabled={loading || localNumber.replace(/\D/g, '').length < 6} className={`${buttonClassName} w-full`}>
        {loading ? 'Enviando...' : 'Enviar código por SMS'}
      </button>
    </form>
  );
}
