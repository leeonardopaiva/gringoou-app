'use client';

import React from 'react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

export type ServiceCardProps = {
  href: string;
  icon: LucideIcon;
  label: string;
  disabled?: boolean;
  onDisabledClick?: () => void;
  onActivate?: () => void;
};

export const ServiceCard: React.FC<ServiceCardProps> = ({
  href,
  icon: Icon,
  label,
  disabled = false,
  onDisabledClick,
  onActivate,
}) => {
  const classes = cn(
    'flex flex-col items-center justify-center gap-2 rounded-2xl border p-3 transition-all',
    disabled
      ? 'cursor-pointer border-slate-200 bg-white opacity-50'
      : 'border-slate-200 bg-white hover:border-brand-300 active:scale-95',
  );

  const content = (
    <>
      <div
        className={cn(
          'flex h-11 w-11 items-center justify-center rounded-full',
          disabled ? 'bg-slate-100 text-slate-400' : 'theme-icon-surface',
        )}
      >
        <Icon size={20} strokeWidth={2.2} />
      </div>
      <span
        className={cn(
          'block text-center text-caption font-bold leading-tight',
          disabled ? 'text-slate-400' : 'text-text',
        )}
      >
        {label}
      </span>
    </>
  );

  if (disabled) {
    return (
      <button type="button" aria-disabled="true" onClick={onDisabledClick} className={classes}>
        {content}
      </button>
    );
  }

  if (onActivate) {
    return (
      <button type="button" onClick={onActivate} className={classes}>
        {content}
      </button>
    );
  }

  return (
    <Link href={href} className={classes}>
      {content}
    </Link>
  );
};