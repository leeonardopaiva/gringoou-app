'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { Info } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface InfoTipProps {
  /** Texto explicativo mostrado ao passar o mouse, focar ou tocar. */
  text: string;
  className?: string;
  align?: 'start' | 'end';
}

/** Ícone discreto (cinza claro) que abre uma dica curta; substitui parágrafos informativos fixos. */
export const InfoTip: React.FC<InfoTipProps> = ({ text, className, align = 'start' }) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);
  const tipId = useId();

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | TouchEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('touchstart', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('touchstart', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <span
      ref={rootRef}
      className={cn('relative inline-flex align-middle', className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label="Mais informações"
        aria-expanded={open}
        aria-describedby={open ? tipId : undefined}
        onClick={() => setOpen((value) => !value)}
        className="flex h-5 w-5 items-center justify-center rounded-full text-slate-300 transition hover:text-slate-500 focus-visible:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200"
      >
        <Info size={15} aria-hidden />
      </button>
      {open ? (
        <span
          id={tipId}
          role="tooltip"
          className={cn(
            'absolute top-full z-50 mt-1.5 w-64 max-w-[80vw] rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-xs font-normal leading-relaxed text-slate-600 shadow-lg',
            align === 'end' ? 'right-0' : 'left-0',
          )}
        >
          {text}
        </span>
      ) : null}
    </span>
  );
};

export default InfoTip;
