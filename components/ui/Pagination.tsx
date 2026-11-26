'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/cn';
import { useLanguage } from '@/components/i18n/LanguageProvider';

export interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  className?: string;
}

const buildPageList = (page: number, totalPages: number): Array<number | 'ellipsis'> => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages = new Set<number>([1, totalPages, page, page - 1, page + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);

  const result: Array<number | 'ellipsis'> = [];
  sorted.forEach((p, index) => {
    if (index > 0 && p - sorted[index - 1] > 1) {
      result.push('ellipsis');
    }
    result.push(p);
  });
  return result;
};

export const Pagination: React.FC<PaginationProps> = ({ page, totalPages, onChange, className }) => {
  const { tx } = useLanguage();
  return (
  <nav aria-label={tx('Paginação')} className={cn('flex items-center gap-1', className)}>
    <button
      type="button"
      onClick={() => onChange(Math.max(1, page - 1))}
      disabled={page <= 1}
      className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
      aria-label={tx('Página anterior')}
    >
      <ChevronLeft size={16} />
    </button>
    {buildPageList(page, totalPages).map((item, index) =>
      item === 'ellipsis' ? (
        <span key={`ellipsis-${index}`} className="px-1 text-slate-400">
          ...
        </span>
      ) : (
        <button
          key={item}
          type="button"
          onClick={() => onChange(item)}
          aria-label={`${tx('Página')} ${item}`}
          aria-current={item === page ? 'page' : undefined}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-full text-body-sm font-semibold transition-colors',
            item === page ? 'bg-brand-500 text-white' : 'text-slate-500 hover:bg-slate-100',
          )}
        >
          {item}
        </button>
      ),
    )}
    <button
      type="button"
      onClick={() => onChange(Math.min(totalPages, page + 1))}
      disabled={page >= totalPages}
      className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
      aria-label={tx('Próxima página')}
    >
      <ChevronRight size={16} />
    </button>
  </nav>
);
};
