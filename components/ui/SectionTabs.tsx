'use client';

import React, { useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { Popover } from './Popover';
import { cn } from '../../lib/cn';

export interface SectionTabsOption {
  id: string;
  label: string;
}

export interface SectionTabsProps {
  options: readonly SectionTabsOption[];
  value: string;
  onChange: (id: string) => void;
  ariaLabel?: string;
  className?: string;
}

/**
 * Desktop keeps the existing pill-tab row, its own line below the section
 * header. Mobile collapses the same options/value/onChange into a single
 * dropdown so it can sit inline next to the subtitle and Filtros button.
 * Exposed separately (SectionTabs.Desktop / .Mobile) so pages that pair
 * tabs with a Filtros button can place each variant on the right row;
 * the default SectionTabs renders both stacked for simpler pages.
 */
const Desktop: React.FC<SectionTabsProps> = ({ options, value, onChange, ariaLabel, className }) => (
  <div className={cn('hidden items-center gap-2 overflow-x-auto pb-1 md:flex', className)} aria-label={ariaLabel}>
    {options.map((option) => (
      <button
        key={option.id}
        type="button"
        onClick={() => onChange(option.id)}
        className={cn(
          'shrink-0 whitespace-nowrap rounded-2xl border px-4 py-2 text-xs font-bold shadow-sm transition',
          value === option.id
            ? 'border-transparent bg-brand-500 text-white'
            : 'border-slate-100 bg-white text-slate-700 hover:bg-brand-50 hover:text-brand-600',
        )}
      >
        {option.label}
      </button>
    ))}
  </div>
);

const Mobile: React.FC<SectionTabsProps> = ({ options, value, onChange, ariaLabel, className }) => {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const activeLabel = options.find((option) => option.id === value)?.label ?? options[0]?.label ?? '';

  return (
    <div className="md:hidden">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label={ariaLabel}
        className={cn(
          'inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700',
          className,
        )}
      >
        {activeLabel}
        <ChevronDown size={14} className={cn('transition-transform', open && 'rotate-180')} />
      </button>
      <Popover open={open} onClose={() => setOpen(false)} anchorRef={triggerRef} align="end" className="w-48 p-1.5">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => {
              onChange(option.id);
              setOpen(false);
            }}
            className={cn(
              'flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold transition',
              value === option.id ? 'bg-brand-50 text-brand-600' : 'text-slate-700 hover:bg-slate-50',
            )}
          >
            {option.label}
            {value === option.id ? <Check size={14} /> : null}
          </button>
        ))}
      </Popover>
    </div>
  );
};

const Root: React.FC<SectionTabsProps> = (props) => (
  <>
    <Desktop {...props} />
    <Mobile {...props} />
  </>
);

export const SectionTabs = Object.assign(Root, { Desktop, Mobile });
