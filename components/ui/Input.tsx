'use client';

import React from 'react';
import { ChevronDown, CircleCheck, CircleAlert } from 'lucide-react';
import { cn } from '../../lib/cn';

export type FieldState = 'default' | 'success' | 'error' | 'disabled';

const stateBorderClasses: Record<FieldState, string> = {
  default: 'border-slate-200 focus-within:border-brand-500 focus-within:theme-ring',
  success: 'border-emerald-400',
  error: 'border-red-400',
  disabled: 'border-slate-100 bg-slate-50',
};

const helperTextClasses: Record<FieldState, string> = {
  default: 'text-slate-400',
  success: 'text-emerald-600',
  error: 'text-red-600',
  disabled: 'text-slate-400',
};

const helperIcon: Partial<Record<FieldState, React.ReactNode>> = {
  success: <CircleCheck size={14} className="shrink-0" />,
  error: <CircleAlert size={14} className="shrink-0" />,
};

const FieldHelper: React.FC<{ state: FieldState; helperText?: string }> = ({ state, helperText }) =>
  helperText ? (
    <p className={cn('mt-1.5 flex items-center gap-1 text-caption font-medium', helperTextClasses[state])}>
      {helperIcon[state]}
      {helperText}
    </p>
  ) : null;

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  state?: FieldState;
  prefixIcon?: React.ReactNode;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ state = 'default', prefixIcon, helperText, disabled, className, ...rest }, ref) => {
    const resolvedState = disabled ? 'disabled' : state;

    return (
      <div>
        <div
          className={cn(
            'flex items-center gap-2 rounded-full border-2 bg-surface px-4 transition-colors',
            stateBorderClasses[resolvedState],
          )}
        >
          {prefixIcon && <span className="shrink-0 text-slate-400">{prefixIcon}</span>}
          <input
            ref={ref}
            disabled={disabled}
            className={cn(
              'h-11 w-full bg-transparent text-body-sm text-text outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:text-slate-400',
              className,
            )}
            {...rest}
          />
        </div>
        <FieldHelper state={resolvedState} helperText={helperText} />
      </div>
    );
  },
);

Input.displayName = 'Input';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  state?: FieldState;
  helperText?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ state = 'default', helperText, disabled, className, ...rest }, ref) => {
    const resolvedState = disabled ? 'disabled' : state;

    return (
      <div>
        <textarea
          ref={ref}
          disabled={disabled}
          className={cn(
            'min-h-28 w-full rounded-2xl border-2 bg-surface px-4 py-3 text-body-sm text-text outline-none transition-colors placeholder:text-slate-400 disabled:cursor-not-allowed disabled:text-slate-400',
            stateBorderClasses[resolvedState],
            className,
          )}
          {...rest}
        />
        <FieldHelper state={resolvedState} helperText={helperText} />
      </div>
    );
  },
);

Textarea.displayName = 'Textarea';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  state?: FieldState;
  helperText?: string;
  prefixIcon?: React.ReactNode;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ state = 'default', helperText, prefixIcon, disabled, className, children, ...rest }, ref) => {
    const resolvedState = disabled ? 'disabled' : state;

    return (
      <div>
        <div className={cn('relative flex items-center gap-2 rounded-full border-2 bg-surface px-4', stateBorderClasses[resolvedState])}>
          {prefixIcon && <span className="shrink-0 text-slate-400">{prefixIcon}</span>}
          <select
            ref={ref}
            disabled={disabled}
            className={cn(
              'h-11 w-full appearance-none bg-transparent pr-7 text-body-sm text-text outline-none disabled:cursor-not-allowed disabled:text-slate-400',
              className,
            )}
            {...rest}
          >
            {children}
          </select>
          <ChevronDown size={16} className="pointer-events-none absolute right-4 text-muted-foreground" />
        </div>
        <FieldHelper state={resolvedState} helperText={helperText} />
      </div>
    );
  },
);

Select.displayName = 'Select';

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, className, id, ...rest }, ref) => (
    <label htmlFor={id} className="flex items-center gap-2 text-body-sm text-text">
      <input
        ref={ref}
        id={id}
        type="checkbox"
        className={cn('h-4 w-4 rounded border-2 border-slate-300 text-brand-500 focus:ring-2 focus:ring-brand-100', className)}
        {...rest}
      />
      {label}
    </label>
  ),
);

Checkbox.displayName = 'Checkbox';

export interface ToggleProps {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  label?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

export const Toggle: React.FC<ToggleProps> = ({ checked, onChange, label, disabled, className }) => (
  <label className={cn('flex items-center justify-between gap-3 text-body-sm text-text', disabled && 'opacity-50', className)}>
    {label}
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={cn(
        'relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed',
        checked ? 'bg-brand-500' : 'bg-slate-200',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 h-5 w-5 rounded-full bg-surface shadow-sm transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0.5',
        )}
      />
    </button>
  </label>
);
