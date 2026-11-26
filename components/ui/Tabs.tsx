'use client';

import React from 'react';
import { cn } from '../../lib/cn';
import { useLanguage } from '@/components/i18n/LanguageProvider';

export interface TabItem {
  label: string;
  value: string;
}

export interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (value: string) => void;
  variant?: 'pill' | 'underline';
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ items, value, onChange, variant = 'pill', className }) => {
  const { tx } = useLanguage();
  if (variant === 'underline') {
    return (
      <div className={cn('flex items-center gap-6 border-b border-slate-200', className)}>
        {items.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value)}
            className={cn(
              'relative -mb-px border-b-2 pb-2.5 text-body-sm font-semibold transition-colors',
              value === item.value ? 'border-brand-500 text-brand-500' : 'border-transparent text-slate-400 hover:text-text',
            )}
          >
            {tx(item.label)}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={cn('inline-flex items-center gap-1 rounded-full bg-slate-100 p-1', className)}>
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          onClick={() => onChange(item.value)}
          className={cn(
            'rounded-full px-4 py-1.5 text-body-sm font-semibold transition-colors',
            value === item.value ? 'bg-brand-500 text-white shadow-sm' : 'text-slate-500 hover:text-text',
          )}
        >
          {tx(item.label)}
        </button>
      ))}
    </div>
  );
};
