'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/cn';
import { goBackOr } from '@/lib/navigation-history';
import { SubHeaderFilter, type SubHeaderFilters } from '@/components/ui/SubHeader';

type PageHeaderProps = {
  title: string;
  /** Destino fixo do botão Voltar (previsível mesmo em acesso direto por URL). */
  backHref?: string;
  /** Oculta o botão Voltar em páginas raiz. */
  hideBack?: boolean;
  /** Páginas de detalhe: volta para a tela de onde a pessoa veio; `backHref` só vale em acesso direto por link. */
  historyBack?: boolean;
  /** Handler opcional (ex.: voltar no histórico); `backHref` continua sendo o fallback. */
  onBack?: () => void;
  /** Filtros de páginas SEM abas: o ícone aparece à direita, ao lado da ação principal (ver SubHeader para o formato). */
  filters?: SubHeaderFilters;
  /** Ações contextuais alinhadas à direita. */
  action?: React.ReactNode;
  /** Navegação por abas exibida abaixo do título. */
  tabs?: React.ReactNode;
  /** Classes extras do título (ex.: cor da marca). */
  titleClassName?: string;
  className?: string;
};

/** Cabeçalho de página: voltar + título (somente título, sem subtítulo). Filtros e abas ficam no SubHeader. */
export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  backHref = '/home',
  hideBack = false,
  historyBack = false,
  onBack,
  filters,
  action,
  tabs,
  titleClassName,
  className,
}) => {
  const router = useRouter();
  const handleBack = onBack ?? (historyBack ? () => goBackOr(router, backHref) : undefined);

  return (
  <header className={cn('min-w-0', className)}>
    <div className="flex min-h-12 items-center gap-2">
      {hideBack ? null : (
        <Link
          href={backHref}
          onClick={
            handleBack
              ? (event) => {
                  event.preventDefault();
                  handleBack();
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
      <h1 className={cn('min-w-0 flex-1 truncate text-xl font-bold tracking-tight', titleClassName ?? 'text-foreground')}>{title}</h1>
      {filters || action ? (
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          {filters ? <SubHeaderFilter filters={filters} /> : null}
          {action}
        </div>
      ) : null}
    </div>
    {tabs ? <div className="mt-2">{tabs}</div> : null}
  </header>
  );
};

export default PageHeader;
