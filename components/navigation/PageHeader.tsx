'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/cn';

type PageHeaderProps = {
  title: string;
  backHref?: string;
  action?: React.ReactNode;
  className?: string;
};

export const PageHeader: React.FC<PageHeaderProps> = ({ title, backHref = '/inicio', action, className }) => (
  <header className={cn('flex min-h-12 items-center gap-2 pt-5', className)}>
    <Link
      href={backHref}
      aria-label="Voltar"
      title="Voltar"
      className="flex h-9 w-9 items-center justify-center rounded-full text-brand-600 transition hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
    >
      <ArrowLeft size={19} aria-hidden="true" />
    </Link>
    <h1 className="text-xl font-bold tracking-tight text-foreground">{title}</h1>
    {action ? <div className="ml-auto shrink-0">{action}</div> : null}
  </header>
);

export default PageHeader;
