'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Crosshair, MapPin, Search } from 'lucide-react';
import type { CitySuggestion } from '@/components/ui/CityAutocomplete';
import {
  DEFAULT_REGION_OPTIONS,
  calculateDistanceKm,
  findNearestRegion,
  getRegionByKey,
  type RegionOption,
} from '../lib/regions';

interface RegionSelectorProps {
  value?: string;
  onChange: (region: RegionOption) => void;
  onClear?: () => void;
  disabled?: boolean;
  autoDetect?: boolean;
  allowEmpty?: boolean;
  emptyLabel?: string;
  label?: string;
  hint?: string;
  inlineMenu?: boolean;
  /**
   * Habilita a busca por cidades dos EUA no menu. A cidade escolhida é ligada à região
   * mais próxima, que é o que define o conteúdo local exibido.
   */
  citySearch?: boolean;
}

let cachedRegions: RegionOption[] | null = null;
let regionsRequest: Promise<RegionOption[]> | null = null;

const loadRegions = async () => {
  if (cachedRegions) return cachedRegions;
  if (!regionsRequest) {
    regionsRequest = fetch('/api/regions')
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error ?? 'Não foi possível carregar regiões.');
        const nextRegions = Array.isArray(payload?.regions) ? payload.regions : DEFAULT_REGION_OPTIONS;
        cachedRegions = nextRegions;
        return nextRegions;
      })
      .finally(() => {
        regionsRequest = null;
      });
  }
  return regionsRequest;
};

