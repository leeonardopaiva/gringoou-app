'use client';

import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';
import { Button } from './Button';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  footer?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  fullscreen?: boolean;
}

export const Modal: React.FC<ModalProps> = ({ open, onClose, title, description, footer, children, className, fullscreen = false }) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusableSelector = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusFirst = () => dialogRef.current?.querySelector<HTMLElement>(focusableSelector)?.focus();
    const frame = requestAnimationFrame(focusFirst);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
      if (event.key === 'Tab' && dialogRef.current) {
        const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector)];
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocusedRef.current?.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-end justify-center bg-overlay sm:items-center sm:p-6" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descriptionId : undefined}
        className={cn(
          fullscreen
            ? 'h-full w-full overflow-y-auto bg-surface p-5 sm:p-8'
            : 'w-full max-w-md rounded-t-sheet bg-surface p-6 shadow-xl sm:rounded-card',
          className,
        )}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          {title && <h2 id={titleId} className="text-h3 font-bold text-text">{title}</h2>}
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="ml-auto rounded-full p-1 text-slate-400 transition hover:bg-black/5 hover:text-text"
          >
            <X size={18} />
          </button>
        </div>
        {description && <p id={descriptionId} className="mb-4 text-body-sm text-slate-500">{description}</p>}
        {children}
        {footer && <div className="mt-5 flex items-center justify-end gap-3">{footer}</div>}
      </div>
    </div>
  );
};

export interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  destructive,
  loading,
}) => (
  <Modal
    open={open}
    onClose={onClose}
    title={title}
    description={description}
    footer={
      <>
        <Button variant="secondary" onClick={onClose} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button
          variant={destructive ? 'primary' : 'primary'}
          className={destructive ? '!bg-red-600 hover:!bg-red-700' : undefined}
          onClick={onConfirm}
          loading={loading}
        >
          {confirmLabel}
        </Button>
      </>
    }
  />
);
