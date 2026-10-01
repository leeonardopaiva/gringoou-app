import React from 'react';
import { cn } from '../../lib/cn';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action, className }) => (
  <div className={cn('flex flex-col items-center gap-2 rounded-card bg-white px-6 py-12 text-center', className)}>
    {icon && <div className="mb-1 text-brand-500">{icon}</div>}
    <p className="text-h3 font-bold text-text">{title}</p>
    {description && <p className="max-w-sm text-body-sm text-slate-500">{description}</p>}
    {action && <div className="mt-3">{action}</div>}
  </div>
);