const RegionSelector: React.FC<RegionSelectorProps> = ({
  value,
  onChange,
  onClear,
  disabled = false,
  autoDetect = false,
  allowEmpty = false,
  emptyLabel = 'Todas as regioes',
  label = 'Regiao',
  hint,
  inlineMenu = false,
  citySearch = false,
}) => {
  const [regions, setRegions] = useState<RegionOption[]>(cachedRegions ?? []);
  const [regionsLoaded, setRegionsLoaded] = useState(Boolean(cachedRegions));
  const [search, setSearch] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);
  const [hasAttemptedAutoDetect, setHasAttemptedAutoDetect] = useState(false);
  const [open, setOpen] = useState(false);
  const [cityResults, setCityResults] = useState<CitySuggestion[]>([]);
  const [cityLoading, setCityLoading] = useState(false);
  const [cityNotice, setCityNotice] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    const query = search.trim();
    if (!citySearch || !open || query.length < 2) {
      setCityResults([]);
      setCityLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setCityLoading(true);
      try {
        const params = new URLSearchParams({ q: query, scope: 'us' });
        const response = await fetch(`/api/places/cities?${params.toString()}`, { signal: controller.signal });
        const payload = await response.json().catch(() => null);
        setCityResults(response.ok && Array.isArray(payload?.cities) ? payload.cities : []);
      } catch (error) {
        if ((error as Error).name !== 'AbortError') setCityResults([]);
      } finally {
        if (!controller.signal.aborted) setCityLoading(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [citySearch, open, search]);

  useEffect(() => {
    let ignore = false;

    const fetchRegions = async () => {
      try {
        const nextRegions = await loadRegions();
        if (!ignore) setRegions(nextRegions);
      } catch (error) {
        console.error('Failed to load regions:', error);

        if (!ignore) {
          setRegions(DEFAULT_REGION_OPTIONS);
        }
      } finally {
        if (!ignore) {
          setRegionsLoaded(true);
        }
      }
    };

    fetchRegions();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!autoDetect || hasAttemptedAutoDetect || value || disabled || !regionsLoaded || regions.length === 0) {
      return;
    }

    setHasAttemptedAutoDetect(true);
    void detectUserRegion();
  }, [autoDetect, disabled, hasAttemptedAutoDetect, regionsLoaded, value]);

  const detectUserRegion = async () => {
    if (regionsLoaded && regions.length === 0) {
      setLocationNotice('Nenhuma regiao ativa disponivel no momento. Fale com o administrador.');
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocationNotice('Seu navegador nao suporta geolocalizacao. Escolha a regiao manualmente.');
      return;
    }

    setIsLocating(true);
    setLocationNotice(null);

    await new Promise<void>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const nearestRegion = findNearestRegion(
            position.coords.latitude,
            position.coords.longitude,
            regions,
          );
          onChange(nearestRegion);
          setLocationNotice(`Regiao sugerida: ${nearestRegion.label}. Voce pode trocar abaixo.`);
          resolve();
        },
        () => {
          setLocationNotice('Nao foi possivel detectar sua localizacao. Escolha a regiao manualmente.');
          resolve();
        },
        {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 300000,
        },
      );
    });

    setIsLocating(false);
  };

  const regionPool = regionsLoaded ? regions : DEFAULT_REGION_OPTIONS;

  const pickCity = (city: CitySuggestion) => {
    const nearest = findNearestRegion(city.lat, city.lng, regionPool);
    const miles = Math.round(calculateDistanceKm(city.lat, city.lng, nearest.lat, nearest.lng) * 0.621371);
    onChange(nearest);
    setCityNotice(
      miles <= 40
        ? `${city.label}: você verá o conteúdo da região ${nearest.label}.`
        : `Ainda não temos uma região em ${city.label}. Você verá o conteúdo de ${nearest.label} (cerca de ${miles} milhas) e poderá trocar quando quiser.`,
    );
    setOpen(false);
    setSearch('');
  };

  const filteredRegions = regionPool.filter((region) => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return true;
    }

    return (
      region.label.toLowerCase().includes(normalizedSearch) ||
      region.city.toLowerCase().includes(normalizedSearch) ||
      region.state.toLowerCase().includes(normalizedSearch)
    );
  });
  const selectedRegion = getRegionByKey(value, regionPool);
  const visibleRegions =
    selectedRegion && !filteredRegions.some((region) => region.key === selectedRegion.key)
      ? [selectedRegion, ...filteredRegions]
      : filteredRegions;

  return (
    <div ref={containerRef} className="relative space-y-2">
      <div>
        <p className="text-body-sm font-bold text-foreground">{label}</p>
        {hint ? <p className="text-caption text-muted-foreground">{hint}</p> : null}
      </div>

      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="theme-outline-ring flex h-11 w-full items-center gap-3 rounded-full border-2 border-border bg-surface px-4 text-left text-body-sm text-foreground transition disabled:cursor-not-allowed disabled:opacity-50"
      >
        <MapPin size={16} className="shrink-0 text-brand-500" />
        <span className={`min-w-0 flex-1 truncate ${selectedRegion ? 'font-semibold' : 'text-muted-foreground'}`}>
          {selectedRegion?.label || (allowEmpty ? emptyLabel : 'Selecione uma regiao')}
        </span>
        <ChevronDown size={16} className={`shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {cityNotice && !open ? (
        <p className="rounded-xl bg-brand-100 px-3 py-2 text-caption font-medium text-brand-600" role="status">{cityNotice}</p>
      ) : null}

      {open ? (
        <div className={`${inlineMenu ? 'relative' : 'absolute left-0 top-full z-[140]'} mt-2 w-full min-w-0 overflow-hidden rounded-2xl border border-border bg-surface p-3 shadow-lg`}>
          <div className="relative">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={citySearch ? 'Buscar cidade dos EUA ou região' : 'Buscar regiao'}
              autoFocus
              className="theme-outline-ring h-10 w-full rounded-full border-2 border-border bg-white pl-10 pr-3 text-body-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
            <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          </div>

          <button
            type="button"
            onClick={() => void detectUserRegion()}
            disabled={disabled || isLocating}
            className="mt-2 inline-flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-caption font-semibold text-brand-500 transition hover:bg-brand-100 disabled:opacity-50"
          >
            <Crosshair size={14} />
            {isLocating ? 'Localizando...' : 'Usar minha localizacao'}
          </button>

          <div className="mt-2 max-h-56 overflow-y-auto" role="listbox">
            {citySearch && search.trim().length >= 2 ? (
              <div className="mb-1" role="group" aria-label="Cidades dos EUA">
                <p className="px-3 pb-1 pt-2 text-caption font-semibold uppercase text-muted-foreground">Cidades dos EUA</p>
                {cityResults.map((city) => (
                  <button
                    key={city.id}
                    type="button"
                    role="option"
                    aria-selected={false}
                    onClick={() => pickCity(city)}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-body-sm text-foreground transition hover:bg-brand-100"
                  >
                    <MapPin size={14} className="shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate">{city.label}</span>
                  </button>
                ))}
                {cityResults.length === 0 ? (
                  <p className="px-3 py-2 text-caption text-muted-foreground">{cityLoading ? 'Buscando cidades...' : 'Nenhuma cidade encontrada.'}</p>
                ) : null}
              </div>
            ) : null}
            {citySearch && search.trim().length >= 2 && visibleRegions.length > 0 ? (
              <p className="px-3 pb-1 pt-2 text-caption font-semibold uppercase text-muted-foreground">Regiões</p>
            ) : null}
            {allowEmpty ? (
              <button
                type="button"
                role="option"
                aria-selected={!value}
                onClick={() => { onClear?.(); setOpen(false); setSearch(''); }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-body-sm text-foreground transition hover:bg-brand-100"
              >
                <span className="flex-1">{emptyLabel}</span>
                {!value ? <Check size={15} className="text-brand-500" /> : null}
              </button>
            ) : null}
            {visibleRegions.map((region) => (
              <button
                key={region.key}
                type="button"
                role="option"
                aria-selected={region.key === value}
                onClick={() => { setCityNotice(null); onChange(region); setOpen(false); setSearch(''); }}
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-body-sm transition hover:bg-brand-100 ${region.key === value ? 'bg-brand-100 font-semibold text-brand-600' : 'text-foreground'}`}
              >
                <span className="min-w-0 flex-1 truncate">{region.label}</span>
                {region.key === value ? <Check size={15} className="text-brand-500" /> : null}
              </button>
            ))}
            {visibleRegions.length === 0 && !(citySearch && cityResults.length > 0) ? <p className="px-3 py-4 text-center text-caption text-muted-foreground">Nenhuma regiao encontrada.</p> : null}
          </div>

          {locationNotice ? <p className="mt-2 rounded-xl bg-brand-100 px-3 py-2 text-caption font-medium text-brand-600">{locationNotice}</p> : null}
        </div>
      ) : null}
    </div>
  );
};

export default RegionSelector;
