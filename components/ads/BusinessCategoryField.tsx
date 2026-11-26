'use client';

import { KeyboardEvent, useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Input, Select } from '@/components/ui';
import { AD_BUSINESS_CATEGORIES } from '@/lib/ads/categories';
import { useLanguage } from '@/components/i18n/LanguageProvider';

type BusinessCategoryFieldProps = {
  category: string;
  subcategories: string[];
  onCategoryChange: (value: string) => void;
  onSubcategoriesChange: (value: string[]) => void;
};

export function BusinessCategoryField({ category, subcategories, onCategoryChange, onSubcategoriesChange }: BusinessCategoryFieldProps) {
  const { tx } = useLanguage();
  const [customValue, setCustomValue] = useState('');
  const suggestions = useMemo(() => AD_BUSINESS_CATEGORIES.find((item) => item.value === category)?.examples ?? [], [category]);

  const add = (value: string) => {
    const normalized = value.trim();
    if (!normalized || subcategories.some((item) => item.toLowerCase() === normalized.toLowerCase())) return;
    onSubcategoriesChange([...subcategories, normalized]);
    setCustomValue('');
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      add(customValue);
    }
  };

  return (
    <div className="space-y-3">
      <label className="block space-y-2">
        <span className="text-sm font-bold text-ink-2">{tx('Categoria principal')}</span>
        <Select value={category} required onChange={(event) => { onCategoryChange(event.target.value); onSubcategoriesChange([]); }}>
          <option value="">{tx('Selecione uma categoria')}</option>
          {AD_BUSINESS_CATEGORIES.map((item) => <option key={item.value} value={item.value}>{tx(item.label)}</option>)}
        </Select>
      </label>

      {category ? (
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">{tx('Subcategorias sugeridas')}</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.filter((item) => !subcategories.includes(item)).map((item) => (
              <button key={item} type="button" onClick={() => add(item)} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-surface px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-brand-300 hover:text-brand-600"><Plus size={12} />{item}</button>
            ))}
          </div>
        </div>
      ) : null}

      <label className="block space-y-2">
        <span className="text-sm font-bold text-ink-2">{tx('Adicionar subcategoria')}</span>
        <Input value={customValue} onChange={(event) => setCustomValue(event.target.value)} onKeyDown={onKeyDown} onBlur={() => add(customValue)} placeholder={tx('Ex.: Restaurante Brasileiro')} />
      </label>

      {subcategories.length ? (
        <div className="flex flex-wrap gap-2">
          {subcategories.map((item) => (
            <span key={item} className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-700">{item}<button type="button" aria-label={`${tx('Remover')} ${item}`} onClick={() => onSubcategoriesChange(subcategories.filter((value) => value !== item))}><X size={13} /></button></span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
