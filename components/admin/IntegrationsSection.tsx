'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ExternalLink, RefreshCcw } from 'lucide-react';
import { useToast } from '@/components/feedback/ToastProvider';
import { Skeleton } from '@/components/ui';
import { InfoTip } from '@/components/ui/InfoTip';
import StripeIntegrationPanel from '@/components/admin/StripeIntegrationPanel';
import type { IntegrationState, IntegrationStatus } from '@/lib/integrations';

const STATUS: Record<IntegrationStatus, { label: string; dot: string; chip: string }> = {
  configured: { label: 'Configurada', dot: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-700' },
  partial: { label: 'Incompleta', dot: 'bg-amber-500', chip: 'bg-amber-50 text-amber-700' },
  missing: { label: 'Não configurada', dot: 'bg-slate-300', chip: 'bg-slate-100 text-slate-500' },
};

/** Painel de integrações: mostra quais APIs externas estão ligadas e o que falta configurar. */
export default function IntegrationsSection() {
  const { showToast } = useToast();
  const [items, setItems] = useState<IntegrationState[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/integrations', { cache: 'no-store' });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Não foi possível carregar as integrações.');
      setItems(payload.integrations || []);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Não foi possível carregar as integrações.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const groups = useMemo(() => {
    const map = new Map<string, IntegrationState[]>();
    for (const item of items) map.set(item.category, [...(map.get(item.category) ?? []), item]);
    return [...map.entries()];
  }, [items]);

  const configured = items.filter((item) => item.status === 'configured').length;

  return (
    <div className="mx-auto max-w-[1100px] space-y-6 px-4 py-7 sm:px-7 lg:px-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-1.5 text-2xl font-extrabold tracking-tight text-[#132F40] sm:text-[28px]">
            Integrações
            <InfoTip text="APIs e serviços externos usados pela plataforma. Para adicionar uma nova, registre-a em lib/integrations.ts com as variáveis de ambiente que ela exige; os valores ficam no ambiente e nunca aparecem aqui." />
          </h1>
          {!loading ? <p className="mt-1 text-sm text-slate-400">{configured} de {items.length} configuradas</p> : null}
        </div>
        <button type="button" aria-label="Atualizar" title="Atualizar" onClick={() => void load()} disabled={loading} className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 disabled:opacity-50">
          <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <StripeIntegrationPanel />

      {loading && items.length === 0 ? (
        <div className="space-y-3" role="status" aria-label="Carregando integrações">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : (
        groups.map(([category, list]) => (
          <section key={category} aria-label={category}>
            <h2 className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-slate-400">{category}</h2>
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
              {list.map((item) => {
                const state = STATUS[item.status];
                return (
                  <li key={item.id} className="flex items-center gap-3 px-4 py-3.5">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${state.dot}`} aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1 text-sm font-bold text-slate-900">
                        {item.name}
                        <InfoTip text={item.description} />
                      </p>
                      {item.status !== 'configured' ? (
                        <p className="mt-0.5 truncate text-xs text-slate-400">Falta: {item.missingEnv.join(', ')}</p>
                      ) : null}
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${state.chip}`}>{state.label}</span>
                    {item.docsUrl ? (
                      <a href={item.docsUrl} target="_blank" rel="noopener noreferrer" aria-label={`Abrir painel de ${item.name}`} title="Abrir painel do serviço" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-50 hover:text-slate-600">
                        <ExternalLink size={15} />
                      </a>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
