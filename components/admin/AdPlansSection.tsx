'use client';

import { useCallback, useEffect, useState } from 'react';
import { RefreshCcw } from 'lucide-react';
import { useToast } from '@/components/feedback/ToastProvider';
import { Skeleton } from '@/components/ui';
import { InfoTip } from '@/components/ui/InfoTip';
import { formatAdCurrency } from '@/lib/ads/contracts';
import { AD_PLANS } from '@/lib/ads/contracts';
import type { AdPlanInfo } from '@/lib/ads/plans';

type Draft = { name: string; price: string; durationMonths: number; estimatedImpressions: string; description: string; highlights: string; isActive: boolean };

const toDraft = (plan: AdPlanInfo): Draft => ({
  name: plan.name,
  price: (plan.monthlyPriceCents / 100).toFixed(2),
  durationMonths: plan.durationMonths,
  estimatedImpressions: String(plan.estimatedImpressions),
  description: plan.description,
  highlights: plan.highlights.join('\n'),
  isActive: plan.isActive,
});

const blankDraft: Draft = { name: '', price: '', durationMonths: 1, estimatedImpressions: '', description: '', highlights: '', isActive: true };

const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-400';

/** Gestão dos pacotes de anúncios (somente administrador raiz): valores, vigência e disponibilidade. */
export default function AdPlansSection() {
  const { showToast } = useToast();
  const [plans, setPlans] = useState<AdPlanInfo[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/ads/plans', { cache: 'no-store' });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Não foi possível carregar os pacotes.');
      setPlans(payload.plans);
      setDrafts(Object.fromEntries(AD_PLANS.map((slot) => {
        const found = (payload.plans as AdPlanInfo[]).find((plan) => plan.plan === slot);
        return [slot, found ? toDraft(found) : blankDraft];
      })));
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Não foi possível carregar os pacotes.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { void load(); }, [load]);

  const update = (plan: string, patch: Partial<Draft>) => setDrafts((current) => ({ ...current, [plan]: { ...current[plan], ...patch } }));

  const save = async (plan: { plan: string }) => {
    const draft = drafts[plan.plan];
    setSaving(plan.plan);
    try {
      const response = await fetch('/api/admin/ads/plans', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: plan.plan,
          name: draft.name,
          monthlyPriceCents: Math.round(Number(draft.price.replace(',', '.')) * 100),
          durationMonths: draft.durationMonths,
          estimatedImpressions: Number(draft.estimatedImpressions),
          description: draft.description,
          highlights: draft.highlights.split('\n').map((line) => line.trim()).filter(Boolean),
          isActive: draft.isActive,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Não foi possível salvar o pacote.');
      setPlans(payload.plans);
      setDrafts((current) => ({ ...current }));
      showToast(`Pacote ${draft.name} atualizado. Vale para novas contratações.`, 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Não foi possível salvar o pacote.', 'error');
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="mx-auto max-w-[1100px] space-y-6 px-4 py-7 sm:px-7 lg:px-8">
      <div className="flex items-start justify-between gap-4">
        <h1 className="flex items-center gap-1.5 text-2xl font-extrabold tracking-tight text-[#132F40] sm:text-[28px]">
          Planos de anúncios
          <InfoTip text="Todos os pacotes e valores vêm daqui (nada fixo no código). A cobrança sempre usa o valor salvo no banco. Mudanças valem para novas contratações; campanhas já pagas mantêm o valor contratado." />
        </h1>
        <button type="button" aria-label="Atualizar" title="Atualizar" onClick={() => void load()} disabled={loading} className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 disabled:opacity-50">
          <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {!loading && plans.length === 0 ? (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">Nenhum pacote cadastrado. Enquanto estiver assim, a página de promover não oferece pacotes. Preencha e salve ao menos um abaixo.</p>
      ) : null}

      {loading && plans.length === 0 ? (
        <div className="grid gap-4 md:grid-cols-3"><Skeleton className="h-96" /><Skeleton className="h-96" /><Skeleton className="h-96" /></div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {AD_PLANS.map((slot, slotIndex) => {
            const plan = { plan: slot };
            const configured = plans.some((item) => item.plan === slot);
            const draft = drafts[slot];
            if (!draft) return null;
            const priceCents = Math.round(Number(draft.price.replace(',', '.')) * 100) || 0;
            return (
              <section key={plan.plan} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">Pacote {slotIndex + 1}{configured ? '' : ' · não cadastrado'}</span>
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                    <input type="checkbox" checked={draft.isActive} onChange={(event) => update(plan.plan, { isActive: event.target.checked })} /> Ativo
                  </label>
                </div>
                <label className="block text-xs font-bold text-slate-500">Nome<input className={`${inputClass} mt-1`} value={draft.name} onChange={(event) => update(plan.plan, { name: event.target.value })} /></label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-xs font-bold text-slate-500">Valor por mês (US$)<input className={`${inputClass} mt-1`} inputMode="decimal" value={draft.price} onChange={(event) => update(plan.plan, { price: event.target.value })} /></label>
                  <label className="block text-xs font-bold text-slate-500">Vigência
                    <select className={`${inputClass} mt-1`} value={draft.durationMonths} onChange={(event) => update(plan.plan, { durationMonths: Number(event.target.value) })}>
                      <option value={1}>1 mês</option><option value={3}>3 meses</option><option value={6}>6 meses</option>
                    </select>
                  </label>
                </div>
                <p className="rounded-xl bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-700">Total do contrato: {formatAdCurrency(priceCents * draft.durationMonths)}</p>
                <label className="block text-xs font-bold text-slate-500">Impressões estimadas<input className={`${inputClass} mt-1`} inputMode="numeric" value={draft.estimatedImpressions} onChange={(event) => update(plan.plan, { estimatedImpressions: event.target.value })} /></label>
                <label className="block text-xs font-bold text-slate-500">Descrição<textarea rows={2} className={`${inputClass} mt-1 resize-none`} value={draft.description} onChange={(event) => update(plan.plan, { description: event.target.value })} /></label>
                <label className="block text-xs font-bold text-slate-500">Destaques (um por linha)<textarea rows={3} className={`${inputClass} mt-1 resize-none`} value={draft.highlights} onChange={(event) => update(plan.plan, { highlights: event.target.value })} /></label>
                <button type="button" onClick={() => void save(plan)} disabled={saving === plan.plan} className="w-full rounded-xl bg-brand-500 py-2.5 text-sm font-bold text-white transition hover:brightness-105 disabled:opacity-60">
                  {saving === plan.plan ? 'Salvando...' : configured ? 'Salvar pacote' : 'Cadastrar pacote'}
                </button>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
