'use client';

import React, { useRef, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { Popover } from './Popover';
import { cn } from '../../lib/cn';

export interface FilterPopoverProps {
  children: React.ReactNode;
  label?: string;
  /** Quantidade de filtros ativos (fora do padrão); aparece como selo no botão. */
  activeCount?: number;
  triggerClassName?: string;
  panelClassName?: string;
}

/**
 * Shared trigger + Popover pair for list-page filters: keeps the previously
 * exposed filter controls, just tucked behind a single Filter button so they
 * stop occupying permanent space in the layout.
 */
export const FilterPopover: React.FC<FilterPopoverProps> = ({
  children,
  label = 'Filtros',
  activeCount = 0,
  triggerClassName,
  panelClassName,
}) => {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          'inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700',
          triggerClassName,
        )}
      >
        <SlidersHorizontal size={15} /> {label}
        {activeCount > 0 ? <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-500 px-1 text-[11px] font-bold text-white">{activeCount}</span> : null}
      </button>
      <Popover
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={triggerRef}
        align="start"
        className={cn('max-h-[75dvh] w-[min(92vw,380px)] overflow-y-auto p-4', panelClassName)}
      >
        <div className="grid gap-3">{children}</div>
      </Popover>
    </>
  );
};
