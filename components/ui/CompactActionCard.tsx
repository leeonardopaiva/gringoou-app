'use client';

import type React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/cn';

type CompactActionCardProps = {
  icon: React.ReactNode;
  eyebrow?: string;
  title: string;
  description?: string;
  trailing?: React.ReactNode;
  onClick?: () => void;
  href?: string;
  className?: string;
};

export function CompactActionCard({ icon, eyebrow, title, description, trailing, onClick, href, className }: CompactActionCardProps) {
  const content = <>
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-brand-600 shadow-sm">{icon}</span>
    <span className="min-w-0 flex-1 text-left">
      {eyebrow ? <span className="block text-[9px] font-bold uppercase tracking-[0.14em] text-white/70">{eyebrow}</span> : null}
      <span className="block truncate text-xs font-bold text-white">{title}</span>
      {description ? <span className="mt-0.5 block truncate text-[10px] text-white/75">{description}</span> : null}
    </span>
    {trailing ? <span className="flex shrink-0 items-center gap-1">{trailing}</span> : null}
  </>;
  const classes = cn('flex min-h-14 w-full items-center gap-3 rounded-xl bg-gradient-to-br from-[#0086ff] via-[#0878e8] to-[#075bb8] px-3 py-2 text-white shadow-[0_8px_22px_rgba(0,134,255,0.18)] transition hover:brightness-105', className);
  if (href) return <Link href={href} className={classes}>{content}</Link>;
  if (onClick) return <button type="button" onClick={onClick} className={classes}>{content}</button>;
  return <div className={classes}>{content}</div>;
}
