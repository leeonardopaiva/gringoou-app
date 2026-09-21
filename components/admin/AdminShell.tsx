'use client';

import { type FormEvent, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  ChevronDown,
  CloudUpload,
  Flag,
  ImageIcon,
  LayoutGrid,
  LogOut,
  MapPin,
  Menu,
  Megaphone,
  Search,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import GringoouLogo from '@/components/icons/GringoouLogo';
import FriendRequestBell from '@/components/feedback/FriendRequestBell';
import { Avatar } from '@/components/ui';
import { cn } from '@/lib/cn';
import type { User } from '@/types';
import { UserRole } from '@/types';

const navigation = [
  { href: '/admin', label: 'Visao Geral', icon: LayoutGrid, exact: true },
  { href: '/admin/ads', label: 'Anuncios Pagos', icon: Megaphone },
  { href: '/admin/moderation', label: 'Moderacao', icon: ShieldCheck },
  { href: '/admin/businesses', label: 'Negocios', icon: BriefcaseBusiness },
  { href: '/admin/events', label: 'Eventos', icon: CalendarDays },
  { href: '/admin/users', label: 'Usuarios', icon: Users },
  { href: '/admin/regions', label: 'Regioes', icon: MapPin },
  { href: '/admin/imports', label: 'Importacoes', icon: CloudUpload },
  { href: '/admin/banners', label: 'Banners', icon: ImageIcon },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
];

const labels: Record<string, string> = {
  ads: 'Anuncios', moderation: 'Moderacao', businesses: 'Negocios', events: 'Eventos', users: 'Usuarios',
  regions: 'Regioes', imports: 'Importacoes', banners: 'Banners', analytics: 'Analytics',
};

export default function AdminShell({ user, children }: { user: User; children: React.ReactNode }) {
  const pathname = usePathname() || '/admin';
  const router = useRouter();
  const searchParams = useSearchParams();
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(searchParams?.get('q') ?? '');
  const segment = pathname.split('/')[2] || '';
  const sectionLabel = labels[segment] || 'Visao Geral';

  useEffect(() => {
    setSearchQuery(searchParams?.get('q') ?? '');
  }, [searchParams]);

  useEffect(() => {
    if (!accountMenuOpen) return;
    const close = (event: MouseEvent) => {
      if (!accountMenuRef.current?.contains(event.target as Node)) setAccountMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [accountMenuOpen]);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchQuery.trim();
    const searchableSections = new Set(['businesses', 'events', 'users', 'suggestions']);
    const destination = searchableSections.has(segment) ? pathname : '/admin/users';
    router.push(query ? `${destination}?q=${encodeURIComponent(query)}` : destination);
  };

  const profileHref = user.username ? `/perfil/${user.username}` : '/profile';

  const sidebar = (
    <div className="flex h-full flex-col bg-white">
      <div className="flex h-[74px] items-center border-b border-slate-200 px-6"><GringoouLogo size={25} /></div>
      <div className="flex-1 overflow-y-auto px-3 py-5">
        <p className="px-3 pb-3 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400">Principal</p>
        <nav className="space-y-1" aria-label="Navegacao administrativa">
          {navigation.filter((item) => user.role !== UserRole.MODERATOR || item.href === '/admin/moderation').map((item) => {
            const Icon = item.icon;
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className={cn('flex h-11 items-center gap-3 rounded-2xl px-3 text-sm font-semibold transition', active ? 'bg-[#EAF1FF] text-[#2B5DF5]' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900')}>
                <Icon size={18} strokeWidth={2} />
                <span className="flex-1">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="border-t border-slate-200 p-4">
        <div className="flex items-center gap-3 px-2 py-2">
          <Avatar src={user.avatar} name={user.name} size="sm" />
          <div className="min-w-0"><p className="truncate text-xs font-bold text-slate-900">{user.name}</p><p className="text-[10px] text-slate-400">{user.role === UserRole.MODERATOR ? 'Moderador' : 'Administrador'}</p></div>
        </div>
        <Link href="/inicio" className="mt-2 flex items-center gap-2 rounded-xl px-2 py-2 text-xs font-medium text-slate-500 hover:bg-slate-50"><Flag size={14} />Voltar a comunidade</Link>
        <button type="button" onClick={() => signOut({ callbackUrl: '/login' })} className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-xs font-bold text-red-600 hover:bg-red-50"><LogOut size={14} />Sair</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#132F40]">
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-56 border-r border-slate-200 lg:block">{sidebar}</aside>
      {mobileOpen ? <div className="fixed inset-0 z-[80] lg:hidden"><button type="button" aria-label="Fechar menu" className="absolute inset-0 bg-slate-950/35" onClick={() => setMobileOpen(false)} /><aside className="relative h-full w-72 shadow-xl">{sidebar}<button type="button" aria-label="Fechar" className="absolute right-3 top-5 rounded-full p-2 text-slate-500" onClick={() => setMobileOpen(false)}><X size={20} /></button></aside></div> : null}
      <div className="lg:pl-56">
        <header className="sticky top-0 z-40 flex h-[74px] items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-7">
          <div className="flex items-center gap-3"><button type="button" className="rounded-xl p-2 text-slate-600 lg:hidden" onClick={() => setMobileOpen(true)}><Menu size={22} /></button><span className="text-sm font-extrabold">{segment === 'ads' ? 'Moderador' : 'Admin'}</span><span className="text-slate-300">›</span><span className="text-sm font-bold">{sectionLabel}</span></div>
          <div className="flex items-center gap-2">
            <form onSubmit={submitSearch} role="search" className="hidden w-56 sm:block"><div className="flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-[#F8FAFC] px-4 focus-within:border-[#2B5DF5]/40 focus-within:ring-2 focus-within:ring-[#2B5DF5]/10"><Search size={16} className="text-slate-400" /><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} aria-label="Buscar no painel" placeholder="Buscar..." className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" /></div></form>
            <div className="[&_button:first-child]:h-10 [&_button:first-child]:w-10 [&_button:first-child]:rounded-full [&_button:first-child]:border [&_button:first-child]:border-slate-200 [&_button:first-child]:p-0 [&_button:first-child]:text-slate-400">
              <FriendRequestBell adminMode />
            </div>
            <div ref={accountMenuRef} className="relative">
              <button type="button" aria-label="Abrir menu do perfil" aria-expanded={accountMenuOpen} onClick={() => setAccountMenuOpen((value) => !value)} className="flex h-10 items-center gap-2 rounded-full border border-slate-200 px-2.5 transition hover:bg-slate-50"><Avatar src={user.avatar} name={user.name} size="xs" /><span className="hidden max-w-28 truncate text-xs font-bold sm:block">{user.name}</span><ChevronDown size={14} className="text-slate-400" /></button>
              {accountMenuOpen ? (
                <div className="absolute right-0 top-[calc(100%+10px)] z-[80] w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-950/10">
                  <Link href={profileHref} onClick={() => setAccountMenuOpen(false)} className="flex items-center gap-3 rounded-xl p-3 hover:bg-slate-50"><Avatar src={user.avatar} name={user.name} size="sm" /><span className="min-w-0"><strong className="block truncate text-sm text-slate-900">{user.name}</strong><span className="block truncate text-xs text-slate-500">{user.email || 'Administrador'}</span></span></Link>
                  <div className="my-1 border-t border-slate-100" />
                  <Link href="/inicio" onClick={() => setAccountMenuOpen(false)} className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"><Flag size={16} />Voltar a comunidade</Link>
                  <button type="button" onClick={() => void signOut({ callbackUrl: '/login' })} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"><LogOut size={16} />Sair</button>
                </div>
              ) : null}
            </div>
          </div>
        </header>
        <main className="min-h-[calc(100vh-74px)]">{children}</main>
      </div>
    </div>
  );
}
