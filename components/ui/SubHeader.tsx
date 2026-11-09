'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { Popover } from './Popover';
import { cn } from '@/lib/cn';

/**
 * SubHeader: faixa leve logo abaixo do PageHeader.
 *
 * - Esquerda: abas com sublinhado (categoria/tipo/escopo da lista). Rolam na horizontal no celular.
 * - Direita: apenas um ícone de filtro discreto, que abre um popover (desktop) ou uma folha
 *   inferior (celular) com os campos. Sem `filters`, o ícone não aparece.
 * - Sem `tabs`, mostra só o ícone de filtro alinhado à direita.
 *
 * Uso:
 * ```tsx
 * <SubHeader
 *   tabsLabel="Categorias de notícias"
 *   tabs={[{ id: 'all', label: 'Todas' }, { id: 'economy', label: 'Economia' }]}
 *   activeTab={category}
 *   onTabChange={setCategory}
 *   filters={{
 *     fields: [
 *       { type: 'search', id: 'q', label: 'Buscar', placeholder: 'Buscar notícias' },
 *       { type: 'select', id: 'sort', label: 'Ordenar por', options: [{ value: 'recent', label: 'Mais recentes' }] },
 *       { type: 'checkbox', id: 'free', label: 'Somente gratuitos' },
 *     ],
 *     values: { q: search, sort, free },        // valores hoje aplicados na página
 *     defaults: { sort: 'recent' },              // opcional: valor "neutro" de cada campo ('' / false por padrão)
 *     onApply: (values) => { setSearch(String(values.q)); setSort(String(values.sort)); },
 *     onClear: () => { setSearch(''); setSort('recent'); },
 *   }}
 * />
 * ```
 * Os campos editam um rascunho; só "Aplicar" chama `onApply`. "Limpar" chama `onClear` e fecha.
 * O indicador (ponto) aparece quando algum valor aplicado difere do padrão. Campos `custom`
 * recebem `(draft, setDraft)` para telas com seletores próprios (ex.: seletor de região).
 */

export type SubHeaderTab = { id: string; label: string };

export type SubHeaderFilterValues = Record<string, string | boolean>;

type FieldBase = { id: string; label: string };

export type SubHeaderFilterField =
  | (FieldBase & { type: 'search' | 'text' | 'number'; placeholder?: string })
  | (FieldBase & { type: 'select'; options: Array<{ value: string; label: string; disabled?: boolean }> })
  | (FieldBase & { type: 'checkbox' })
  | (FieldBase & {
      type: 'custom';
      render: (draft: SubHeaderFilterValues, setValue: (id: string, value: string | boolean) => void) => React.ReactNode;
    });

export interface SubHeaderFilters {
  fields: SubHeaderFilterField[];
  /** Valores hoje aplicados na página. */
  values: SubHeaderFilterValues;
  /** Valor neutro de cada campo (padrão: '' para texto/select e false para checkbox). */
  defaults?: SubHeaderFilterValues;
  onApply: (values: SubHeaderFilterValues) => void;
  onClear: () => void;
  title?: string;
}

export interface SubHeaderProps {
  tabs?: SubHeaderTab[];
  activeTab?: string;
  onTabChange?: (id: string) => void;
  tabsLabel?: string;
  filters?: SubHeaderFilters;
  className?: string;
}

const neutralValue = (field: SubHeaderFilterField, defaults?: SubHeaderFilterValues) =>
  defaults?.[field.id] ?? (field.type === 'checkbox' ? false : '');

const countActive = (filters: SubHeaderFilters) =>
  filters.fields.filter((field) => (filters.values[field.id] ?? neutralValue(field, filters.defaults)) !== neutralValue(field, filters.defaults)).length;

const inputClass =
  'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-100';

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return isMobile;
}

