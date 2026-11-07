'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { BarChart3, CircleHelp, CirclePlus, LayoutDashboard, LogOut, Settings } from 'lucide-react';
import GringoouLogo from '@/components/icons/GringoouLogo';
import { cn } from '@/lib/cn';

const items = [
  { href: '/ads/overview', label: 'Overview', icon: LayoutDashboard },
  { href: '/ads/wizard', label: 'Criar Anuncio', icon: CirclePlus },
  { href: '/ads/reports', label: 'Relatorios', icon: BarChart3 },
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
    <aside className={cn('fixed left-0 top-[72px] z-40 h-[calc(100vh-72px)] w-[272px] flex-col border-r border-slate-200 bg-white transition-transform duration-200 md:flex md:translate-x-0', mobileOpen ? 'flex translate-x-0' : 'flex -translate-x-full')}>
      <div className="flex items-center px-7 pb-10 pt-9">
        <GringoouLogo size={34} />
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-5" aria-label="Menu de anúncios">
        <p className="px-3 pb-3 pt-1 text-[11px] font-extrabold uppercase tracking-wide text-slate-400">Anuncios</p>
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onMobileClose}
              className={cn(
                'flex items-center gap-3 rounded-2xl px-4 py-3 text-[14px] font-bold transition',
                active ? 'bg-[#e4f1ff] text-[#0787f9]' : 'text-[#243b53] hover:bg-slate-50',
              )}
            >
              <Icon size={18} strokeWidth={2.2} />
              {item.label}
            </Link>
          );
        })}
        <div className="my-5 border-t border-slate-200" />
        <p className="px-3 pb-3 text-[11px] font-extrabold uppercase tracking-wide text-slate-400">Conta</p>
        {accountItems.map((item) => {
          const Icon = item.icon;
          const active = pathname?.startsWith(item.href);
          return <Link key={item.href} href={item.href} onClick={onMobileClose} className={cn('flex items-center gap-3 rounded-2xl px-4 py-3 text-[14px] font-semibold transition', active ? 'bg-[#e4f1ff] text-[#0787f9]' : 'text-slate-500 hover:bg-slate-50')}><Icon size={18} />{item.label}</Link>;
        })}
      </nav>
      <div className="border-t border-slate-200 px-5 py-5">
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-100 px-4 py-2.5 text-[13px] font-bold text-red-600 transition hover:bg-red-50"
        >
          <LogOut size={16} />
          Sair
        </button>
      </div>
    </aside>
    </>
  );
}
