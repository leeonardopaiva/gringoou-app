'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/cn';
import { goBackOr } from '@/lib/navigation-history';

type BackBarProps = {
  /** Para onde ir quando não há tela anterior do app (acesso direto por link). */
  fallbackHref: string;
  /** Nome da seção de origem (ex.: "Eventos"). */
  label?: string;
  className?: string;
};

/**
 * Barra de voltar das páginas de detalhe, acima da capa e no mesmo padrão do PageHeader
 * (seta azul da marca). Volta para a tela de onde a pessoa veio.
 */
export const BackBar: React.FC<BackBarProps> = ({ fallbackHref, label = 'Voltar', className }) => {
  const router = useRouter();

  return (
    <div className={cn('flex min-h-12 items-center px-2', className)}>
      <button
        type="button"
        onClick={() => goBackOr(router, fallbackHref)}
        aria-label={label === 'Voltar' ? 'Voltar' : `Voltar para ${label}`}
        className="inline-flex h-10 items-center gap-1.5 rounded-full pl-2 pr-4 text-sm font-semibold text-brand-600 transition hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
      >
        <ArrowLeft size={19} aria-hidden />
        {label}
      </button>
    </div>
  );
};

export default BackBar;