const FilterForm: React.FC<{
  filters: SubHeaderFilters;
  onDone: () => void;
}> = ({ filters, onDone }) => {
  const formId = useId();
  const [draft, setDraft] = useState<SubHeaderFilterValues>(() => {
    const initial: SubHeaderFilterValues = {};
    filters.fields.forEach((field) => {
      initial[field.id] = filters.values[field.id] ?? neutralValue(field, filters.defaults);
    });
    return initial;
  });
  const setValue = (id: string, value: string | boolean) => setDraft((current) => ({ ...current, [id]: value }));

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        filters.onApply(draft);
        onDone();
      }}
    >
      {filters.fields.map((field) => {
        const fieldId = `${formId}-${field.id}`;
        if (field.type === 'checkbox') {
          return (
            <label key={field.id} className="flex min-h-11 items-center gap-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={Boolean(draft[field.id])}
                onChange={(event) => setValue(field.id, event.target.checked)}
                className="h-5 w-5 rounded border-slate-300 text-brand-500 focus:ring-brand-200"
              />
              {field.label}
            </label>
          );
        }
        if (field.type === 'custom') {
          return <div key={field.id}>{field.render(draft, setValue)}</div>;
        }
        return (
          <div key={field.id} className="grid gap-1.5">
            <label htmlFor={fieldId} className="text-xs font-bold text-slate-500">
              {field.label}
            </label>
            {field.type === 'select' ? (
              <select id={fieldId} value={String(draft[field.id] ?? '')} onChange={(event) => setValue(field.id, event.target.value)} className={inputClass}>
                {field.options.map((option) => (
                  <option key={option.value} value={option.value} disabled={option.disabled}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id={fieldId}
                type={field.type === 'search' ? 'search' : field.type}
                inputMode={field.type === 'number' ? 'decimal' : undefined}
                value={String(draft[field.id] ?? '')}
                placeholder={field.placeholder}
                onChange={(event) => setValue(field.id, event.target.value)}
                className={inputClass}
              />
            )}
          </div>
        );
      })}
      <div className="flex items-center justify-between gap-3 pt-1">
        <button
          type="button"
          onClick={() => {
            filters.onClear();
            onDone();
          }}
          className="h-11 rounded-full px-4 text-sm font-bold text-slate-500 transition hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
        >
          Limpar
        </button>
        <button
          type="submit"
          className="h-11 rounded-full bg-brand-500 px-7 text-sm font-bold text-white transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
        >
          Aplicar
        </button>
      </div>
    </form>
  );
};

const FilterControl: React.FC<{ filters: SubHeaderFilters }> = ({ filters }) => {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const isMobile = useIsMobile();
  const active = countActive(filters);
  const title = filters.title ?? 'Filtros';

  useEffect(() => {
    if (!open || !isMobile) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, isMobile]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={active ? `${title} (${active} ativos)` : title}
        aria-haspopup="dialog"
        aria-expanded={open}
        title={title}
        onClick={() => setOpen((value) => !value)}
        className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
      >
        <SlidersHorizontal size={19} aria-hidden />
        {active ? <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-brand-500 ring-2 ring-white" aria-hidden /> : null}
      </button>

      {isMobile ? (
        open ? (
          <div className="fixed inset-0 z-[150] flex items-end" role="dialog" aria-modal="true" aria-label={title}>
            <button type="button" aria-label="Fechar filtros" className="absolute inset-0 bg-overlay" onClick={() => setOpen(false)} />
            <div className="relative max-h-[88dvh] w-full overflow-y-auto rounded-t-sheet bg-white px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 shadow-xl">
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200" aria-hidden />
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900">{title}</h2>
                <button type="button" aria-label="Fechar" onClick={() => setOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100">
                  <X size={20} aria-hidden />
                </button>
              </div>
              <FilterForm filters={filters} onDone={() => setOpen(false)} />
            </div>
          </div>
        ) : null
      ) : (
        <Popover open={open} onClose={() => setOpen(false)} anchorRef={triggerRef} align="end" role="dialog" className="max-h-[75dvh] w-[360px] overflow-y-auto p-4">
          <FilterForm filters={filters} onDone={() => setOpen(false)} />
        </Popover>
      )}
    </>
  );
};

export const SubHeader: React.FC<SubHeaderProps> = ({ tabs, activeTab, onTabChange, tabsLabel, filters, className }) => {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const hasTabs = Boolean(tabs && tabs.length > 0);

  if (!hasTabs && !filters) return null;

  const moveTab = (index: number, direction: 1 | -1 | 'first' | 'last') => {
    if (!tabs) return;
    const next =
      direction === 'first' ? 0 : direction === 'last' ? tabs.length - 1 : (index + direction + tabs.length) % tabs.length;
    onTabChange?.(tabs[next].id);
    tabRefs.current[next]?.focus();
  };

  return (
    <div className={cn('flex items-end gap-2', hasTabs ? 'border-b border-slate-200' : 'justify-end', className)}>
      {hasTabs && tabs ? (
        <div
          role="tablist"
          aria-label={tabsLabel}
          className="-mb-px flex min-w-0 flex-1 gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {tabs.map((tab, index) => {
            const selected = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                ref={(node) => {
                  tabRefs.current[index] = node;
                }}
                type="button"
                role="tab"
                aria-selected={selected}
                tabIndex={selected ? 0 : -1}
                onClick={() => onTabChange?.(tab.id)}
                onKeyDown={(event) => {
                  if (event.key === 'ArrowRight') { event.preventDefault(); moveTab(index, 1); }
                  else if (event.key === 'ArrowLeft') { event.preventDefault(); moveTab(index, -1); }
                  else if (event.key === 'Home') { event.preventDefault(); moveTab(index, 'first'); }
                  else if (event.key === 'End') { event.preventDefault(); moveTab(index, 'last'); }
                }}
                className={cn(
                  'relative h-11 shrink-0 whitespace-nowrap px-3 text-sm transition focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200',
                  selected ? 'font-bold text-brand-600' : 'font-medium text-slate-500 hover:text-slate-800',
                )}
              >
                {tab.label}
                {selected ? <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-brand-500" aria-hidden /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
      {filters ? <FilterControl filters={filters} /> : null}
    </div>
  );
};

export default SubHeader;
