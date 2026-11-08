'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { BarChart3, CircleHelp, CirclePlus, LayoutDashboard, LogOut, Settings } from 'lucide-react';
import { cn } from '@/lib/cn';

const items = [
  { href: '/ads/overview', label: 'Visão geral', icon: LayoutDashboard },
  { href: '/ads/wizard', label: 'Criar anúncio', icon: CirclePlus },
  { href: '/ads/reports', label: 'Relatórios', icon: BarChart3 },
];

const accountItems = [
  { href: '/ads/settings', label: 'Configuracoes', icon: Settings },
  { href: '/ads/help', label: 'Ajuda', icon: CircleHelp },
];

type AdsSidebarProps = {
  mobileOpen: boolean;
  onMobileClose: () => void;
};

export function AdsSidebar({ mobileOpen, onMobileClose }: AdsSidebarProps) {
  const pathname = usePathname();
  return (
    <>
    {mobileOpen && <button type="button" aria-label="Fechar menu" onClick={onMobileClose} className="fixed inset-0 top-[72px] z-30 bg-slate-950/30 md:hidden" />}
    <aside className={cn('fixed left-0 top-[72px] z-40 h-[calc(100vh-72px)] w-[272px] flex-col border-r border-white/5 bg-[#0B1B2E] text-white transition-transform duration-200 md:flex md:translate-x-0', mobileOpen ? 'flex translate-x-0' : 'flex -translate-x-full')}>
      <div className="flex items-center gap-3 px-7 pb-9 pt-8">
        <img src="/assets/logo_simbolo.svg" alt="" className="h-9 w-9 object-contain" />
        <div className="leading-tight"><p className="text-[15px] font-extrabold tracking-tight text-white">Gringoou Ads</p><p className="text-[11px] font-medium text-slate-400">Gerenciador de anúncios</p></div>
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-5" aria-label="Menu de anúncios">
        <p className="px-3 pb-3 pt-1 text-[11px] font-extrabold uppercase tracking-wide text-slate-500">Campanhas</p>
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onMobileClose}
              className={cn(
                'flex items-center gap-3 rounded-xl px-4 py-3 text-[14px] font-bold transition',
                active ? 'bg-white/10 text-white shadow-[inset_3px_0_0_0_#2DD4BF]' : 'text-slate-300 hover:bg-white/5 hover:text-white',
              )}
            >
              <Icon size={18} strokeWidth={2.2} />
              {item.label}
            </Link>
          );
        })}
        <div className="my-5 border-t border-white/10" />
        <p className="px-3 pb-3 text-[11px] font-extrabold uppercase tracking-wide text-slate-500">Conta</p>
        {accountItems.map((item) => {
          const Icon = item.icon;
          const active = pathname?.startsWith(item.href);
          return <Link key={item.href} href={item.href} onClick={onMobileClose} className={cn('flex items-center gap-3 rounded-xl px-4 py-3 text-[14px] font-semibold transition', active ? 'bg-white/10 text-white shadow-[inset_3px_0_0_0_#2DD4BF]' : 'text-slate-400 hover:bg-white/5 hover:text-white')}><Icon size={18} />{item.label}</Link>;
        })}
      </nav>
      <div className="border-t border-white/10 px-5 py-5">
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-[13px] font-bold text-slate-300 transition hover:bg-white/5 hover:text-white"
        >
          <LogOut size={16} />
          Sair
        </button>
      </div>
    </aside>
    </>
  );
}
