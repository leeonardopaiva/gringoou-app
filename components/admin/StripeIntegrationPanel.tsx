'use client';

import { useState } from 'react';
import { CheckCircle2, CircleAlert, CreditCard, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui';
import { useToast } from '@/components/feedback/ToastProvider';
import { cn } from '@/lib/cn';

type Check = { id: string; label: string; status: 'ok' | 'warn' | 'error'; detail: string };
type Report = { checkedAt: string; ok: boolean; checks: Check[] };

const ICON = {
  ok: { Icon: CheckCircle2, className: 'text-emerald-600' },
  warn: { Icon: TriangleAlert, className: 'text-amber-500' },
  error: { Icon: CircleAlert, className: 'text-red-500' },
} as const;

/** Diagnóstico e teste da integração Stripe (administrador raiz). Somente leitura: não cria cobranças. */
export default function StripeIntegrationPanel() {
  const { showToast } = useToast();
  const [report, setReport] = useState<Report | null>(null);
  const [running, setRunning] = useState(false);
  const [reconciling, setReconciling] = useState(false);

  const run = async () => {
    setRunning(true);
    try {
      const response = await fetch('/api/admin/integrations/stripe', { method: 'POST' });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? 'Não foi possível executar o diagnóstico.');
      setReport(payload);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Falha no diagnóstico.', 'error');
    } finally {
      setRunning(false);
    }
  };

  const reconcile = async () => {
    setReconciling(true);
    try {
      const response = await fetch('/api/admin/ads/reconcile', { method: 'POST' });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? 'Não foi possível verificar os pagamentos.');
      const notMoved = (payload.results as Array<{ headline: string | null; state: string; detail: string }>).filter((item) => item.state !== 'paid');
      showToast(
        payload.checked === 0
          ? 'Nenhuma campanha aguardando confirmação de pagamento.'
          : `${payload.moved} de ${payload.checked} campanha(s) enviadas para revisão.${notMoved.length ? ` Pendentes: ${notMoved.map((item) => `${item.headline || 'Campanha'} (${item.detail})`).join('; ')}` : ''}`,
        payload.moved > 0 || payload.checked === 0 ? 'success' : 'error',
      );
      await run();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Falha ao verificar pagamentos.', 'error');
    } finally {
      setReconciling(false);
    }
  };

  return (
    <section aria-label="Diagnóstico do Stripe" className="rounded-2xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><CreditCard size={18} /></span>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Stripe: diagnóstico e teste</h2>
            <p className="text-xs text-slate-400">Somente leitura. As chaves ficam no Vercel; aqui você só confere se tudo está certo.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" loading={reconciling} disabled={running} onClick={() => void reconcile()}>Verificar pagamentos pendentes</Button>
          <Button size="sm" loading={running} disabled={reconciling} onClick={() => void run()}>{report ? 'Executar de novo' : 'Executar diagnóstico'}</Button>
        </div>
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
        <p className="px-4 py-5 text-sm text-slate-400">Clique em “Executar diagnóstico” para verificar chaves, webhook, entrega de eventos e campanhas paradas.</p>
      )}
    </section>
  );
}
