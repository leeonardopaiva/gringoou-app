'use client';

import React from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/components/theme/ThemeProvider';
import type { ThemePreference } from '@/lib/theme';
import { useLanguage } from '@/components/i18n/LanguageProvider';

const OPTIONS: Array<{ value: ThemePreference; label: string; icon: React.ReactNode }> = [
  { value: 'system', label: 'Sistema', icon: <Monitor size={16} aria-hidden="true" /> },
  { value: 'light', label: 'Claro', icon: <Sun size={16} aria-hidden="true" /> },
  { value: 'dark', label: 'Escuro', icon: <Moon size={16} aria-hidden="true" /> },
];

/** Escolha de aparência do app. A preferência fica salva neste aparelho. */
export function ThemeSelector() {
  const { tx } = useLanguage();
  const { preference, setPreference } = useTheme();

  return (
    <div role="radiogroup" aria-label={tx('Aparência do app')} className="grid grid-cols-3 gap-2">
      {OPTIONS.map((option) => {
        const selected = preference === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => setPreference(option.value)}
            className={`flex h-12 items-center justify-center gap-2 rounded-full border text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 ${
              selected
                ? 'border-brand-500 bg-brand-100 text-brand-700'
                : 'border-slate-200 bg-surface text-slate-600 hover:bg-slate-50'
            }`}
          >
            {option.icon}
            {tx(option.label)}
          </button>
        );
      })}
    </div>
  );
}

export default ThemeSelector;
