'use client';

import React from 'react';
import { cn } from '@/lib/cn';

export const SidebarMenu: React.FC<{ children: React.ReactNode; className?: string; label?: string }> = ({ children, className, label = 'Menu principal' }) => (
  <nav aria-label={label} className={cn('space-y-1', className)}>{children}</nav>
);

export type SidebarMenuItemProps = {
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  badge?: string;
  /** `success` mostra o selo em verde vivo, logo depois do nome (ex.: ADS). */
  badgeTone?: 'default' | 'success';
  onClick?: () => void;
  collapsed?: boolean;
  /** `dark` é usado no painel do negócio (menu escuro, destaque no azul da marca). */
  tone?: 'light' | 'dark';
};

export const SidebarMenuItem: React.FC<SidebarMenuItemProps> = ({ label, icon, active = false, disabled = false, badge, badgeTone = 'default', onClick, collapsed = false, tone = 'light' }) => (
  <button
    type="button"
    disabled={disabled}
    aria-current={active ? 'page' : undefined}
    aria-label={collapsed ? label : undefined}
    title={collapsed ? label : undefined}
    onClick={onClick}
    className={cn(
      'flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors',
      collapsed && 'justify-center px-2',
      tone === 'dark'
        ? active ? 'bg-[#0065bf] text-white' : 'text-slate-300 hover:bg-[#339eff]/20 hover:text-white'
        : active ? 'bg-brand-100 text-brand-600' : 'text-foreground hover:bg-brand-100',
      disabled && 'cursor-not-allowed opacity-45',
    )}
  >
    <span className={tone === 'dark' ? (active ? 'text-white' : 'text-slate-400') : active ? 'text-brand-500' : 'text-muted-foreground'}>{icon}</span>
    {!collapsed ? <span className="text-body-sm font-semibold">{label}</span> : null}
    {badge && !collapsed ? (
      badgeTone === 'success'
        ? <span className="rounded-md bg-emerald-500 px-1.5 py-0.5 text-[10px] font-extrabold uppercase leading-none tracking-wide text-white">{badge}</span>
        : <span className="ml-auto rounded-full bg-bg px-2 py-1 text-caption font-semibold text-muted-foreground">{badge}</span>
    ) : null}
  </button>
);
