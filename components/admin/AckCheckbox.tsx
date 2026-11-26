'use client';

import { Check } from 'lucide-react';

/**
 * Caixa de confirmação bem visível (usada nas exclusões): quadrado grande com borda vermelha, que fica
 * preenchido ao marcar. O campo nativo fica escondido só visualmente, então teclado e leitor de tela funcionam.
 */
export function AckCheckbox({ checked, onChange, title, description }: { checked: boolean; onChange: (checked: boolean) => void; title: string; description?: string }) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-2xl border-2 p-4 transition ${
        checked ? 'border-red-500 bg-red-50' : 'border-red-300 bg-surface hover:border-red-400'
      }`}
    >
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="peer sr-only" />
      <span
        aria-hidden="true"
        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition peer-focus-visible:ring-2 peer-focus-visible:ring-red-300 peer-focus-visible:ring-offset-2 ${
          checked ? 'border-red-600 bg-red-600 text-white' : 'border-red-500 bg-white text-transparent'
        }`}
      >
        <Check size={16} strokeWidth={3} />
      </span>
      <span className="text-sm text-slate-700">
        <strong className={`block ${checked ? 'text-red-900' : 'text-slate-900'}`}>{title}</strong>
        {description}
      </span>
    </label>
  );
}

/** Caixa de seleção das tabelas do admin: contorno bem visível nos temas claro e escuro. */
export function TableCheckbox({ checked, onChange, label, disabled, indeterminate }: { checked: boolean; onChange: (checked: boolean) => void; label: string; disabled?: boolean; indeterminate?: boolean }) {
  return (
    <label className={`relative inline-flex h-5 w-5 items-center justify-center ${disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}`}>
      <input type="checkbox" checked={checked} disabled={disabled} aria-label={label} onChange={(event) => onChange(event.target.checked)} className="peer sr-only" />
      <span
        aria-hidden="true"
        className={`flex h-5 w-5 items-center justify-center rounded-md border-2 transition peer-focus-visible:ring-2 peer-focus-visible:ring-brand-300 peer-focus-visible:ring-offset-1 ${
          checked || indeterminate ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-400 bg-surface text-transparent'
        }`}
      >
        {indeterminate && !checked ? <span className="h-0.5 w-2.5 rounded bg-white" /> : <Check size={13} strokeWidth={3} />}
      </span>
    </label>
  );
}
