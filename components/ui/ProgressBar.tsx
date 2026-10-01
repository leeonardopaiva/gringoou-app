import React from 'react';
import { cn } from '@/lib/cn';

type ProgressBarProps = {
  value: number;
  label?: string;
  className?: string;
};

export const ProgressBar: React.FC<ProgressBarProps> = ({ value, label, className }) => {
  const normalizedValue = Math.min(100, Math.max(0, Math.round(value)));

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between gap-3 text-caption font-semibold text-muted-foreground">
        <span>{label || 'Progresso'}</span>
        <span>{normalizedValue}%</span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-label={label || 'Progresso'}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={normalizedValue}
      >
        <div
          className="h-full rounded-full bg-brand-500 transition-[width] duration-300 ease-out"
          style={{ width: `${normalizedValue}%` }}
        />
      </div>
    </div>
  );
};
