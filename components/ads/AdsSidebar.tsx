'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { BarChart3, ChevronLeft, ChevronRight, CircleHelp, CirclePlus, LayoutDashboard, LogOut, Settings, Users } from 'lucide-react';
import { SidebarMenu, SidebarMenuItem } from '@/components/navigation/SidebarMenu';
import { cn } from '@/lib/cn';

const items = [
  { href: '/ads/overview', label: 'Visão geral', icon: LayoutDashboard },
  { href: '/ads/wizard', label: 'Promover', icon: CirclePlus },
  { href: '/ads/reports', label: 'Relatórios', icon: BarChart3 },
];

const accountItems = [
  { href: '/ads/settings', label: 'Configurações', icon: Settings },
  { href: '/ads/help', label: 'Ajuda', icon: CircleHelp },
];

type AdsSidebarProps = {
  mobileOpen: boolean;
  onMobileClose: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
};

/** Mesma estrutura e medidas da barra lateral da comunidade, na versão escura do painel do negócio. */
export function AdsSidebar({ mobileOpen, onMobileClose, collapsed, onToggleCollapsed }: AdsSidebarProps) {
  const pathname = usePathname() ?? '';
  const router = useRouter();
  
  const go = (href: string) => {
    onMobileClose();
    router.push(href);
  };

  return (
    <>
      {mobileOpen ? <button type="button" aria-label="Fechar menu" onClick={onMobileClose} className="fixed inset-0 z-[55] bg-slate-950/40 lg:hidden" /> : null}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-[60] w-[85%] max-w-[380px] overflow-y-auto border-r border-white/5 bg-gradient-to-b from-[#2F343C] to-[#1F2328] text-white transition-[width,transform] duration-300 ease-out lg:max-w-none lg:translate-x-0 lg:overflow-visible',
          collapsed ? 'lg:w-20' : 'lg:w-72',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className={cn('space-y-4 p-5 pb-20 pt-7 lg:flex lg:h-full lg:flex-col lg:justify-between lg:py-7', collapsed ? 'lg:px-3' : 'lg:px-6')}>
          <div className="space-y-4">
            <div className="mb-5 space-y-4">
              <div className={cn('flex items-center gap-1', collapsed ? 'justify-center' : 'justify-start')}>
                <Link href="/ads/overview" aria-label="Gringoou — Gestor do negócio" className="flex items-center gap-2.5">
                  <img src="/assets/logo_simbolo.svg" alt="" className="h-9 w-9 object-contain" />
                  {!collapsed ? <span className="text-xl font-extrabold tracking-tight text-white">Gringoou</span> : null}
                </Link>
                <button
                  type="button"
                  onClick={onToggleCollapsed}
                  aria-label={collapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
                  title={collapsed ? 'Expandir menu' : 'Recolher menu'}
                  className="order-last ml-auto hidden h-7 w-7 items-center justify-center rounded-full text-[#66b6ff] transition hover:bg-white/10 lg:inline-flex"
                >
                  {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                </button>
              </div>
            </div>

            <SidebarMenu label="Menu do gestor do negócio">
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <SidebarMenuItem
                    key={item.href}
                    tone="dark"
                    label={item.label}
                    icon={<Icon size={18} />}
                    active={pathname.startsWith(item.href)}
                    collapsed={collapsed}
                    onClick={() => go(item.href)}
                  />
                );
              })}
            </SidebarMenu>

            <div className="my-3 border-t border-white/10" role="separator" />

            <SidebarMenu label="Conta">
              {accountItems.map((item) => {
                const Icon = item.icon;
                return (
                  <SidebarMenuItem
                    key={item.href}
                    tone="dark"
                    label={item.label}
                    icon={<Icon size={18} />}
                    active={pathname.startsWith(item.href)}
                    collapsed={collapsed}
                    onClick={() => go(item.href)}
                  />
                );
              })}
              <SidebarMenuItem tone="dark" label="Voltar à comunidade" icon={<Users size={18} />} collapsed={collapsed} onClick={() => go('/home')} />
            </SidebarMenu>
          </div>

          {!collapsed ? (
            <button
              type="button"
              onClick={() => void signOut({ callbackUrl: '/login' })}
              className="flex w-full items-center justify-center gap-2 rounded-md border border-white/15 px-4 py-2.5 text-sm font-bold text-slate-200 transition hover:bg-white/10"
            >
              <LogOut size={16} />
              Sair
            </button>
          ) : null}
        </div>
      </aside>
    </>
  );
}
