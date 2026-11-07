'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/cn';

type BackButtonProps = {
  /** Para onde ir quando não há histórico interno (acesso direto por link). */
  fallbackHref: string;
  className?: string;
};

/**
 * Botão Voltar padrão sobre a capa das páginas de detalhe (negócio, evento, vaga, moradia).
 * Volta no histórico interno; em acesso direto por link externo, cai em `fallbackHref`.
 * Posicione com `className` (padrão: canto superior esquerdo da capa).
 */
export const BackButton: React.FC<BackButtonProps> = ({ fallbackHref, className }) => {
  const router = useRouter();

  const goBack = () => {
    let sameOrigin = false;
    try {
      sameOrigin = Boolean(document.referrer) && new URL(document.referrer).origin === window.location.origin;
    } catch {
      sameOrigin = false;
    }
    if (sameOrigin && window.history.length > 1) router.back();
    else router.push(fallbackHref);
  };

  return (
    <button
      type="button"
      onClick={goBack}
      aria-label="Voltar"
      title="Voltar"
      className={cn(
        'absolute left-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur transition hover:bg-black/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white',
        className,
      )}
    >
      <ArrowLeft size={18} aria-hidden />
    </button>
  );
};

export default BackButton;
