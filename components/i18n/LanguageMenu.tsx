'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Globe } from 'lucide-react';
import { useLanguage } from '@/components/i18n/LanguageProvider';
import { getAvailableLanguages } from '@/lib/i18n/languages';
import type { Language } from '@/lib/i18n/dictionaries';

// Nome curto exibido no botão do rodapé; o menu mostra o nome completo.
const SHORT_NAME: Record<Language, string> = { 'pt-BR': 'Português', 'pt-PT': 'Português (PT)', 'en-US': 'English', es: 'Español' };

type LanguageMenuProps = {
  className?: string;
  /** `pill`: botão com borda (cabeçalhos). `footer`: texto simples com globo (rodapé). */
  variant?: 'pill' | 'footer';
  /** Para onde o menu abre. No rodapé abre para cima. */
  placement?: 'down' | 'up';
};

/**
 * Menu de idioma compacto (landing e telas públicas). Só oferece os idiomas das regiões ativas:
 * o português do Brasil sempre aparece, e os demais dependem de existir uma região ativa no país.
 * Funciona sem login: /api/regions é público.
 */
export function LanguageMenu({ className = '', variant = 'pill', placement = 'down' }: LanguageMenuProps) {
  const { language, setLanguage } = useLanguage();
  const [countries, setCountries] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const options = useMemo(() => {
    const available = getAvailableLanguages(countries);
    return available.some((item) => item.code === language) ? available : [...available, { code: language, label: language }];
  }, [countries, language]);

  // Com um único idioma não há o que escolher.
  if (options.length < 2) return null;

  const buttonClass =
    variant === 'footer'
      ? 'inline-flex items-center gap-2 text-sm font-semibold text-[#6b7a9e] transition hover:text-[#0f2b63] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-500'
      : 'inline-flex h-10 items-center gap-1.5 rounded-full border border-[#dde3ef] bg-white px-3 text-xs font-extrabold text-[#0f2b63] transition hover:bg-[#f0f7ff] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500';

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button type="button" aria-haspopup="menu" aria-expanded={open} aria-label="Idioma / Language" onClick={() => setOpen((value) => !value)} className={buttonClass}>
        <Globe size={variant === 'footer' ? 16 : 15} aria-hidden="true" className={variant === 'footer' ? 'text-brand-500' : ''} />
        {SHORT_NAME[language]}
        <ChevronDown size={13} aria-hidden="true" className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open ? (
        <ul
          role="menu"
          className={`absolute right-0 z-50 min-w-[190px] overflow-hidden rounded-2xl border border-[#dde3ef] bg-white p-1.5 shadow-[0_12px_32px_rgba(15,43,99,0.14)] ${
            placement === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'
          }`}
        >
          {options.map((option) => {
            const selected = option.code === language;
            return (
              <li key={option.code} role="none">
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={selected}
                  onClick={() => {
                    setLanguage(option.code);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition hover:bg-[#f0f7ff] ${selected ? 'text-brand-600' : 'text-[#0f2b63]'}`}
                >
                  {option.label}
                  {selected ? <Check size={15} aria-hidden="true" /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

export default LanguageMenu;
