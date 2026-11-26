'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import PhoneNumberField from '@/components/forms/PhoneNumberField';
import { findCountryByIso2 } from '@/lib/country-calling-codes';
import { buildInternationalPhone } from '@/lib/forms/phone';

const CODE_LENGTH = 6;
const RESEND_SECONDS = 60;

const buttonClassName =
  'w-full rounded-full bg-brand-strong px-6 py-4 text-sm font-extrabold text-white shadow-[0_8px_20px_rgba(0,134,255,0.22)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-brand-strong-hover disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500';

type Step = 'phone' | 'code' | 'done';

const formatCountdown = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

/** Código em caixas separadas. Um único campo invisível recebe a digitação, a colagem e o preenchimento automático do SMS. */
function CodeBoxes({ value, onChange, invalid, disabled }: { value: string; onChange: (value: string) => void; invalid: boolean; disabled: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);

  return (
    <div className="relative" onClick={() => inputRef.current?.focus()}>
      <input
        ref={inputRef}
        id="verify-code"
        name="code"
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        autoFocus
        maxLength={CODE_LENGTH}
        disabled={disabled}
        aria-label="Código de 6 dígitos"
        aria-invalid={invalid}
        value={value}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, '').slice(0, CODE_LENGTH))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="absolute inset-0 z-10 h-full w-full cursor-text opacity-0"
      />
      <div className="grid grid-cols-6 gap-2 sm:gap-3" aria-hidden="true">
        {Array.from({ length: CODE_LENGTH }, (_, index) => {
          const active = focused && index === Math.min(value.length, CODE_LENGTH - 1);
          return (
            <div
              key={index}
              className={`flex h-14 items-center justify-center rounded-2xl border-2 bg-wash-1 text-xl font-extrabold text-ink-3 transition-colors sm:h-16 ${
                invalid ? 'border-red-400' : active ? 'border-brand-500' : 'border-line-soft'
              }`}
            >
              {value[index] ?? ''}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function VerifyPhoneForm({ onVerified }: { onVerified?: (phone: string) => void }) {
  const [step, setStep] = useState<Step>('phone');
  const [countryIso2, setCountryIso2] = useState('US');
  const [localNumber, setLocalNumber] = useState('');
  const phone = buildInternationalPhone(countryIso2, localNumber);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedPhone, setConfirmedPhone] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = window.setTimeout(() => setSecondsLeft((current) => current - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [secondsLeft]);

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
      setSecondsLeft(RESEND_SECONDS);
    } catch {
      setError('Não foi possível enviar o código agora. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const confirmCode = async (value: string) => {
    if (loading || value.length !== CODE_LENGTH) return;

    setError(null);
    setLoading(true);

    try {
      const { ok, data } = await postJson('/api/phone/verification/check', { phone, code: value });

      if (!ok) {
        setError(data?.error ?? 'Código inválido. Tente novamente.');
        setCode('');
        return;
      }

      const verifiedPhone = data?.phone ?? phone;
      setConfirmedPhone(verifiedPhone);
      setStep('done');
      onVerified?.(verifiedPhone);
    } catch {
      setError('Não foi possível confirmar o código agora. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const changeNumber = () => {
    setStep('phone');
    setCode('');
    setError(null);
  };

  if (step === 'done') {
    return (
      <div role="status" className="flex items-center gap-3 rounded-2xl bg-emerald-50 px-4 py-4 text-sm font-semibold text-emerald-700">
        <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
        Telefone confirmado: {confirmedPhone}
      </div>
    );
  }

  if (step === 'code') {
    const dialCode = findCountryByIso2(countryIso2).dialCode;
    const lastDigits = localNumber.replace(/\D/g, '').slice(-4);

    return (
      <form onSubmit={(event) => { event.preventDefault(); void confirmCode(code); }} className="flex flex-col gap-6" noValidate>
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-extrabold tracking-tight text-ink-3">Digite o código</h2>
          <p className="text-sm text-ink-5">
            Enviamos 6 dígitos por SMS para <strong className="font-bold text-ink-3">{dialCode} ••••• {lastDigits}</strong>
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <CodeBoxes
            value={code}
            invalid={Boolean(error)}
            disabled={loading}
            onChange={(value) => {
              setCode(value);
              if (error) setError(null);
              if (value.length === CODE_LENGTH) void confirmCode(value);
            }}
          />

          {error ? (
            <p role="alert" className="text-sm font-semibold text-red-600">
              {error}
            </p>
          ) : null}

          <div className="flex items-center justify-between gap-3 text-sm">
            {secondsLeft > 0 ? (
              <span className="text-ink-6">Reenviar código em {formatCountdown(secondsLeft)}</span>
            ) : (
              <button type="button" disabled={loading} onClick={() => void sendCode()} className="font-semibold text-brand-600 disabled:opacity-60">
                Reenviar código
              </button>
            )}
            <button type="button" disabled={loading} onClick={changeNumber} className="font-semibold text-brand-600 disabled:opacity-60">
              Alterar número
            </button>
          </div>
        </div>

        <button type="submit" disabled={loading || code.length < CODE_LENGTH} className={buttonClassName}>
          {loading ? 'Confirmando...' : 'Confirmar'}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={sendCode} className="flex flex-col gap-6" noValidate>
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-extrabold tracking-tight text-ink-3">Confirme seu telefone</h2>
        <p className="text-sm text-ink-5">Enviaremos um código por SMS para confirmar que é você.</p>
      </div>

      <div className="flex flex-col gap-3">
        <PhoneNumberField
          countryIso2={countryIso2}
          onCountryChange={(iso2) => {
            setCountryIso2(iso2);
            setError(null);
          }}
          value={localNumber}
          onValueChange={setLocalNumber}
          onInteract={() => setError(null)}
          placeholder="Número de telefone"
          invalid={Boolean(error)}
        />

        {error ? (
          <p role="alert" className="px-1 text-sm font-semibold text-red-600">
            {error}
          </p>
        ) : null}
      </div>

      <button type="submit" disabled={loading || localNumber.replace(/\D/g, '').length < 6} className={buttonClassName}>
        {loading ? 'Enviando...' : 'Continuar'}
      </button>
    </form>
  );
}
