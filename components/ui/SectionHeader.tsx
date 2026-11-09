import React from 'react';
import { cn } from '../../lib/cn';

export interface SectionHeaderProps {
  /** Opcional: só use quando trouxer informação nova (não repita o nome da página). */
  title?: string;
  children?: React.ReactNode;
  className?: string;
}

/**
 * Subtitle-left / actions-right row shared by list pages (Vagas, Moradia,
 * Eventos): keeps the Filtros trigger (and, on mobile, the view dropdown)
 * inside the same container/max-width as the rest of the page instead of a
 * separate, easily-overflowing row.
 */
export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, children, className }) => (
  <div className={cn('flex flex-wrap items-center gap-3', title ? 'justify-between' : 'justify-end', className)}>
    {title ? <h2 className="text-body-sm font-bold text-foreground">{title}</h2> : null}
    {children ? <div className="flex shrink-0 items-center gap-2">{children}</div> : null}
  </div>
);
