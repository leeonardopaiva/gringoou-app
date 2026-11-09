'use client';

import { Check } from 'lucide-react';
import RegionSelector from '@/components/RegionSelector';
import { Card } from '@/components/ui';
import { formatAdCurrency } from '@/lib/ads/contracts';
import { useAdPlans } from '@/hooks/useAdPlans';
import type { AdWizardData } from '@/lib/ads/validation';
import { cn } from '@/lib/cn';
import type { AdFieldErrors, PatchAdWizard } from '../types';

export function ReachAndPlanStep({ state, errors, patch }: { state: AdWizardData; errors: AdFieldErrors; patch: PatchAdWizard }) {
  const plans = useAdPlans();
  return (
    <Card className="space-y-6 border border-slate-200 p-6 shadow-xs">
      <div className="flex items-center gap-3"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#078cf5] text-xs font-bold text-white">3</span><Card.Title className="text-[17px]">Alcance &amp; Pacotes</Card.Title></div>
      <RegionSelector value={state.regionKey} onChange={(region) => patch({ regionKey: region.key })} label="Regiao da campanha" hint={errors.regionKey} />
      <div className="grid gap-4 md:grid-cols-3">
        {plans === null ? <p className="text-sm text-slate-400 md:col-span-3">Carregando pacotes...</p> : null}
        {plans?.length === 0 ? <p className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500 md:col-span-3">Nenhum pacote disponível no momento. Tente novamente mais tarde.</p> : null}
        {plans?.map((item) => {
          const plan = item.plan;
          const selected = state.plan === plan;
          return <button key={plan} type="button" onClick={() => patch({ plan, durationMonths: item.durationMonths })} className={cn('relative rounded-2xl border-2 p-6 text-left transition hover:border-[#078cf5]', selected ? plan === 'SILVER' ? 'border-[#173247] bg-[#fff98a] shadow-lg' : 'border-[#078cf5] bg-white shadow-sm' : 'border-slate-200 bg-white')}>
            <div className="flex items-center justify-between"><p className="text-[18px] font-extrabold text-[#173247]">{item.name}</p>{selected ? <Check size={18} className="text-[#078cf5]" /> : null}</div>
            <p className="mt-2 text-[28px] font-extrabold text-[#078cf5]">{formatAdCurrency(item.monthlyPriceCents * item.durationMonths)}</p>
            <p className="mt-1 text-[10px] font-semibold text-slate-400">{formatAdCurrency(item.monthlyPriceCents)} por mes</p>
            <ul className="mt-4 space-y-2 text-[11px] text-[#324b5f]"><li className="flex gap-2"><Check size={13} className="text-[#078cf5]" />{item.durationMonths} {item.durationMonths === 1 ? 'mes' : 'meses'}</li><li className="flex gap-2"><Check size={13} className="text-[#078cf5]" />{item.estimatedImpressions.toLocaleString('pt-BR')} impressoes estimadas</li>{item.highlights.map((highlight) => <li key={highlight} className="flex gap-2"><Check size={13} className="text-[#078cf5]" />{highlight}</li>)}</ul>
            <span className={cn('mt-6 flex h-10 w-full items-center justify-center rounded-full text-xs font-bold text-white', selected && plan === 'SILVER' ? 'bg-[#173247]' : 'bg-[#078cf5]')}>{selected ? 'Pacote escolhido' : 'Escolher pacote'}</span>
          </button>;
        })}
      </div>
      {errors.plan ? <p className="text-caption font-medium text-red-600">{errors.plan}</p> : null}
      {errors.durationMonths ? <p className="text-caption font-medium text-red-600">{errors.durationMonths}</p> : null}
    </Card>
  );
}
