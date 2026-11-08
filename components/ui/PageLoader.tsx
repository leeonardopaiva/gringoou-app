import React from 'react';
import { SymbolLoader } from './SymbolLoader';

/** Loader de tela cheia (primeira leitura da sessão e transições de rota): só o símbolo animado. */
export const PageLoader: React.FC<{ label?: string }> = ({ label = 'Carregando' }) => (
  <div
    className="flex min-h-screen items-center justify-center bg-bg"
    role="status"
    aria-live="polite"
    aria-label={label}
  >
    <SymbolLoader size={72} />
    <span className="sr-only">{label}</span>
  </div>
);

export default PageLoader;
