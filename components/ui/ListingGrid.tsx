import React from 'react';
import { cn } from '@/lib/cn';

/**
 * Grade responsiva compartilhada para listagens (Marketplace, Notícias, Vagas, Moradia, Eventos).
 *
 * O número de colunas é automático (`auto-fill`) conforme a largura real disponível, em vez de
 * breakpoints fixos — assim tablets e monitores grandes usam bem o espaço sem cards gigantes.
 *
 * - `tile`: cards verticais com imagem (Marketplace). 2 colunas no mobile, mais conforme o espaço.
 * - `row`: cards mais largos com texto (Notícias, Vagas, Moradia, Eventos). 1 coluna no mobile.
 */
export type ListingGridVariant = 'tile' | 'row';

const variants: Record<ListingGridVariant, string> = {
  tile: 'gap-x-4 gap-y-6 [--card-min:9rem] sm:[--card-min:12.5rem] xl:gap-x-5',
  row: 'gap-4 [--card-min:100%] sm:[--card-min:19rem]',
};

export interface ListingGridProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: ListingGridVariant;
}

export const ListingGrid = React.forwardRef<HTMLDivElement, ListingGridProps>(
  ({ variant = 'row', className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'grid [grid-template-columns:repeat(auto-fill,minmax(var(--card-min),1fr))]',
        variants[variant],
        className,
      )}
      {...props}
    />
  ),
);

ListingGrid.displayName = 'ListingGrid';
