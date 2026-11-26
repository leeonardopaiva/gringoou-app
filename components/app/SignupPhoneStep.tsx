'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, RefreshCcw } from 'lucide-react';
import PhoneNumberField from '@/components/forms/PhoneNumberField';
import { CODE_LENGTH, CodeBoxes } from '@/components/app/VerifyPhoneForm';
import { useLanguage } from '@/components/i18n/LanguageProvider';
import { findCountryByIso2 } from '@/lib/country-calling-codes';
import { buildInternationalPhone } from '@/lib/forms/phone';
import { sanitizeUserMessage } from '@/lib/user-error';

const RESEND_SECONDS = 60;
const inputClass =
  'h-14 min-h-14 w-full min-w-0 rounded-full border border-input bg-surface px-5 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-200';
const primaryButton =
  'h-14 w-full justify-center rounded-full bg-brand-500 px-6 text-base font-semibold text-white shadow-sm transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50';

const formatCountdown = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

/**
 * Primeiro passo do cadastro: só o telefone (e o captcha). A pessoa recebe o SMS, digita o código e só
 * então aparecem os demais campos. O servidor devolve uma prova assinada do telefone confirmado, que o
 * cadastro exige (ver /api/auth/phone/* e /api/auth/register).
 */
export function SignupPhoneStep({ onVerified, onBack }: { onVerified: (value: { phone: string; token: string }) => void; onBack: () => void }) {
  const { tx } = useLanguage();
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [countryIso2, setCountryIso2] = useState('US');
  const [localNumber, setLocalNumber] = useState('');
  const phone = buildInternationalPhone(countryIso2, localNumber);
  const [code, setCode] = useState('');
  const [challenge, setChallenge] = useState<string | null>(null);
  const [captchaPrompt, setCaptchaPrompt] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [loadingCaptcha, setLoadingCaptcha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const loadCaptcha = useCallback(async () => {
    setLoadingCaptcha(true);
    try {
      const response = await fetch('/api/auth/captcha', { cache: 'no-store' });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.prompt || !payload?.token) throw new Error('captcha');
      setCaptchaPrompt(payload.prompt);
      setCaptchaToken(payload.token);
      setCaptchaAnswer('');
    } catch {
      setCaptchaPrompt('');
      setCaptchaToken('');
    } finally {
      setLoadingCaptcha(false);
    }
  }, []);

  useEffect(() => {
    void loadCaptcha();
  }, [loadCaptcha]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = window.setTimeout(() => setSecondsLeft((current) => current - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [secondsLeft]);

  const postJson = async (url: string, body: unknown) => {
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return { ok: response.ok, data: await response.json().catch(() => null) };
  };

  const sendCode = async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (loading) return;
    if (!captchaAnswer.trim()) {
      setError(tx('Resolva o cálculo de verificação.'));
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const { ok, data } = await postJson('/api/auth/phone/start', { phone, captchaToken, captchaAnswer });
      // Cada captcha vale uma vez: sempre pede um novo depois da tentativa.
      void loadCaptcha();
      if (!ok) {
        setError(sanitizeUserMessage(data?.error, 'Não foi possível enviar o código agora.'));
        return;
      }
      setChallenge(data?.challenge ?? null);
      setStep('code');
      setCode('');
      setSecondsLeft(RESEND_SECONDS);
    } catch {
      setError(tx('Não foi possível enviar o código agora. Tente novamente.'));
    } finally {
      setLoading(false);
    }
  };

  const confirmCode = async (value: string) => {
    if (loading || value.length !== CODE_LENGTH) return;
    setError(null);
    setLoading(true);
    try {
      const { ok, data } = await postJson('/api/auth/phone/check', { phone, code: value, challenge });
      if (!ok || !data?.phoneToken) {
        setError(sanitizeUserMessage(data?.error, 'Código inválido. Tente novamente.'));
        setCode('');
        return;
      }
      onVerified({ phone: data.phone ?? phone, token: data.phoneToken });
    } catch {
      setError(tx('Não foi possível confirmar o código agora. Tente novamente.'));
    } finally {
      setLoading(false);
    }
  };

  const backToPhone = () => {
    setStep('phone');
    setCode('');
    setError(null);
  };

  const header = (
    <div className="flex items-center justify-between gap-3 pb-1">
      <p className="text-sm font-bold text-slate-900">{tx('Criar minha conta')}</p>
      <button
        type="button"
        onClick={step === 'code' ? backToPhone : onBack}
        aria-label={tx('Voltar')}
        className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
      >
        <ArrowLeft size={17} />
      </button>
    </div>
  );

  if (step === 'code') {
    const dialCode = findCountryByIso2(countryIso2).dialCode;
    const lastDigits = localNumber.replace(/\D/g, '').slice(-4);

    return (
      <form className="w-full max-w-[360px] space-y-4 pt-2" onSubmit={(event) => { event.preventDefault(); void confirmCode(code); }} noValidate>
        {header}
        <p className="text-sm text-slate-600">
          {tx('Enviamos 6 dígitos por SMS para')} <strong className="font-bold text-slate-900">{dialCode} ••••• {lastDigits}</strong>
        </p>
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
        {error ? <p role="alert" className="text-sm font-semibold text-red-600">{error}</p> : null}
        <div className="flex items-center justify-between gap-3 text-sm">
          {secondsLeft > 0 ? (
            <span className="text-slate-500">{tx('Reenviar código em')} {formatCountdown(secondsLeft)}</span>
          ) : (
            <button type="button" disabled={loading} onClick={backToPhone} className="font-semibold text-brand-600 disabled:opacity-60">
              {tx('Reenviar código')}
            </button>
          )}
          <button type="button" disabled={loading} onClick={backToPhone} className="font-semibold text-brand-600 disabled:opacity-60">
            {tx('Alterar número')}
          </button>
        </div>
        <button type="submit" disabled={loading || code.length < CODE_LENGTH} className={primaryButton}>
          {loading ? tx('Confirmando...') : tx('Confirmar')}
        </button>
      </form>
    );
  }

  return (
    <form className="w-full max-w-[360px] space-y-3 pt-2" onSubmit={sendCode} noValidate>
      {header}
      <p className="text-xs leading-5 text-slate-500">{tx('Primeiro, confirme seu telefone. Enviaremos um código por SMS.')}</p>
      <PhoneNumberField
        countryIso2={countryIso2}
        onCountryChange={(iso2) => { setCountryIso2(iso2); setError(null); }}
        value={localNumber}
        onValueChange={setLocalNumber}
        onInteract={() => setError(null)}
        placeholder={tx('Número de telefone')}
        invalid={Boolean(error)}
      />

      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
        <p className="flex-1 text-sm font-medium text-slate-700">
          {loadingCaptcha ? tx('Carregando captcha...') : captchaPrompt || tx('Captcha temporariamente indisponível')}
        </p>
        <button type="button" onClick={() => void loadCaptcha()} aria-label={tx('Gerar novo captcha')} className="text-slate-500">
          <RefreshCcw size={16} className={loadingCaptcha ? 'animate-spin' : ''} />
        </button>
      </div>
      <input
        type="text"
        inputMode="numeric"
        placeholder={tx('Resultado')}
        value={captchaAnswer}
        onChange={(event) => {
          setCaptchaAnswer(event.target.value);
          if (error) setError(null);
        }}
        className={inputClass}
      />

      {error ? <p role="alert" className="px-1 text-sm font-semibold text-red-600">{error}</p> : null}

      <button type="submit" disabled={loading || loadingCaptcha || !captchaToken || localNumber.replace(/\D/g, '').length < 6} className={primaryButton}>
        {loading ? tx('Enviando...') : tx('Enviar código')}
      </button>
    </form>
  );
}
