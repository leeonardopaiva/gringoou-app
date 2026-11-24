import React from 'react';

export interface GringoouLogoProps {
  className?: string;
  /** Altura renderizada em px; a largura acompanha a proporção real do arquivo. Use null para controlar a altura por classes. */
  size?: number | null;
}

/**
 * Logo com duas variantes: a escura (texto claro) só é exibida e carregada no tema escuro.
 * A troca é feita por CSS (ver app/theme.css), sem depender de JavaScript.
 */
export const GringoouLogo: React.FC<GringoouLogoProps> = ({ className = '', size = 32 }) => {
  const style = size === null ? undefined : { height: size, width: 'auto' };
  const common = `select-none object-contain ${className}`;

  return (
    <>
      <img
        src="/assets/gringoou-logo.png"
        alt="Gringoou"
        style={style}
        className={`logo-on-light inline-block ${common}`}
      />
      <img
        src="/assets/gringoou-logo-dark.png"
        alt="Gringoou"
        loading="lazy"
        style={style}
        className={`logo-on-dark ${common}`}
      />
    </>
  );
};

export default GringoouLogo;
