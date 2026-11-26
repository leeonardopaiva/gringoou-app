'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Mail } from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { useToast } from '../feedback/ToastProvider';
import { useLanguage } from '@/components/i18n/LanguageProvider';
import { sanitizeUserMessage } from '@/lib/user-error';

type CountryOption = { country: string | null; count: number };
type ReleaseResult = {
  eligible: number;
  sent: number;
  failed: number;
  skipped: number;
  remainingPending: number;
  failures: Array<{ email: string; error: string }>;
};

const NO_COUNTRY = '__none__';
const BATCH = 50;

/**
 * Libera o acesso de quem está na lista de espera em lotes escolhidos pelo admin: mostra quantas pessoas
 * receberão e-mail antes de confirmar e envia em blocos de 50, com progresso e relatório de falhas.
 */
export function ReleaseAccessModal({
  open,
  onClose,
  countries,
  initialCountry,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  countries: CountryOption[];
  initialCountry: string;
  onDone: () => void;
}) {
  const { tx } = useLanguage();
  const { showToast } = useToast();
  const [country, setCountry] = useState(initialCountry);
  const [eligible, setEligible] = useState<number | null>(null);
  const [quantity, setQuantity] = useState('');
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [summary, setSummary] = useState<ReleaseResult | null>(null);
  const runningRef = useRef(false);

  const countryLabel = (value: string | null) => (value === null ? tx('Sem país informado') : value);

  // Ao abrir ou trocar o país, consulta quantas pessoas seriam liberadas (sem enviar nada).
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setEligible(null);
    setSummary(null);
    void fetch('/api/admin/waitlist/release', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dryRun: true, limit: 1, country: country || null }),
    })
      .then((response) => response.json())
      .then((payload: Partial<ReleaseResult>) => {
        if (cancelled) return;
        const total = payload.eligible ?? 0;
        setEligible(total);
        setQuantity(String(Math.min(total, 100)));
      })
      .catch(() => {
        if (!cancelled) setEligible(0);
      });
    return () => {
      cancelled = true;
    };
  }, [open, country]);

  useEffect(() => {
    if (open) setCountry(initialCountry);
  }, [open, initialCountry]);

  const target = Math.max(0, Math.min(eligible ?? 0, Math.floor(Number(quantity) || 0)));

  const start = async () => {
    if (runningRef.current || target < 1) return;
    runningRef.current = true;
    setRunning(true);
    setSummary(null);
    setProgress({ done: 0, total: target });

    const total: ReleaseResult = { eligible: eligible ?? 0, sent: 0, failed: 0, skipped: 0, remainingPending: 0, failures: [] };
    let handled = 0;

    try {
      while (handled < target) {
        const response = await fetch('/api/admin/waitlist/release', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ limit: Math.min(BATCH, target - handled), country: country || null }),
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(sanitizeUserMessage(payload?.error, 'Não foi possível enviar agora.'));

        const result = payload as ReleaseResult;
        total.sent += result.sent;
        total.failed += result.failed;
        total.skipped += result.skipped;
        total.remainingPending = result.remainingPending;
        total.failures.push(...result.failures);

        const step = result.sent + result.failed + result.skipped;
        handled += step;
        setProgress({ done: Math.min(handled, target), total: target });
        // Nada mais a processar ou o envio está falhando em tudo: para e mostra o relatório.
        if (step === 0 || (result.sent === 0 && result.failed > 0)) break;
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : tx('Não foi possível enviar agora.'), 'error');
    } finally {
      runningRef.current = false;
      setRunning(false);
      setSummary(total);
      onDone();
    }
  };

  const handleClose = () => {
    if (running) return;
    setSummary(null);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={tx('Liberar acesso')}
      description={tx('Cada pessoa recebe um e-mail com o convite pessoal para criar a conta.')}
      footer={
        summary ? (
          <div className="flex justify-end">
            <Button onClick={handleClose}>{tx('Fechar')}</Button>
          </div>
        ) : (
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={handleClose} disabled={running}>
              {tx('Cancelar')}
            </Button>
            <Button iconLeft={<Mail size={15} />} loading={running} disabled={target < 1} onClick={() => void start()}>
              {running ? `${progress.done} / ${progress.total}` : `${tx('Enviar')} ${target} ${target === 1 ? tx('e-mail') : tx('e-mails')}`}
            </Button>
          </div>
        )
      }
    >
      {summary ? (
        <div className="space-y-3 text-sm">
          <p className="font-bold text-slate-800">
            {summary.sent} {summary.sent === 1 ? tx('e-mail enviado') : tx('e-mails enviados')}
            {summary.failed > 0 ? ` · ${summary.failed} ${tx('com falha')}` : ''}
            {summary.skipped > 0 ? ` · ${summary.skipped} ${tx('já tratados')}` : ''}
          </p>
          <p className="text-slate-500">
            {summary.remainingPending} {tx('pessoas ainda aguardando liberação.')}
          </p>
          {summary.failures.length > 0 ? (
            <div className="rounded-2xl border border-red-100 bg-red-50 p-3 text-xs text-red-700">
              <p className="mb-1 font-bold">{tx('Falhas (essas pessoas continuam aguardando; tente de novo depois):')}</p>
              <ul className="space-y-0.5">
                {summary.failures.map((failure) => (
                  <li key={failure.email} className="break-all">
                    {failure.email}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">{tx('País')}</label>
            <select
              value={country}
              disabled={running}
              onChange={(event) => setCountry(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-surface px-3 py-2.5 text-sm"
            >
              <option value="">{tx('Todos os países')}</option>
              {countries.map((item) => (
                <option key={item.country ?? NO_COUNTRY} value={item.country ?? NO_COUNTRY}>
                  {countryLabel(item.country)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">{tx('Quantas pessoas liberar')}</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={eligible ?? 0}
                value={quantity}
                disabled={running || !eligible}
                onChange={(event) => setQuantity(event.target.value)}
                className="w-32 rounded-xl border border-slate-200 bg-surface px-3 py-2.5 text-sm"
              />
              <button
                type="button"
                disabled={running || !eligible}
                onClick={() => setQuantity(String(eligible ?? 0))}
                className="rounded-full px-3 py-1.5 text-xs font-bold text-brand-600 hover:bg-brand-50 disabled:opacity-50"
              >
                {tx('Todas')}
              </button>
            </div>
            <p className="mt-1.5 text-xs text-slate-500" aria-live="polite">
              {eligible === null ? tx('Calculando...') : `${eligible} ${tx('pessoas aguardando neste filtro.')}`}
            </p>
          </div>

          {target > 0 ? (
            <p className="rounded-2xl bg-wash-1 p-3 text-xs text-slate-600">
              {tx('Serão enviados')} <strong>{target}</strong> {target === 1 ? tx('e-mail') : tx('e-mails')} {tx('e criados os convites, válidos por 30 dias. Para evitar cair no spam, prefira lotes pequenos nos primeiros envios.')}
            </p>
          ) : null}
        </div>
      )}
    </Modal>
  );
}
