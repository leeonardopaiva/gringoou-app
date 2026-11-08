'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/cn';
import { goBackOr } from '@/lib/navigation-history';

type BackBarProps = {
  /** Para onde ir quando não há tela anterior do app (acesso direto por link). */
  fallbackHref: string;
  /** Nome da seção de origem (usado só para leitores de tela). */
  label?: string;
  className?: string;
};

/**
 * Voltar das páginas de detalhe/públicas: só o ícone, entre o cabeçalho e a capa,
 * sem fundo circular. Volta para a tela de onde a pessoa veio.
 */
export const BackBar: React.FC<BackBarProps> = ({ fallbackHref, label = 'Voltar', className }) => {
  const router = useRouter();

  return (
    <div className={cn('flex min-h-11 items-center', className)}>
      <button
        type="button"
        onClick={() => goBackOr(router, fallbackHref)}
        aria-label={label === 'Voltar' ? 'Voltar' : `Voltar para ${label}`}
        title="Voltar"
        className="-ml-1 inline-flex h-11 w-11 items-center justify-center text-slate-700 transition hover:text-slate-950 focus-visible:rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
      >
        <ArrowLeft size={22} aria-hidden />
      </button>
    </div>
  );
};

export default BackBar;
