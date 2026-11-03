'use client';

import { useState } from 'react';
import { formatInternationalPhone } from '@/lib/phone';

const inputClassName =
  'w-full rounded-2xl border border-[#dde3ef] bg-white px-4 py-3 text-sm text-[#0f2b63] placeholder:text-[#8a94a8] focus:border-[#0086ff] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0086ff]';

const buttonClassName =
  'rounded-full bg-[#0086ff] px-6 py-3.5 text-sm font-extrabold text-white shadow-[0_8px_20px_rgba(0,134,255,0.22)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#006ed4] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0086ff]';

type Step = 'phone' | 'code' | 'done';

export function VerifyPhoneForm({ onVerified }: { onVerified?: () => void }) {
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
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
        setError(data?.error ?? 'Nao foi possivel enviar o codigo agora.');
        return;
      }

      setStep('code');
      setCode('');
    } catch {
      setError('Nao foi possivel enviar o codigo agora. Tente novamente.');
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
        setError(data?.error ?? 'Codigo invalido. Tente novamente.');
        return;
      }

      setConfirmedPhone(data?.phone ?? phone);
      setStep('done');
      onVerified?.();
    } catch {
      setError('Nao foi possivel confirmar o codigo agora. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'done') {
    return (
      <div className="flex flex-col gap-4 text-center">
        <p role="status" className="rounded-2xl bg-[#f0f7ff] px-4 py-4 text-sm font-semibold text-[#0f2b63]">
          Telefone confirmado: {confirmedPhone}
        </p>
      </div>
    );
  }

  if (step === 'code') {
    return (
      <form onSubmit={confirmCode} className="flex flex-col gap-4 text-center" noValidate>
        <p className="text-sm text-[#4a5672]">
          Enviamos um codigo por SMS para <strong className="text-[#0f2b63]">{phone}</strong>.
        </p>

        <label htmlFor="verify-code" className="text-sm font-semibold text-[#0f2b63]">
          Codigo recebido
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
          {loading ? 'Confirmando...' : 'Confirmar codigo'}
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => {
            setStep('phone');
            setError(null);
          }}
          className="text-sm font-semibold text-[#0086ff] disabled:opacity-60"
        >
          Usar outro telefone ou reenviar codigo
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={sendCode} className="flex flex-col gap-4 text-center" noValidate>
      <label htmlFor="verify-phone" className="text-sm font-semibold text-[#0f2b63]">
        Telefone com codigo do pais
      </label>
      <input
        id="verify-phone"
        name="phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="+1 305 000 0000"
        value={phone}
        onChange={(event) => setPhone(formatInternationalPhone(event.target.value))}
        className={inputClassName}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? 'verify-error' : undefined}
      />

      {error && (
        <p id="verify-error" role="alert" className="text-sm font-semibold text-[#c2410c]">
          {error}
        </p>
      )}

      <button type="submit" disabled={loading || phone.replace(/\D/g, '').length < 8} className={`${buttonClassName} w-full`}>
        {loading ? 'Enviando...' : 'Enviar codigo por SMS'}
      </button>
    </form>
  );
}
