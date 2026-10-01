import React from 'react';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { cn } from '../../lib/cn';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export const Breadcrumb: React.FC<{ items: BreadcrumbItem[]; className?: string }> = ({ items, className }) => (
  <nav aria-label="Breadcrumb" className={cn('flex min-w-0 items-center gap-1.5 text-body-sm text-slate-400', className)}>
    {items.map((item, index) => {
      const isLast = index === items.length - 1;
      return (
        <React.Fragment key={item.label}>
          {item.href && !isLast ? (
            <Link href={item.href} className="font-medium text-slate-500 hover:text-brand-500">
              {item.label}
            </Link>
          ) : (
            <span aria-current={isLast ? 'page' : undefined} className={cn('truncate', isLast && 'font-semibold text-text')}>{item.label}</span>
          )}
          {!isLast && <ChevronRight size={14} className="shrink-0" />}
        </React.Fragment>
      );
    })}
  </nav>
);
