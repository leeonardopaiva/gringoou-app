'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Clock3, Gift, LayoutDashboard, Megaphone, PartyPopper, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/cn';

const STORAGE_KEY = 'gringoou:ad-wizard-draft';

type AdReviewConfirmationProps = {
  headline: string | null;
  /** Como a campanha foi liberada: cortesia (sem cobrança), pagamento confirmado ou pagamento ainda em processamento. */
  kind: 'courtesy' | 'paid' | 'processing' | 'failed';
};

const COPY = {
  courtesy: {
    badge: 'Cortesia aplicada',
    title: 'Parabéns! Sua campanha foi enviada',
    lead: 'Você ganhou esta campanha de cortesia, sem nenhuma cobrança.',
  },
  paid: {
    badge: 'Pagamento confirmado',
    title: 'Parabéns! Sua campanha foi enviada',
    lead: 'Recebemos o seu pagamento e a campanha já está com a nossa equipe.',
  },
  processing: {
    badge: 'Pagamento em processamento',
    title: 'Quase lá!',
    lead: 'Estamos confirmando o seu pagamento. Isso costuma levar poucos instantes.',
  },
  failed: {
    badge: 'Pagamento não aprovado',
    title: 'Não foi possível confirmar o pagamento',
    lead: 'O pagamento foi recusado ou não foi concluído, então a campanha não foi enviada para análise. Você não foi cobrado. Tente novamente com outro cartão ou forma de pagamento.',
  },
} as const;

export function AdReviewConfirmation({ headline, kind }: AdReviewConfirmationProps) {
  const router = useRouter();
  const copy = COPY[kind];

  useEffect(() => {
    sessionStorage.removeItem(STORAGE_KEY);
  }, []);

  if (kind === 'failed') {
    return (
      <div className="mx-auto flex w-full max-w-[640px] flex-col gap-5 py-8 sm:py-12">
        <section className="rounded-3xl border border-red-100 bg-white px-6 py-9 text-center shadow-sm sm:px-10">
          <span className="inline-flex rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700">{copy.badge}</span>
          <h1 className="mt-3 text-2xl font-extrabold leading-tight text-[#132f40] sm:text-3xl">{copy.title}</h1>
          {headline ? <p className="mt-2 text-base font-semibold text-[#243b53]">“{headline}”</p> : null}
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">{copy.lead}</p>
        </section>
        <div className="flex justify-center">
          <Button onClick={() => router.push('/ads/overview')}>Ver minhas campanhas</Button>
        </div>
      </div>
    );
  }

  const steps = [
    { icon: Check, title: kind === 'courtesy' ? 'Cortesia recebida' : 'Pedido recebido', text: 'Sua campanha está registrada.', state: kind === 'processing' ? 'current' : 'done' },
    { icon: ShieldCheck, title: 'Análise da equipe', text: 'Conferimos o conteúdo antes de colocar no ar. Avisamos você por e-mail.', state: kind === 'processing' ? 'todo' : 'current' },
    { icon: Megaphone, title: 'No ar', text: 'Depois de aprovada, a campanha começa a aparecer para a sua região.', state: 'todo' },
  ] as const;

  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-col gap-5 py-8 sm:py-12">
      <section className="rounded-3xl border border-slate-200 bg-white px-6 py-9 text-center shadow-sm sm:px-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          {kind === 'processing' ? <Clock3 size={30} /> : <PartyPopper size={30} />}
        </div>
        <span className="mt-4 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">{copy.badge}</span>
        <h1 className="mt-3 text-2xl font-extrabold leading-tight text-[#132f40] sm:text-3xl">{copy.title}</h1>
        {headline ? <p className="mt-2 text-base font-semibold text-[#243b53]">“{headline}”</p> : null}
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">{copy.lead}</p>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white px-6 py-6 shadow-sm sm:px-8" aria-label="Status da campanha">
        <h2 className="text-sm font-bold text-[#243b53]">O que acontece agora</h2>
        <ol className="mt-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const last = index === steps.length - 1;
            return (
              <li key={step.title} className="relative flex gap-4 pb-6 last:pb-0">
                {!last ? <span className="absolute left-[17px] top-9 h-[calc(100%-2.25rem)] w-px bg-slate-200" aria-hidden /> : null}
                <span
                  className={cn(
                    'z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border',
                    step.state === 'done' && 'border-emerald-200 bg-emerald-50 text-emerald-600',
                    step.state === 'current' && 'border-amber-200 bg-amber-50 text-amber-600',
                    step.state === 'todo' && 'border-slate-200 bg-slate-50 text-slate-400',
                  )}
                >
                  <Icon size={17} />
                </span>
                <div className="min-w-0 pt-0.5">
                  <p className="text-sm font-bold text-[#243b53]">
                    {step.title}
                    {step.state === 'current' ? <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700">Agora</span> : null}
                  </p>
                  <p className="mt-0.5 text-sm leading-5 text-slate-500">{step.text}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {kind === 'courtesy' ? (
        <section className="flex gap-3 rounded-2xl border border-sky-100 bg-sky-50/70 px-5 py-4">
          <Gift size={20} className="mt-0.5 shrink-0 text-brand-500" />
          <div className="text-sm leading-6 text-slate-600">
            <p className="font-bold text-[#243b53]">Sobre a sua cortesia</p>
            <p>Ela vale para esta campanha e não renova sozinha.</p>
            <p>Quando o período terminar, você pode contratar um pacote em Campanhas para continuar anunciando.</p>
          </div>
        </section>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button iconLeft={<LayoutDashboard size={17} />} onClick={() => router.push('/ads/overview')}>
          Ver minhas campanhas
        </Button>
        <Button variant="secondary" iconLeft={<Megaphone size={17} />} onClick={() => router.push('/ads/wizard')}>
          Criar outra campanha
        </Button>
      </div>
    </div>
  );
}
