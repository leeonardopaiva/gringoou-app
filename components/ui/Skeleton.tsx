import React from 'react';
import { cn } from '../../lib/cn';

export const Skeleton: React.FC<{ className?: string }> & { Card: React.FC<{ className?: string }> } = ({
  className,
}) => <div className={cn('animate-pulse rounded-xl bg-slate-200/70', className)} />;

Skeleton.Card = ({ className }) => (
  <div className={cn('overflow-hidden rounded-card bg-white p-5 shadow-sm', className)}>
    <div className="mb-4 aspect-[4/3] w-full animate-pulse rounded-xl bg-slate-200/70" />
    <div className="mb-2 h-4 w-3/4 animate-pulse rounded-full bg-slate-200/70" />
    <div className="h-3 w-1/2 animate-pulse rounded-full bg-slate-200/70" />
  </div>
);
