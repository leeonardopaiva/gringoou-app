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

      let top = side === 'bottom' ? anchorRect.bottom + gap : anchorRect.top - gap - popoverHeight;
      if (top + popoverHeight > window.innerHeight - gap) {
        top = Math.max(gap, anchorRect.top - gap - popoverHeight);
      }

      let left = align === 'start'
        ? anchorRect.left
        : align === 'center'
          ? anchorRect.left + anchorRect.width / 2 - popoverWidth / 2
          : anchorRect.right - popoverWidth;
      const maxLeft = window.innerWidth - popoverWidth - gap;
      left = Math.min(Math.max(left, gap), Math.max(maxLeft, gap));

      setStyle({ position: 'fixed', top, left, visibility: 'visible' });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
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
      role="menu"
      style={style}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={cn('z-[200] rounded-2xl border border-border bg-surface shadow-lg', className)}
    >
      {children}
    </div>,
    document.body,
  );
};
