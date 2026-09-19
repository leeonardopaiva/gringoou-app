'use client';

import { useEffect, useRef, useState } from 'react';
import { LoaderCircle, MapPin } from 'lucide-react';

type AddressAutocompleteProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
};

type AddressSuggestion = {
  id: string;
  label: string;
};

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

export default function AddressAutocomplete({ value, onChange, placeholder = 'Pesquise o endereço completo', className = '', disabled = false }: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!MAPBOX_TOKEN || value.trim().length < 3 || !open) {
      setSuggestions([]);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          q: value.trim().slice(0, 256),
          access_token: MAPBOX_TOKEN,
          autocomplete: 'true',
          limit: '5',
          language: 'pt,en',
        });
        const response = await fetch(`https://api.mapbox.com/search/geocode/v6/forward?${params.toString()}`, { signal: controller.signal });
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error('Falha ao pesquisar endereço.');
        const nextSuggestions = Array.isArray(payload?.features)
          ? payload.features.map((feature: { id?: string; properties?: { full_address?: string; name?: string; place_formatted?: string } }) => {
              const properties = feature.properties ?? {};
              const label = properties.full_address || [properties.name, properties.place_formatted].filter(Boolean).join(', ');
              return { id: feature.id || label, label };
            }).filter((item: AddressSuggestion) => item.label)
          : [];
        setSuggestions(nextSuggestions);
      } catch (error) {
        if ((error as Error).name !== 'AbortError') setSuggestions([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 400);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <div className="relative">
        <MapPin size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={value}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            onChange(event.target.value);
            setOpen(true);
          }}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="street-address"
          role="combobox"
          aria-expanded={open && suggestions.length > 0}
          aria-autocomplete="list"
          className={`w-full rounded-2xl border border-slate-200 py-3 pl-11 pr-10 text-sm outline-none focus:ring-2 focus:ring-brand-200 disabled:opacity-60 ${className}`}
        />
        {loading ? <LoaderCircle size={16} className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-brand-500" /> : null}
      </div>

      {open && suggestions.length ? (
        <div role="listbox" className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.id}
              type="button"
              role="option"
              onClick={() => {
                onChange(suggestion.label);
                setOpen(false);
                setSuggestions([]);
              }}
              className="flex w-full items-start gap-2 rounded-xl px-3 py-2.5 text-left text-sm text-slate-700 transition hover:bg-brand-50"
            >
              <MapPin size={15} className="mt-0.5 shrink-0 text-brand-500" />
              <span>{suggestion.label}</span>
            </button>
          ))}
        </div>
      ) : null}

      <p className="mt-1 px-1 text-[11px] text-slate-400">
        {MAPBOX_TOKEN ? 'Ao pesquisar, o texto do endereço é enviado à Mapbox para gerar sugestões.' : 'Digite o endereço completo.'}
      </p>
    </div>
  );
}
