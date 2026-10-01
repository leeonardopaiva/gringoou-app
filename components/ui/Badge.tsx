import React from 'react';
import { cn } from '../../lib/cn';

export type BadgeTone = 'primary' | 'success' | 'destaque' | 'erro' | 'neutro';
export type BadgeVariant = 'solid' | 'outline';
export type BadgeStatus = 'online' | 'ausente' | 'offline';

const solidTone: Record<BadgeTone, string> = {
  primary: 'bg-brand-500 text-white',
  success: 'bg-success-tag text-emerald-900',
  destaque: 'bg-secondary text-text',
  erro: 'bg-red-100 text-red-700',
  neutro: 'bg-slate-100 text-slate-600',
};

const outlineTone: Record<BadgeTone, string> = {
  primary: 'border border-brand-500 text-brand-500',
  success: 'border border-emerald-300 text-emerald-700',
  destaque: 'border border-amber-300 text-amber-700',
  erro: 'border border-red-300 text-red-700',
  neutro: 'border border-slate-300 text-slate-600',
};

const statusDotColor: Record<BadgeStatus, string> = {
  online: 'bg-emerald-500',
  ausente: 'bg-amber-400',
  offline: 'bg-slate-300',
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  variant?: BadgeVariant;
  dot?: BadgeStatus;
  count?: number | string;
}

export const Badge: React.FC<BadgeProps> & {
  Novo: React.FC<{ className?: string }>;
  Pro: React.FC<{ className?: string }>;
} = ({ tone = 'primary', variant = 'solid', dot, count, className, children, ...rest }) => {
  if (dot) {
    return (
      <span
        className={cn('inline-block h-2.5 w-2.5 rounded-full', statusDotColor[dot], className)}
        aria-label={dot}
        {...rest}
      />
    );
  }

  if (count !== undefined) {
    return (
      <span
        className={cn(
          'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold',
          solidTone[tone],
          className,
        )}
        {...rest}
      >
        {count}
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide',
        variant === 'solid' ? solidTone[tone] : outlineTone[tone],
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
};

Badge.Novo = ({ className }) => (
  <span className={cn('inline-flex items-center rounded-full bg-text px-2.5 py-1 text-[11px] font-bold uppercase text-white', className)}>
    Novo
  </span>
);

Badge.Pro = ({ className }) => (
  <span className={cn('inline-flex items-center rounded-full bg-black px-2.5 py-1 text-[11px] font-bold uppercase text-white', className)}>
    Pro
  </span>
);
