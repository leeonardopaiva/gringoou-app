'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { BarChart3, ChevronLeft, ChevronRight, CircleHelp, CirclePlus, LayoutDashboard, LogOut, MessageCircle, Settings, Store, Users } from 'lucide-react';
import { SidebarMenu, SidebarMenuItem } from '@/components/navigation/SidebarMenu';
import { cn } from '@/lib/cn';
import { useAdAccount } from '@/components/ads/AdAccountProvider';
import { useLanguage } from '@/components/i18n/LanguageProvider';
import { Button } from '@/components/ui/Button';

const items = [
  { href: '/ads/overview', label: 'Visão geral', icon: LayoutDashboard },
  { href: '/ads/inbox', label: 'Mensagens', icon: MessageCircle },
  { href: '/ads/wizard', label: 'Promover', icon: CirclePlus, ads: true },
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
  const { tx } = useLanguage();
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const { account } = useAdAccount();
  
  const go = (href: string) => {
    onMobileClose();
    router.push(href);
  };

  return (
    <>
      {mobileOpen ? <button type="button" aria-label={tx('Fechar menu')} onClick={onMobileClose} className="fixed inset-0 z-[55] bg-scrim/40 lg:hidden" /> : null}
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
                <Link href="/ads/overview" aria-label={tx('Gringoou — Gestor do negócio')} className="flex items-center gap-2.5">
                  <img src="/assets/logo_simbolo.svg" alt="" className="h-9 w-9 object-contain" />
                  {!collapsed ? <span className="text-xl font-extrabold tracking-tight text-white">{tx('Gringoou')}</span> : null}
                </Link>
                <button
                  type="button"
                  onClick={onToggleCollapsed}
                  aria-label={collapsed ? tx('Expandir menu lateral') : tx('Recolher menu lateral')}
                  title={collapsed ? tx('Expandir menu') : tx('Recolher menu')}
                  className="order-last ml-auto hidden h-7 w-7 items-center justify-center rounded-full text-[#66b6ff] transition hover:bg-white/10 lg:inline-flex"
                >
                  {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                </button>
              </div>
            </div>

            <SidebarMenu label={tx('Menu do gestor do negócio')}>
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <SidebarMenuItem
                    key={item.href}
                    tone="dark"
                    label={'ads' in item && item.ads && (account?.campaignCount ?? 0) > 0 ? tx('Campanhas') : tx(item.label)}
                    badge={'ads' in item && item.ads ? 'ADS' : undefined}
                    badgeTone="success"
                    icon={<Icon size={18} />}
                    active={pathname.startsWith(item.href)}
                    collapsed={collapsed}
                    onClick={() => go(item.href)}
                  />
                );
              })}
              <SidebarMenuItem
                tone="dark"
                label={account?.businessId ? tx('Página do negócio') : tx('Criar página do negócio')}
                icon={<Store size={18} />}
                collapsed={collapsed}
                onClick={() => go(account?.businessId && account.publicPath ? `${account.publicPath}/gerenciar` : `/businesses?create=1&adAccountId=${encodeURIComponent(account?.id ?? '')}`)}
              />
            </SidebarMenu>

            <div className="my-3 border-t border-white/10" role="separator" />

            <SidebarMenu label={tx('Conta')}>
              {accountItems.map((item) => {
                const Icon = item.icon;
                return (
                  <SidebarMenuItem
                    key={item.href}
                    tone="dark"
                    label={tx(item.label)}
                    icon={<Icon size={18} />}
                    active={pathname.startsWith(item.href)}
                    collapsed={collapsed}
                    onClick={() => go(item.href)}
                  />
                );
              })}
            </SidebarMenu>
          </div>

          {/* Mesmo padrão do rodapé da barra da comunidade: botões arredondados, Sair em destaque. */}
          <div className={cn('space-y-2', collapsed && 'flex flex-col items-center')}>
            <Button
              variant="ghost"
              fullWidth={!collapsed}
              iconOnly={collapsed}
              aria-label={collapsed ? tx('Voltar à comunidade') : undefined}
              title={collapsed ? tx('Voltar à comunidade') : undefined}
              className="border-2 border-white/20 text-white hover:bg-white/10"
              iconLeft={<Users size={16} />}
              onClick={() => go('/home')}
            >
              {tx('Voltar à comunidade')}
            </Button>
            <Button
              variant="primary"
              fullWidth={!collapsed}
              iconOnly={collapsed}
              aria-label={collapsed ? tx('Sair') : undefined}
              title={collapsed ? tx('Sair') : undefined}
              iconLeft={<LogOut size={16} />}
              onClick={() => void signOut({ callbackUrl: '/login' })}
            >
              {tx('Sair')}
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
