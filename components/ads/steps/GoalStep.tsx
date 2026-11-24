'use client';

import { Check, ExternalLink, MessageCircle, ShoppingBag } from 'lucide-react';
import { Badge, Card } from '@/components/ui';
import { AD_GOALS } from '@/lib/ads/contracts';
import { cn } from '@/lib/cn';
import type { AdFieldErrors, PatchAdWizard } from '../types';
import type { AdWizardData } from '@/lib/ads/validation';

const goals = [
  { value: AD_GOALS[0], title: 'Receber mensagens no WhatsApp', description: 'Direcione clientes para uma conversa direta no WhatsApp.', icon: MessageCircle },
  { value: AD_GOALS[1], title: 'Direcionar para site/link', description: 'Envie trafego para seu site, landing page ou portfolio.', icon: ExternalLink },
  { value: AD_GOALS[2], title: 'Promover no Marketplace/Moradia', description: 'Destaque seu produto ou imóvel na seção certa do app.', icon: ShoppingBag },
] as const;

export function GoalStep({ state, errors, patch }: { state: AdWizardData; errors: AdFieldErrors; patch: PatchAdWizard }) {
  return (
    <Card className="border border-slate-200 p-6 shadow-xs">
      <div className="flex items-center gap-3"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#078cf5] text-xs font-bold text-white">1</span><Card.Title className="text-[17px]">O que você deseja alcançar com este anúncio?</Card.Title></div>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {goals.map((option) => {
          const Icon = option.icon;
          const selected = state.goal === option.value;
          return (
            <button key={option.value} type="button" onClick={() => patch({ goal: option.value, destination: '' })} className={cn('relative min-h-[172px] rounded-2xl border-2 p-5 text-left transition hover:border-[#078cf5]', selected ? 'border-[#078cf5] bg-[#f4faff] shadow-sm' : 'border-slate-200 bg-surface')}>
              <span className={cn('flex h-10 w-10 items-center justify-center rounded-full', selected ? 'bg-[#078cf5] text-white' : 'bg-slate-100 text-ink-4')}><Icon size={20} /></span>
              <p className="mt-4 text-[13px] font-extrabold text-ink-4">{option.title}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-400">{option.description}</p>
              {selected ? <Badge tone="success" className="mt-3 normal-case tracking-normal">Selecionado</Badge> : null}
              {selected ? <Check size={16} className="absolute right-4 top-4 text-[#078cf5]" /> : null}
            </button>
          );
        })}
      </div>
      {errors.goal ? <p className="mt-3 text-caption font-medium text-red-600">{errors.goal}</p> : null}
    </Card>
  );
}
