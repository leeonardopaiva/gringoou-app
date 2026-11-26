'use client';

import React from 'react';
import { BadgeCheck, CircleAlert, Info, TriangleAlert, X } from 'lucide-react';
import { cn } from '../../lib/cn';
import { useLanguage } from '@/components/i18n/LanguageProvider';

export type AlertTone = 'info' | 'success' | 'atencao' | 'erro';

export const alertToneStyles: Record<AlertTone, string> = {
  info: 'border-sky-100 bg-sky-50 text-sky-700',
  success: 'border-emerald-100 bg-emerald-50 text-emerald-700',
  atencao: 'border-amber-100 bg-amber-50 text-amber-700',
  erro: 'border-red-100 bg-red-50 text-red-700',
};

export const alertToneIcons: Record<AlertTone, React.ReactNode> = {
  info: <Info size={18} className="shrink-0" />,
  success: <BadgeCheck size={18} className="shrink-0" />,
  atencao: <TriangleAlert size={18} className="shrink-0" />,
  erro: <CircleAlert size={18} className="shrink-0" />,
};

export interface AlertProps {
  tone?: AlertTone;
  title: string;
  description?: string;
  children?: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({ tone = 'info', title, description, children, onClose, className }) => {
  const { tx } = useLanguage();
  return (
  <div
    className={cn(
      'flex items-start gap-3 rounded-xl border px-4 py-4 shadow-xs',
      alertToneStyles[tone],
      className,
    )}
  >
    {alertToneIcons[tone]}
    <div className="flex-1">
      <p className="text-body-sm font-bold">{title}</p>
      {description && <p className="mt-0.5 text-body-sm opacity-90">{description}</p>}
    </div>
    {children && <div className="shrink-0 pl-3">{children}</div>}
    {onClose && (
      <button
        type="button"
        onClick={onClose}
        className="rounded-full p-1 opacity-70 transition hover:bg-black/5 hover:opacity-100"
        aria-label={tx('Fechar')}
      >
        <X size={16} />
      </button>
    )}
  </div>
);
};
