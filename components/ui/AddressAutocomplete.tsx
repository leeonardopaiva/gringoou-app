'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Search } from 'lucide-react';
import { cn } from '@/lib/cn';

type Suggestion = {
  id: string;
  placeName: string;
  text: string;
  latitude?: number;
  longitude?: number;
};

type AddressAutocompleteProps = {
  value: string;
  onChange: (value: string, latitude?: number | null, longitude?: number | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  country?: string;
};

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim() || '';

const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({
  value,
  onChange,
  placeholder = 'Endereço ou local',
  className,
  disabled = false,
  country,
}) => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const search = async (query: string) => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    if (!MAPBOX_TOKEN || query.trim().length < 3) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        access_token: MAPBOX_TOKEN,
        limit: '6',
        types: 'place,address,locality,region,country,poi',
        language: 'pt',
      });
      if (country) params.set('country', country);
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?${params.toString()}`,
        { signal: controller.signal },
      );
      const data = await response.json().catch(() => null);
      const features = data?.features ?? [];
      setSuggestions(
        features.map((feature: { id: string; place_name: string; text: string; center?: [number, number] }) => ({
          id: feature.id,
          placeName: feature.place_name,
          text: feature.text,
          longitude: feature.center?.[0] ?? null,
          latitude: feature.center?.[1] ?? null,
        })),
      );
      setOpen(true);
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        setSuggestions([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (next: string) => {
    onChange(next);
    void search(next);
  };

  const selectSuggestion = (suggestion: Suggestion) => {
    onChange(suggestion.placeName, suggestion.latitude ?? null, suggestion.longitude ?? null);
    setSuggestions([]);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input
          type="text"
          value={value}
          onChange={(event) => handleChange(event.target.value)}
          onFocus={() => {
            setFocused(true);
            if (suggestions.length > 0) setOpen(true);
          }}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          className={cn(
            'w-full rounded-xl border-2 border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none',
            className,
          )}
        />
        {loading ? (
          <span className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-slate-200 border-t-brand-500" />
        ) : null}
      </div>

      {open && suggestions.length > 0 ? (
        <ul className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-100 bg-white py-1 shadow-lg">
          {suggestions.map((suggestion) => (
            <li key={suggestion.id}>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectSuggestion(suggestion)}
                className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-brand-50"
              >
                <MapPin size={15} className="mt-0.5 shrink-0 text-brand-500" />
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-slate-800">{suggestion.text}</span>
                  <span className="block truncate text-xs text-slate-400">{suggestion.placeName}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {!MAPBOX_TOKEN ? (
        <p className="mt-1 text-[11px] text-amber-600">
          Configure NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN para habilitar o autocomplete de endereço.
        </p>
      ) : null}
    </div>
  );
};

export default AddressAutocomplete;