'use client';

import React, { useId, useRef, useState } from 'react';
import { Info } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Popover } from '@/components/ui/Popover';

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
  // Hover só vale para mouse: no toque o mouseenter emulado abriria e o clique logo em seguida fecharia.
  const hoverOpen = (event: React.PointerEvent) => { if (event.pointerType === 'mouse') setOpen(true); };
  const hoverClose = (event: React.PointerEvent) => { if (event.pointerType === 'mouse') setOpen(false); };

  return (
    <span
      ref={rootRef}
      className={cn('relative inline-flex align-middle', className)}
      onPointerEnter={hoverOpen}
      onPointerLeave={hoverClose}
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
      <Popover
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={rootRef}
        align={align}
        role="tooltip"
        id={tipId}
        unstyled
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="w-64 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-xs font-normal leading-relaxed text-slate-600 shadow-lg"
      >
        {text}
      </Popover>
    </span>
  );
};

export default InfoTip;
