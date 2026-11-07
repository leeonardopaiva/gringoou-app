import React from 'react';
import GringoouLogo from '@/components/icons/GringoouLogo';
import { Spinner } from './Spinner';

/** Loader de tela cheia (primeira leitura da sessão e transições de rota). */
export const PageLoader: React.FC<{ label?: string }> = ({ label = 'Carregando' }) => (
  <div
    className="flex min-h-screen flex-col items-center justify-center gap-5 bg-bg"
    role="status"
    aria-live="polite"
    aria-label={label}
  >
    <GringoouLogo size={44} />
    <Spinner size="lg" />
    <span className="sr-only">{label}</span>
  </div>
);

export default PageLoader;
