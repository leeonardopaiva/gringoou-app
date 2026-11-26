'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/components/i18n/LanguageProvider';
import { getAvailableLanguages } from '@/lib/i18n/languages';

/**
 * Escolha de idioma. Só oferece os idiomas das regiões ativas do usuário (o português do Brasil
 * sempre aparece). A preferência fica salva neste aparelho.
 */
export function LanguageSelector() {
  const { language, setLanguage } = useLanguage();
  const [countries, setCountries] = useState<string[]>([]);

  useEffect(() => {
    let ignore = false;
    fetch('/api/regions')
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (ignore || !Array.isArray(payload?.regions)) return;
        setCountries(Array.from(new Set<string>(payload.regions.map((region: { countryCode?: string }) => (region.countryCode || 'US').toUpperCase()))));
      })
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, []);

  const options = useMemo(() => {
    const available = getAvailableLanguages(countries);
    // Mantém a opção atual visível mesmo que a região dela tenha sido desativada.
    return available.some((item) => item.code === language) ? available : [...available, { code: language, label: language }];
  }, [countries, language]);

  return (
    <div role="radiogroup" aria-label="Idioma do app" className="grid gap-2 sm:grid-cols-2">
      {options.map((option) => {
        const selected = language === option.code;
        return (
          <button
            key={option.code}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => setLanguage(option.code)}
            className={`flex h-12 items-center justify-center rounded-full border text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 ${
              selected ? 'border-brand-500 bg-brand-100 text-brand-700' : 'border-slate-200 bg-surface text-slate-600 hover:bg-slate-50'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export default LanguageSelector;
