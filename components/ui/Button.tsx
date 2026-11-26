'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn';
import { useLanguage } from '@/components/i18n/LanguageProvider';

export type ButtonVariant = 'primary' | 'secondary' | 'dark' | 'ghost' | 'yellow' | 'success' | 'destructive';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-brand-500 text-white shadow-sm hover:brightness-105',
  secondary: 'border-2 border-brand-500 text-brand-500 bg-surface hover:bg-brand-100',
  dark: 'bg-navy text-white shadow-sm hover:brightness-110',
  ghost: 'bg-transparent text-text hover:bg-black/5',
  yellow: 'bg-secondary text-on-accent shadow-sm hover:brightness-105',
  success: 'bg-success-action text-on-accent shadow-sm hover:brightness-105',
  destructive: 'bg-red-600 text-white shadow-sm hover:bg-red-700',
};

const sizeClasses: Record<ButtonSize, string> = {
  xs: 'h-8 px-3 text-xs gap-1.5',
  sm: 'h-9 px-4 text-sm gap-1.5',
  md: 'h-11 px-5 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
  xl: 'h-14 px-8 text-base gap-2.5',
};

const iconOnlySizeClasses: Record<ButtonSize, string> = {
  xs: 'h-8 w-8',
  sm: 'h-9 w-9',
  md: 'h-11 w-11',
  lg: 'h-12 w-12',
  xl: 'h-14 w-14',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  fullWidth?: boolean;
  iconOnly?: boolean;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      iconLeft,
      iconRight,
      fullWidth,
      iconOnly,
      loading,
      disabled,
      className,
      children,
      ...rest
    },
    ref,
  ) => {
  const { tx } = useLanguage();
  return (
    <button
      ref={ref}
      type={rest.type ?? 'button'}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center rounded-full font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50',
        variantClasses[variant],
        iconOnly ? iconOnlySizeClasses[size] : sizeClasses[size],
        fullWidth && !iconOnly && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? (
        <>
          <Loader2 size={16} className="animate-spin" />
          {!iconOnly && <span>{tx('Carregando...')}</span>}
        </>
      ) : (
        <>
          {iconLeft}
          {!iconOnly && children}
          {iconOnly && !iconLeft && !iconRight ? children : null}
          {iconRight}
        </>
      )}
    </button>
  );
},
);

Button.displayName = 'Button';
