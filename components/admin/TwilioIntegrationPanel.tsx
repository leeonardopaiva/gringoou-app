'use client';

import { useState } from 'react';
import { CheckCircle2, CircleAlert, MessageSquareText, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui';
import { useToast } from '@/components/feedback/ToastProvider';
import { cn } from '@/lib/cn';

type Check = { id: string; label: string; status: 'ok' | 'warn' | 'error'; detail: string };
type Report = { checkedAt: string; ok: boolean; checks: Check[] };
type TestResult = { ok: boolean; message: string };

const ICON = {
  ok: { Icon: CheckCircle2, className: 'text-emerald-600' },
  warn: { Icon: TriangleAlert, className: 'text-amber-500' },
  error: { Icon: CircleAlert, className: 'text-red-500' },
} as const;

const inputClassName =
  'w-full rounded-xl border border-slate-200 bg-surface px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';

/**
 * Diagnóstico e teste do Twilio Verify (administrador raiz). O diagnóstico só lê; o teste do validador
 * envia um SMS real para o número informado e confere o código, sem alterar nenhuma conta de usuário.
 */
export default function TwilioIntegrationPanel() {
  const { showToast } = useToast();
  const [report, setReport] = useState<Report | null>(null);
  const [running, setRunning] = useState(false);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);

  const call = async (body: Record<string, string>) => {
    const response = await fetch('/api/admin/integrations/twilio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error ?? 'Não foi possível executar o teste.');
    return payload;
  };

  const diagnose = async () => {
    setRunning(true);
    try {
      setReport(await call({ action: 'diagnose' }));
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Falha no diagnóstico.', 'error');
    } finally {
      setRunning(false);
    }
  };

  const sendTest = async () => {
    setTesting(true);
    setResult(null);
    try {
      const payload = await call({ action: 'send', phone });
      setResult({ ok: Boolean(payload.ok), message: payload.message });
      setSent(Boolean(payload.ok));
    } catch (error) {
      setResult({ ok: false, message: error instanceof Error ? error.message : 'Falha no envio.' });
    } finally {
      setTesting(false);
    }
  };

  const checkTest = async () => {
    setTesting(true);
    setResult(null);
    try {
      const payload = await call({ action: 'check', phone, code });
      setResult({ ok: Boolean(payload.ok), message: payload.message });
      if (payload.ok) {
        setSent(false);
        setCode('');
      }
    } catch (error) {
      setResult({ ok: false, message: error instanceof Error ? error.message : 'Falha na conferência.' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <section aria-label="Diagnóstico do Twilio" className="rounded-2xl border border-slate-200 bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-600"><MessageSquareText size={18} /></span>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Twilio: diagnóstico e validador</h2>
            <p className="text-xs text-slate-400">O diagnóstico só lê. As credenciais ficam no Vercel; aqui você confere se tudo está certo.</p>
          </div>
        </div>
        <Button size="sm" loading={running} onClick={() => void diagnose()}>{report ? 'Executar de novo' : 'Executar diagnóstico'}</Button>
      </div>

      {report ? (
        <>
          <div className={cn('px-4 py-2.5 text-xs font-bold', report.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700')}>
            {report.ok ? 'Nenhum erro encontrado.' : 'Há itens que precisam de correção.'}
            <span className="ml-2 font-medium opacity-70">{new Date(report.checkedAt).toLocaleString('pt-BR')}</span>
          </div>
          <ul className="divide-y divide-slate-100">
            {report.checks.map((check) => {
              const { Icon, className } = ICON[check.status];
              return (
                <li key={check.id} className="flex items-start gap-3 px-4 py-3">
                  <Icon size={18} className={cn('mt-0.5 shrink-0', className)} aria-hidden />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900">{check.label}</p>
                    <p className="mt-0.5 break-words text-xs leading-5 text-slate-500">{check.detail}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <p className="px-4 py-5 text-sm text-slate-400">Clique em “Executar diagnóstico” para verificar variáveis, conta, Verify Service e países.</p>
      )}

      <div className="space-y-3 border-t border-slate-100 px-4 py-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Testar o validador</h3>
          <p className="text-xs text-slate-400">Envia um SMS real (com custo) para o número abaixo e confere o código. Não altera nenhuma conta. Use o formato internacional, por exemplo +1 305 000 0000.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="tel"
            inputMode="tel"
            autoComplete="off"
            aria-label="Telefone para o teste"
            placeholder="+1 305 000 0000"
            value={phone}
            onChange={(event) => { setPhone(event.target.value); setSent(false); setResult(null); }}
            className={inputClassName}
          />
          <Button size="sm" loading={testing && !sent} disabled={testing || phone.replace(/\D/g, '').length < 8} onClick={() => void sendTest()}>
            {sent ? 'Reenviar código' : 'Enviar código de teste'}
          </Button>
        </div>
        {sent ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              aria-label="Código recebido"
              placeholder="Código recebido"
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 8))}
              className={inputClassName}
            />
            <Button size="sm" variant="secondary" loading={testing} disabled={testing || code.length < 4} onClick={() => void checkTest()}>Conferir código</Button>
          </div>
        ) : null}
        {result ? (
          <p role="status" className={cn('rounded-xl px-3 py-2 text-xs font-semibold', result.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700')}>
            {result.message}
          </p>
        ) : null}
      </div>
    </section>
  );
}
