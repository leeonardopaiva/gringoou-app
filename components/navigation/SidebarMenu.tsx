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
  onClick?: () => void;
  collapsed?: boolean;
};

export const SidebarMenuItem: React.FC<SidebarMenuItemProps> = ({ label, icon, active = false, disabled = false, badge, onClick, collapsed = false }) => (
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
      active ? 'bg-brand-100 text-brand-600' : 'text-foreground hover:bg-brand-100',
      disabled && 'cursor-not-allowed opacity-45',
    )}
  >
    <span className={active ? 'text-brand-500' : 'text-muted-foreground'}>{icon}</span>
    {!collapsed ? <span className="text-body-sm font-semibold">{label}</span> : null}
    {badge && !collapsed ? <span className="ml-auto rounded-full bg-bg px-2 py-1 text-caption font-semibold text-muted-foreground">{badge}</span> : null}
  </button>
);
