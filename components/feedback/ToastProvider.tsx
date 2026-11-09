'use client';

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { BadgeCheck, CircleAlert, Info, TriangleAlert, X } from 'lucide-react';

export type ToastTone = 'success' | 'error' | 'info' | 'warning';

export interface ToastOptions {
  actionLabel?: string;
  onAction?: () => void;
}

type ToastItem = {
  id: number;
  message: string;
  tone: ToastTone;
} & ToastOptions;

type ToastContextValue = {
  showToast: (message: string, tone?: ToastTone, durationMs?: number, options?: ToastOptions) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const toneStyles: Record<ToastTone, string> = {
  success: 'border-emerald-100 bg-emerald-50 text-emerald-700',
  error: 'border-red-100 bg-red-50 text-red-700',
  info: 'border-sky-100 bg-sky-50 text-sky-700',
  warning: 'border-amber-100 bg-amber-50 text-amber-700',
};

const toneIcons: Record<ToastTone, React.ReactNode> = {
  success: <BadgeCheck size={18} className="shrink-0" />,
  error: <CircleAlert size={18} className="shrink-0" />,
  info: <Info size={18} className="shrink-0" />,
  warning: <TriangleAlert size={18} className="shrink-0" />,
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, tone: ToastTone = 'info', durationMs = 3600, options?: ToastOptions) => {
      const id = Date.now() + Math.floor(Math.random() * 1000);

      setToasts((current) => [...current, { id, message, tone, ...options }].slice(-3));

      window.setTimeout(() => {
        dismissToast(id);
      }, durationMs);
    },
    [dismissToast],
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[160] flex justify-center px-4">
        <div className="w-full max-w-md space-y-3">
          {toasts.map((toast) => {
            const hasAction = Boolean(toast.actionLabel && toast.onAction);
            return (
              <div
                key={toast.id}
                className={
                  hasAction
                    ? 'pointer-events-auto flex items-center gap-3 rounded-3xl bg-text px-4 py-4 text-white shadow-lg'
                    : `pointer-events-auto flex items-start gap-3 rounded-3xl border px-4 py-4 shadow-lg backdrop-blur ${toneStyles[toast.tone]}`
                }
              >
                {!hasAction && toneIcons[toast.tone]}
                <p className="flex-1 text-body-sm font-medium leading-relaxed">{toast.message}</p>
                {hasAction ? (
                  <button
                    type="button"
                    onClick={() => {
                      toast.onAction?.();
                      dismissToast(toast.id);
                    }}
                    className="shrink-0 rounded-full px-3 py-1.5 text-body-sm font-bold text-brand-300 hover:text-white"
                  >
                    {toast.actionLabel}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => dismissToast(toast.id)}
                    className="rounded-full p-1 opacity-70 transition hover:bg-black/5 hover:opacity-100"
                    aria-label="Fechar notificacao"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }

  return context;
};
