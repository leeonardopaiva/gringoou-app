'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/cn';

type PageHeaderProps = {
  title: string;
  /** Destino fixo do botão Voltar (previsível mesmo em acesso direto por URL). */
  backHref?: string;
  /** Oculta o botão Voltar em páginas raiz. */
  hideBack?: boolean;
  /** Handler opcional (ex.: voltar no histórico); `backHref` continua sendo o fallback. */
  onBack?: () => void;
  /** Subtítulo opcional exibido abaixo do título. */
  description?: React.ReactNode;
  /** Ações contextuais alinhadas à direita. */
  action?: React.ReactNode;
  /** Navegação por abas exibida abaixo do título. */
  tabs?: React.ReactNode;
  className?: string;
};

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  backHref = '/home',
  hideBack = false,
  onBack,
  description,
  action,
  tabs,
  className,
}) => (
  <header className={cn('min-w-0', className)}>
    <div className="flex min-h-12 items-center gap-2">
      {hideBack ? null : (
        <Link
          href={backHref}
          onClick={
            onBack
              ? (event) => {
                  event.preventDefault();
                  onBack();
                }
              : undefined
          }
          aria-label="Voltar"
          title="Voltar"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-brand-600 transition hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
        >
          <ArrowLeft size={19} aria-hidden="true" />
        </Link>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-xl font-bold tracking-tight text-foreground">{title}</h1>
        {description ? <p className="truncate text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action ? <div className="ml-auto shrink-0">{action}</div> : null}
    </div>
    {tabs ? <div className="mt-2">{tabs}</div> : null}
  </header>
);

export default PageHeader;
