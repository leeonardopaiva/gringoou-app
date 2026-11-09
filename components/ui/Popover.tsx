'use client';

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/cn';

export interface PopoverProps {
  open: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
  align?: 'start' | 'end' | 'center';
  side?: 'bottom' | 'top';
  className?: string;
  /** Sem o visual padrão (borda, fundo, sombra): o chamador define a aparência, o Popover só posiciona. */
  unstyled?: boolean;
  role?: 'menu' | 'dialog' | 'tooltip';
  id?: string;
  children: React.ReactNode;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

/**
 * Anchored overlay rendered via portal to document.body so it always stacks
 * above cards/containers with overflow-hidden instead of being clipped.
 */
export const Popover: React.FC<PopoverProps> = ({
  open,
  onClose,
  anchorRef,
  align = 'end',
  side = 'bottom',
  className,
  unstyled = false,
  role = 'menu',
  id,
  children,
  onMouseEnter,
  onMouseLeave,
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({ position: 'fixed', top: 0, left: 0, visibility: 'hidden' });

  useLayoutEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const anchor = anchorRef.current;
      const popover = popoverRef.current;
      if (!anchor) return;
      const anchorRect = anchor.getBoundingClientRect();
      const popoverRect = popover?.getBoundingClientRect();
      const popoverWidth = popoverRect?.width ?? 0;
      const popoverHeight = popoverRect?.height ?? 0;
      const gap = 8;
      // visualViewport acompanha o teclado virtual e a barra do navegador no celular.
      const viewport = window.visualViewport;
      const viewportWidth = viewport?.width ?? document.documentElement.clientWidth;
      const viewportHeight = viewport?.height ?? window.innerHeight;
      const viewportLeft = viewport?.offsetLeft ?? 0;
      const viewportTop = viewport?.offsetTop ?? 0;

      let top = side === 'bottom' ? anchorRect.bottom + gap : anchorRect.top - gap - popoverHeight;
      if (top + popoverHeight > viewportTop + viewportHeight - gap) {
        top = Math.max(viewportTop + gap, anchorRect.top - gap - popoverHeight);
      }

      let left = align === 'start'
        ? anchorRect.left
        : align === 'center'
          ? anchorRect.left + anchorRect.width / 2 - popoverWidth / 2
          : anchorRect.right - popoverWidth;
      const minLeft = viewportLeft + gap;
      const maxLeft = viewportLeft + viewportWidth - popoverWidth - gap;
      left = Math.min(Math.max(left, minLeft), Math.max(maxLeft, minLeft));

      // Se o conteúdo não cabe na altura visível (ex.: celular deitado), limita e rola por dentro.
      const availableHeight = viewportHeight - gap * 2;
      const overflowsHeight = (popover?.scrollHeight ?? 0) > availableHeight;
      if (overflowsHeight) top = viewportTop + gap;

      // Nunca mais largo que a tela (respeitando a margem de segurança).
      setStyle({
        position: 'fixed',
        top,
        left,
        maxWidth: viewportWidth - gap * 2,
        ...(overflowsHeight ? { maxHeight: availableHeight, overflowY: 'auto' as const } : null),
        visibility: 'visible',
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    window.visualViewport?.addEventListener('resize', updatePosition);
    // Conteúdo que carrega depois (listas, estados vazios) muda a altura/largura do card.
    const observer = typeof ResizeObserver !== 'undefined' && popoverRef.current ? new ResizeObserver(updatePosition) : null;
    if (observer && popoverRef.current) observer.observe(popoverRef.current);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      window.visualViewport?.removeEventListener('resize', updatePosition);
      observer?.disconnect();
    };
  }, [open, align, side, anchorRef]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (popoverRef.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      onClose();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose, anchorRef]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={popoverRef}
      role={role}
      id={id}
      style={style}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={cn('z-[200]', !unstyled && 'rounded-2xl border border-border bg-surface shadow-lg', className)}
    >
      {children}
    </div>,
    document.body,
  );
};
