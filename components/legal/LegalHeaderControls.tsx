'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, ChevronDown, Globe } from 'lucide-react';
import { GringoouLogo } from '@/components/icons/GringoouLogo';

export type LegalLocale = 'pt' | 'en';

const LANGUAGES: Array<{ code: LegalLocale; label: string; short: string }> = [
  { code: 'pt', label: 'Português', short: 'Português' },
  { code: 'en', label: 'English', short: 'English' },
];

/**
 * Cabeçalho das páginas legais: botão pequeno só com ícone para voltar, logo e menu de idioma
 * (o mesmo visual do rodapé da landing). Voltar usa o histórico quando existe; senão vai para o login.
 */
export function LegalHeaderControls({ locale, path, backLabel }: { locale: LegalLocale; path: string; backLabel: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

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

  const goBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) router.back();
    else router.push('/login');
  };

  const current = LANGUAGES.find((item) => item.code === locale) ?? LANGUAGES[0];

  return (
    <div className="mb-8 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={goBack}
          aria-label={backLabel}
          title={backLabel}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-foreground transition hover:bg-brand-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
        >
          <ArrowLeft size={16} aria-hidden="true" />
        </button>
        <Link href="/" aria-label="Gringoou" className="inline-flex shrink-0 items-center text-foreground">
          <GringoouLogo size={30} />
        </Link>
      </div>

      <div ref={rootRef} className="relative">
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label="Idioma / Language"
          onClick={() => setOpen((value) => !value)}
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-500"
        >
          <Globe size={16} aria-hidden="true" className="text-brand-500" />
          {current.short}
          <ChevronDown size={13} aria-hidden="true" className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {open ? (
          <ul role="menu" className="absolute right-0 top-full z-50 mt-2 min-w-[170px] overflow-hidden rounded-2xl border border-border bg-surface p-1.5 shadow-[0_12px_32px_rgba(15,43,99,0.14)]">
            {LANGUAGES.map((item) => {
              const selected = item.code === locale;
              return (
                <li key={item.code} role="none">
                  <Link
                    href={item.code === 'pt' ? path : `${path}?lang=${item.code}`}
                    role="menuitemradio"
                    aria-checked={selected}
                    hrefLang={item.code}
                    onClick={() => setOpen(false)}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition hover:bg-brand-100 ${selected ? 'text-brand-600' : 'text-foreground'}`}
                  >
                    {item.label}
                    {selected ? <Check size={15} aria-hidden="true" /> : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
