'use client';

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import {
  type CountryCallingCodeOption,
  REGISTRATION_COUNTRY_OPTIONS,
  findCountryByIso2,
} from '@/lib/country-calling-codes';
import { formatPhoneInputByCountry } from '@/lib/forms/phone';
import { useLanguage } from '@/components/i18n/LanguageProvider';

type PhoneNumberFieldProps = {
  countryIso2: string;
  onCountryChange: (iso2: string) => void;
  value: string;
  onValueChange: (formatted: string) => void;
  placeholder?: string;
  invalid?: boolean;
  options?: CountryCallingCodeOption[];
  onInteract?: () => void;
};

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

const Flag = ({ country }: { country: CountryCallingCodeOption }) => (
  <img
    src={country.flagUrl}
    srcSet={`${country.flagUrl.replace('/w20/', '/w40/')} 2x`}
    width={20}
    height={15}
    alt=""
    aria-hidden="true"
    className="h-[15px] w-5 shrink-0 rounded-[2px] object-cover shadow-[0_0_0_1px_rgba(15,23,42,0.08)]"
  />
);

/**
 * Telefone com seletor de país (bandeira + código) na mesma linha do número,
 * no estilo dos grandes apps: toque na bandeira, busque o país e digite o número.
 */
export default function PhoneNumberField({
  countryIso2,
  onCountryChange,
  value,
  onValueChange,
  placeholder = 'Número de telefone',
  invalid = false,
  options = REGISTRATION_COUNTRY_OPTIONS,
  onInteract,
}: PhoneNumberFieldProps) {
  const { tx } = useLanguage();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const selected = findCountryByIso2(countryIso2);

  const filtered = useMemo(() => {
    const term = normalize(query.trim());
    if (!term) return options;
    const digits = term.replace(/\D/g, '');
    return options.filter(
      (option) =>
        normalize(option.country).includes(term) ||
        option.iso2.includes(term) ||
        (digits.length > 0 && option.dialCode.replace('+', '').startsWith(digits)),
    );
  }, [options, query]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    searchRef.current?.focus();

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const selectCountry = (option: CountryCallingCodeOption) => {
    onCountryChange(option.iso2);
    // Reformata o número já digitado para o padrão do novo país.
    onValueChange(formatPhoneInputByCountry(value, option.iso2));
    setOpen(false);
    setQuery('');
  };

  return (
    <div ref={containerRef} className="relative">
      <div
        className={`flex h-14 items-center rounded-full border bg-surface shadow-sm focus-within:ring-2 focus-within:ring-brand-200 ${
          invalid ? 'border-red-400' : 'border-slate-200'
        }`}
      >
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-label={`${tx('País do telefone:')} ${selected.country} ${selected.dialCode}${tx('. Alterar')}`}
          className="flex h-full shrink-0 items-center gap-2 rounded-l-full pl-5 pr-3 outline-none transition-colors hover:bg-slate-50 focus-visible:bg-slate-50"
        >
          <Flag country={selected} />
          <span className="text-sm font-semibold text-slate-700">{selected.dialCode}</span>
          <ChevronDown
            className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </button>
        <span className="h-6 w-px shrink-0 bg-slate-200" aria-hidden="true" />
        <input
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder={placeholder}
          value={value}
          onChange={(event) => onValueChange(formatPhoneInputByCountry(event.target.value, selected.iso2))}
          onInput={onInteract}
          aria-invalid={invalid}
          className="h-full min-w-0 flex-1 rounded-r-full bg-transparent px-4 text-sm placeholder:text-slate-400 focus:outline-none"
        />
      </div>

      {open ? (
        <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-surface shadow-xl sm:right-auto sm:w-80">
          <label className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
            <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={tx('Buscar país ou código')}
              aria-label={tx('Buscar país ou código')}
              className="min-w-0 flex-1 bg-transparent text-sm placeholder:text-slate-400 focus:outline-none"
            />
          </label>
          <ul id={listId} role="listbox" className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-4 py-3 text-sm text-slate-500">{tx('Nenhum país encontrado.')}</li>
            ) : (
              filtered.map((option) => {
                const isSelected = option.iso2 === selected.iso2;
                return (
                  <li key={option.iso2} role="option" aria-selected={isSelected}>
                    <button
                      type="button"
                      onClick={() => selectCountry(option)}
                      className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none ${
                        isSelected ? 'bg-slate-50 font-semibold' : ''
                      }`}
                    >
                      <Flag country={option} />
                      <span className="min-w-0 flex-1 truncate text-slate-800">{option.country}</span>
                      <span className="text-xs font-semibold text-slate-400">{option.dialCode}</span>
                      {isSelected ? <Check className="h-4 w-4 text-brand-600" aria-hidden="true" /> : null}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
