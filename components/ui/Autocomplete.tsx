'use client';

import React, { useMemo, useState } from 'react';
import { MapPin } from 'lucide-react';
import { cn } from '@/lib/cn';

type AutocompleteProps = {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  error?: string;
  disabled?: boolean;
};

const normalizeSearch = (value: string) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export const Autocomplete: React.FC<AutocompleteProps> = ({
  value,
  onChange,
  options,
  placeholder,
  error,
  disabled,
}) => {
  const [open, setOpen] = useState(false);
  const filteredOptions = useMemo(() => {
    const query = normalizeSearch(value.trim());
    if (!query) return options.slice(0, 8);
    return options.filter((option) => normalizeSearch(option).includes(query)).slice(0, 8);
  }, [options, value]);

  return (
    <div className="relative">
      <div className={cn('flex items-center gap-2 rounded-full border-2 bg-surface px-4 transition', error ? 'border-red-400' : 'border-slate-200 focus-within:border-brand-500 focus-within:theme-ring')}>
        <MapPin size={16} className="shrink-0 text-slate-400" />
        <input
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          placeholder={placeholder}
          disabled={disabled}
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          aria-invalid={Boolean(error)}
          className="h-11 w-full bg-transparent text-body-sm text-text outline-none placeholder:text-slate-400 disabled:cursor-not-allowed"
        />
      </div>
      {open && filteredOptions.length > 0 ? (
        <div role="listbox" className="absolute z-30 mt-2 max-h-56 w-full overflow-y-auto rounded-2xl border border-border bg-surface p-2 shadow-lg">
          {filteredOptions.map((option) => (
            <button
              key={option}
              type="button"
              role="option"
              aria-selected={option === value}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onChange(option);
                setOpen(false);
              }}
              className="block w-full rounded-xl px-3 py-2 text-left text-body-sm text-text transition hover:bg-brand-50 hover:text-brand-700"
            >
              {option}
            </button>
          ))}
        </div>
      ) : null}
      {error ? <p className="mt-1.5 text-caption font-medium text-red-600">{error}</p> : null}
    </div>
  );
};
