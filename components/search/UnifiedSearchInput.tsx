import React from 'react';
import { Search, Sparkles } from 'lucide-react';

type UnifiedSearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  onFilterClick?: () => void;
  animatedTerms?: string[];
  animatedIndex?: number;
  staticPlaceholder?: string;
  className?: string;
};

const UnifiedSearchInput: React.FC<UnifiedSearchInputProps> = ({
  value,
  onChange,
  onSubmit,
  onFilterClick,
  animatedTerms,
  animatedIndex = 0,
  staticPlaceholder,
  className = '',
}) => (
  <form
    onSubmit={(event) => {
      event.preventDefault();
      onSubmit?.();
    }}
    className={`relative flex items-center rounded-full border border-slate-200 bg-white shadow-sm transition-all theme-outline-ring ${className}`}
  >
    {!value && animatedTerms && animatedTerms.length > 0 ? (
      <div className="pointer-events-none absolute inset-y-0 left-12 right-16 flex items-center text-sm text-slate-400">
        <span>Busque por&nbsp;</span>
        <span key={animatedTerms[animatedIndex]} className="theme-text animate-in font-bold fade-in duration-300">
          {animatedTerms[animatedIndex]}
        </span>
      </div>
    ) : null}
    <input
      type="text"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={!animatedTerms ? staticPlaceholder : ''}
      className="w-full bg-transparent py-4 pl-12 pr-2 text-sm text-slate-700 outline-none"
    />
    <button
      type="submit"
      aria-label="Executar busca"
      className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
    >
      <Search size={20} aria-hidden="true" />
    </button>
    {onFilterClick ? (
      <button
        type="button"
        onClick={onFilterClick}
        aria-label="Abrir busca inteligente"
        className="mr-1.5 flex h-9 w-9 flex-none items-center justify-center rounded-full bg-brand-500 text-white transition hover:brightness-105"
      >
        <Sparkles size={16} aria-hidden="true" />
      </button>
    ) : null}
  </form>
);

export default UnifiedSearchInput;
