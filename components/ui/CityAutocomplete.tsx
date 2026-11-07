'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { LoaderCircle, MapPin } from 'lucide-react';
import { cn } from '@/lib/cn';

export type CitySuggestion = {
  id: string;
  label: string;
  city: string;
  countryCode: string;
  lat: number;
  lng: number;
};

type CityAutocompleteProps = {
  value: string;
  /** Chamado a cada digitação (texto livre) e ao escolher uma sugestão. */
  onChange: (value: string, suggestion?: CitySuggestion) => void;
  /** `world`: qualquer país (cidade natal). `us`: apenas Estados Unidos. */
  scope?: 'world' | 'us';
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
};

const MIN_CHARS = 2;

/**
 * Autocompletar de cidades com base própria (/api/places/cities).
 * O texto continua livre: se a cidade não aparecer, a pessoa pode digitar o nome.
 */
export const CityAutocomplete: React.FC<CityAutocompleteProps> = ({
  value,
  onChange,
  scope = 'world',
  placeholder = 'Digite o nome da cidade',
  error,
  disabled,
  className,
}) => {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  // Só busca quando o texto muda por digitação (não ao escolher uma sugestão).
  const searchEnabled = useRef(false);

  useEffect(() => {
    const query = value.trim();
    if (!searchEnabled.current || !open || query.length < MIN_CHARS) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ q: query, scope });
        const response = await fetch(`/api/places/cities?${params.toString()}`, { signal: controller.signal });
        const payload = await response.json().catch(() => null);
        setSuggestions(response.ok && Array.isArray(payload?.cities) ? payload.cities : []);
        setActiveIndex(-1);
      } catch (fetchError) {
        if ((fetchError as Error).name !== 'AbortError') setSuggestions([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [open, scope, value]);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const select = (suggestion: CitySuggestion) => {
    searchEnabled.current = false;
    onChange(suggestion.label, suggestion);
    setSuggestions([]);
    setOpen(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (!open || suggestions.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % suggestions.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => (current <= 0 ? suggestions.length - 1 : current - 1));
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      const suggestion = suggestions[activeIndex];
      if (suggestion) select(suggestion);
    }
  };

  const showList = open && value.trim().length >= MIN_CHARS && (suggestions.length > 0 || loading);

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <div
        className={cn(
          'flex items-center gap-2 rounded-full border-2 bg-white px-4 transition',
          error ? 'border-red-400' : 'border-slate-200 focus-within:border-brand-500',
          disabled && 'opacity-60',
        )}
      >
        <MapPin size={16} className="shrink-0 text-slate-400" aria-hidden />
        <input
          value={value}
          onChange={(event) => {
            searchEnabled.current = true;
            onChange(event.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            if (value.trim().length >= MIN_CHARS) setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
          aria-invalid={Boolean(error)}
          autoComplete="off"
          maxLength={100}
          className="h-11 w-full bg-transparent text-body-sm text-text outline-none placeholder:text-slate-400 disabled:cursor-not-allowed"
        />
        {loading ? <LoaderCircle size={16} className="shrink-0 animate-spin text-slate-400" aria-label="Buscando cidades" /> : null}
      </div>

      {showList ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-2 max-h-64 w-full overflow-y-auto rounded-2xl border border-border bg-surface p-2 shadow-lg"
        >
          {suggestions.map((suggestion, index) => (
            <li
              key={suggestion.id}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => select(suggestion)}
              className={cn(
                'cursor-pointer rounded-xl px-3 py-2 text-body-sm text-text transition hover:bg-brand-50 hover:text-brand-700',
                index === activeIndex && 'bg-brand-50 text-brand-700',
              )}
            >
              {suggestion.label}
            </li>
          ))}
          {suggestions.length === 0 && loading ? (
            <li className="px-3 py-2 text-caption text-slate-500">Buscando...</li>
          ) : null}
        </ul>
      ) : null}

      {error ? <p className="mt-1.5 text-caption font-medium text-red-600">{error}</p> : null}
    </div>
  );
};

export default CityAutocomplete;
