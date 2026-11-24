import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/cn';
import GringoouLogo from '@/components/icons/GringoouLogo';

export interface BlockedPageAction {
  label: string;
  href: string;
  variant?: 'primary' | 'secondary';
}

interface BlockedPageProps {
  /** Use <br /> para controlar a quebra de linha do título, como no design. */
  title: React.ReactNode;
  description: string;
  actions?: BlockedPageAction[];
  children?: React.ReactNode;
}

const actionClass = (variant: BlockedPageAction['variant']) =>
  cn(
    'inline-flex h-14 w-full items-center justify-center rounded-full px-6 text-[15px] font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300',
    variant === 'secondary'
      ? 'border border-slate-200 bg-surface text-slate-700 hover:bg-slate-50'
      : 'bg-brand-strong text-white hover:brightness-105',
  );

/**
 * Layout das páginas de bloqueio (região indisponível, acesso bloqueado, manutenção):
 * fundo branco, logo, título grande, texto de apoio e um bloco de ação centralizados.
 */
export function BlockedPage({ title, description, actions = [], children }: BlockedPageProps) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-surface px-6 py-16 text-center">
      <GringoouLogo size={null} className="h-10 w-auto sm:h-[52px]" />

      <h1 className="mt-12 text-[2.25rem] font-bold leading-[1.1] tracking-tight text-slate-950 sm:mt-14 sm:text-5xl sm:leading-[1.1]">
        {title}
      </h1>

      <p className="mt-5 max-w-[21rem] text-base leading-relaxed text-slate-500 sm:max-w-[26rem] sm:text-[17px]">
        {description}
      </p>

      {children ? <div className="mt-10 w-full max-w-[30rem]">{children}</div> : null}

      {actions.length > 0 ? (
        <div className="mt-10 flex w-full max-w-[30rem] flex-col gap-3">
          {actions.map((action) => (
            <Link key={action.href + action.label} href={action.href} className={actionClass(action.variant)}>
              {action.label}
            </Link>
          ))}
        </div>
      ) : null}
    </main>
  );
}

export default BlockedPage;
