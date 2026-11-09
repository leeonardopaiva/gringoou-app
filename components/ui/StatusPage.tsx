import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/cn';
import GringoouLogo from '@/components/icons/GringoouLogo';

export interface StatusPageAction {
  label: string;
  href: string;
  variant?: 'primary' | 'secondary';
}

export interface StatusPageProps {
  icon: React.ReactNode;
  /** Código curto exibido em destaque (ex.: 404). */
  code?: string;
  title: string;
  description: string;
  actions?: StatusPageAction[];
  /** Quando true, ocupa a tela inteira e mostra o logo (páginas fora do Layout). */
  fullScreen?: boolean;
  className?: string;
}

const actionClass = (variant: StatusPageAction['variant']) =>
  cn(
    'inline-flex h-12 w-full items-center justify-center rounded-full px-6 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300',
    variant === 'secondary'
      ? 'border border-brand-100 bg-white text-brand-600 hover:bg-brand-100'
      : 'bg-brand-500 text-white shadow-sm hover:brightness-105',
  );

/** Layout compartilhado das páginas de estado (404, acesso bloqueado, perfil indisponível...). */
export const StatusPage: React.FC<StatusPageProps> = ({
  icon,
  code,
  title,
  description,
  actions = [],
  fullScreen = false,
  className,
}) => (
  <main
    className={cn(
      'flex items-center justify-center px-6',
      fullScreen ? 'min-h-dvh bg-bg py-10' : 'py-16',
      className,
    )}
  >
    <div className="w-full max-w-md rounded-[32px] bg-white px-8 py-10 text-center shadow-sm sm:px-10">
      {fullScreen ? (
        <div className="mb-8 flex justify-center">
          <GringoouLogo size={40} />
        </div>
      ) : null}
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-brand-600" aria-hidden>
        {icon}
      </div>
      {code ? <p className="mt-5 text-sm font-semibold text-brand-600">{code}</p> : null}
      <h1 className={cn('text-2xl font-bold text-slate-900 sm:text-3xl', code ? 'mt-1' : 'mt-5')}>{title}</h1>
      <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-500">{description}</p>
      {actions.length > 0 ? (
        <div className="mx-auto mt-8 flex w-full max-w-[280px] flex-col gap-3">
          {actions.map((action) => (
            <Link key={action.href + action.label} href={action.href} className={actionClass(action.variant)}>
              {action.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  </main>
);

export default StatusPage;
