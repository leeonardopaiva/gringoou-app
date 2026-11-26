'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useLanguage } from '@/components/i18n/LanguageProvider';

type WizardStepperProps = { currentStep: number; steps: string[]; className?: string };

export const WizardStepper: React.FC<WizardStepperProps> = ({ currentStep, steps, className }) => {
  const { tx } = useLanguage();
  return (
  <ol className={cn('flex w-full max-w-[500px] items-center', className)} aria-label={tx('Etapas da campanha')}>
    {steps.map((label, index) => {
      const step = index + 1;
      const active = step === currentStep;
      const complete = step < currentStep;
      return (
        <React.Fragment key={label}>
          <li className={cn('flex h-8 min-w-[96px] items-center justify-center gap-2 rounded-full px-4 text-[11px] font-bold transition', active ? 'bg-[#078cf5] text-white shadow-sm' : complete ? 'bg-[#dff1ff] text-[#0787f9]' : 'bg-[#e3e9ee] text-slate-400')} aria-current={active ? 'step' : undefined}>
            <span className={cn('flex h-4 w-4 items-center justify-center rounded-full text-[9px]', active ? 'bg-white/25' : complete ? 'bg-[#078cf5] text-white' : 'bg-surface/50')}>{complete ? <Check size={10} /> : step}</span>
            {label}
          </li>
          {index < steps.length - 1 ? <span className="h-px w-8 bg-slate-300" aria-hidden="true" /> : null}
        </React.Fragment>
      );
    })}
  </ol>
);
};
