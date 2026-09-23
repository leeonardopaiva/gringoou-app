'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Briefcase,
  BriefcaseBusiness,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Home as HomeIcon,
  House,
  Menu,
  MapPin,
  MessageCircle,
  MessageSquarePlus,
  Newspaper,
  Plus,
  Search as SearchIcon,
  ShieldCheck,
  ShoppingBag,
  Store,
  User as UserIcon,
  Users,
  X,
} from 'lucide-react';
import SuggestionButton from './feedback/SuggestionButton';
import FriendRequestBell from './feedback/FriendRequestBell';
import { useToast } from './feedback/ToastProvider';
import { Button } from './ui/Button';
import { Avatar } from './ui/Avatar';
import { trackAnalyticsEvent } from '../lib/analytics';
import { GringoouLogo } from './icons/GringoouLogo';
import { SidebarMenu, SidebarMenuItem } from './navigation/SidebarMenu';
import { PersonaMode, ProfessionalProfileBusiness, ProfessionalProfileIdentity, User, UserRole } from '../types';
import { CommunityAccountMenu } from './account/CommunityAccountMenu';
import UnifiedSearchInput from './search/UnifiedSearchInput';
import CommunityAssistantModal from './search/CommunityAssistantModal';
import RegionSelector from './RegionSelector';
import { Modal } from './ui/Modal';
import { notifyContentUpdated, onContentUpdated } from '@/lib/content-refresh';

interface LogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  professional?: boolean;
  href?: string;
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', className = '', professional = false, href = '/' }) => {
  const sizePx = {
    xs: 24,
    sm: 28,
    md: 38,
    lg: 48,
  }[size];

  return (
    <Link href={href} aria-label="Home">
      <span className={`inline-flex items-center transition-opacity duration-300 ${professional ? 'opacity-95' : ''} ${className}`}>
        <GringoouLogo size={sizePx} />
        <span className="sr-only">Gringoou</span>
      </span>
    </Link>
  );
};

interface LayoutWithUserProps {
  children: React.ReactNode;
  user: User;
  personaMode?: PersonaMode;
  canUseProfessionalMode?: boolean;
  professionalIdentity?: ProfessionalProfileIdentity | null;
  professionalBusinesses?: ProfessionalProfileBusiness[];
  onProfessionalBusinessChange?: (businessId: string) => void;
  onPersonaModeChange?: (mode: PersonaMode) => void;
  onSignOut?: () => void;
}

type NavigationItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
  badge?: string;
};

const navigationItems: NavigationItem[] = [
  { href: '/inicio', label: 'Home', icon: <HomeIcon size={22} /> },
  { href: '/negocios', label: 'Negócios', icon: <Store size={18} /> },
  { href: '/community', label: 'Comunidade', icon: <Users size={18} /> },
  { href: '/eventos', label: 'Eventos', icon: <Calendar size={18} /> },
  { href: '/vagas', label: 'Vagas', icon: <Briefcase size={18} /> },
  { href: '/moradia', label: 'Moradia', icon: <House size={18} /> },
  {
    href: '/marketplace',
    label: 'Marketplace',
    icon: <ShoppingBag size={18} />,
    disabled: true,
    badge: '',
  },
  { href: '/noticias', label: 'Notícias', icon: <Newspaper size={18} />, disabled: true, badge: '' },
];

const SidebarContent: React.FC<{
  user: User;
  sourcePath: string;
  professionalBusinesses?: ProfessionalProfileBusiness[];
  accentColorClass: string;
  isActive: (path: string) => boolean;
  onNavigate: (href: string) => void;
  onItemClick?: () => void;
  onSignOut?: () => void;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}> = ({
  user,
  sourcePath,
  professionalBusinesses = [],
  accentColorClass,
  isActive,
  onNavigate,
  onItemClick,
  onSignOut,
  collapsed = false,
  onToggleCollapsed,
}) => {
  const { showToast } = useToast();
  const activeName = user.name;
  const activeAvatar = user.avatar;
  const activeSubtitle = user.username ? `@${user.username}` : 'Membro da comunidade';

  const handleDisabledNavigation = (item: NavigationItem) => {
    onItemClick?.();
    showToast(`${item.label} chega em breve.`, 'info');
    trackAnalyticsEvent({
      type: 'disabled_feature_click',
      targetType: 'feature',
      targetKey: item.href.replace(/^\//, ''),
      label: item.label,
      sourcePath,
      sourceSection: 'sidebar_navigation',
      regionKey: user.regionKey,
    });
  };

  return (
    <div className={`space-y-4 p-5 pb-20 pt-7 md:flex md:h-full md:flex-col md:justify-between md:py-7 ${collapsed ? 'md:px-3' : 'md:px-6'}`}>
      <div className="space-y-4">
        <div className="mb-5 space-y-4">
          <div className={`flex items-center gap-1 ${collapsed ? 'justify-center' : 'justify-start'}`}>
          {collapsed ? (
            <Link href="/inicio" aria-label="Ir para a Home" title="Home" className="flex h-9 w-9 items-center justify-center">
              <img src="/assets/logo_simbolo.svg" alt="Gringoou" className="h-8 w-8 object-contain" />
            </Link>
          ) : (
            <Logo size="lg" href="/inicio" />
          )}
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
            title={collapsed ? 'Expandir menu' : 'Recolher menu'}
            className="order-last hidden h-7 w-7 items-center justify-center rounded-full text-brand-600 transition hover:bg-brand-50 md:inline-flex"
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
          </div>
          {!collapsed ? <div className="px-1">
            <div className="min-w-0">
              <h2 className={`truncate text-body-sm font-semibold ${accentColorClass}`}>{activeName}</h2>
              <p className="truncate text-[11px] font-medium text-slate-500">{activeSubtitle}</p>
            </div>
          </div> : null}
        </div>

        <SidebarMenu>
          {navigationItems.map((item) => (
            <SidebarMenuItem
              key={item.href}
              label={item.label}
              icon={item.icon}
              active={isActive(item.href)}
              disabled={item.disabled}
              badge={item.badge}
              collapsed={collapsed}
              onClick={item.disabled ? () => handleDisabledNavigation(item) : () => onNavigate(item.href)}
            />
          ))}
          {user.role === UserRole.ADMIN || user.role === UserRole.MODERATOR ? (
            <>
              <SidebarMenuItem
                label={user.role === UserRole.MODERATOR ? 'Moderação' : 'Admin'}
                icon={<ShieldCheck size={18} />}
                active={isActive('/admin')}
                collapsed={collapsed}
                onClick={() => onNavigate(user.role === UserRole.MODERATOR ? '/admin/moderation' : '/admin')}
              />
              {user.role === UserRole.ADMIN ? <SidebarMenuItem
                label="Moderar anuncios"
                icon={<ShieldCheck size={18} />}
                active={isActive('/admin/ads')}
                collapsed={collapsed}
                onClick={() => onNavigate('/admin/ads')}
              /> : null}
            </>
          ) : null}
          <SidebarMenuItem
            label="Meu perfil público"
            icon={<UserIcon size={18} />}
            active={isActive('/perfil')}
            collapsed={collapsed}
            onClick={() => onNavigate(user.username ? `/perfil/${encodeURIComponent(user.username)}` : '/profile')}
          />
          {professionalBusinesses.length > 0 ? (
            <SidebarMenuItem
              label="Página de negócio"
              icon={<Store size={18} />}
              active={isActive('/negocios') && sourcePath.includes('/gerenciar')}
              collapsed={collapsed}
              onClick={() => onNavigate(`/negocios/${professionalBusinesses[0].slug || professionalBusinesses[0].id}/gerenciar`)}
            />
          ) : null}
        </SidebarMenu>
      </div>

      {!collapsed && onSignOut ? (
        <Button
          variant="primary"
          fullWidth
          onClick={() => {
            onItemClick?.();
            onSignOut();
          }}
        >
          Sair
        </Button>
      ) : null}

      {!collapsed ? <Button
        variant="ghost"
        fullWidth
        className="mt-3 border-2 border-slate-200 text-slate-700"
        iconLeft={<MessageSquarePlus size={16} />}
        onClick={() => {
          onItemClick?.();
          window.dispatchEvent(new CustomEvent('gringoou:open-suggestion-modal'));
        }}
      >
        Enviar sugestao
      </Button> : null}
    </div>
  );
};

const Layout: React.FC<LayoutWithUserProps> = ({
  children,
  user,
  personaMode = 'personal',
  canUseProfessionalMode = false,
  professionalIdentity,
  professionalBusinesses = [],
  onProfessionalBusinessChange,
  onPersonaModeChange,
  onSignOut,
}) => {
  const { showToast } = useToast();
  const { update: updateSession } = useSession();
  const pathname = usePathname() || '/';
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isQuickMenuOpen, setIsQuickMenuOpen] = useState(false);
  const [headerSearch, setHeaderSearch] = useState(() => searchParams?.get('q') ?? '');
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [voiceAssistantRequest, setVoiceAssistantRequest] = useState<{ id: string; query: string } | null>(null);
  const [isRegionSelectorOpen, setIsRegionSelectorOpen] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState({ key: user.regionKey || '', label: user.location });
  const [activeRegion, setActiveRegion] = useState({ key: user.regionKey || '', label: user.location });
  const [savingRegion, setSavingRegion] = useState(false);
  const [isNavigating, startNavigation] = React.useTransition();
  // The professional persona was consolidated into public business pages. Keep
  // the community shell in its single, personal visual identity even if an old
  // browser session still has the legacy persona value persisted.
  const isProfessionalTheme = false;
  const accentColorClass = 'theme-text';
  const panelClass = 'border-slate-200';
  const publicProfileHref = user.username
    ? `/perfil/${encodeURIComponent(user.username)}`
    : '/profile';
  const activeName = user.name;
  const activeAvatar = user.avatar;
  const shortRegionLabel = activeRegion.label?.split(',')[0]?.trim() || 'Região';

  React.useEffect(() => {
    setActiveRegion({ key: user.regionKey || '', label: user.location });
  }, [user.location, user.regionKey]);

  React.useEffect(() => onContentUpdated(async (detail) => {
    if (detail.refreshSession) await updateSession();
    router.refresh();
  }), [router, updateSession]);

  React.useEffect(() => {
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (connection?.saveData) return;

    const prefetchCoreRoutes = () => {
      ['/inicio', '/community', '/negocios', '/eventos', '/vagas', '/moradia'].forEach((href) => router.prefetch(href));
    };
    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (idleWindow.requestIdleCallback) {
      const idleId = idleWindow.requestIdleCallback(prefetchCoreRoutes, { timeout: 2500 });
      return () => idleWindow.cancelIdleCallback?.(idleId);
    }
    const timer = window.setTimeout(prefetchCoreRoutes, 1200);
    return () => window.clearTimeout(timer);
  }, [router]);

  React.useEffect(() => {
    if (pathname === '/buscar') {
      setHeaderSearch(searchParams?.get('q') ?? '');
    }
  }, [pathname, searchParams]);

  const isActive = (path: string) =>
    pathname === path || pathname.startsWith(`${path}/`);

  const handleNavigate = (href: string) => {
    setIsMenuOpen(false);
    startNavigation(() => router.push(href));
  };

  const handleHeaderSearch = () => {
    const query = headerSearch.trim();
    setVoiceAssistantRequest(query ? { id: crypto.randomUUID(), query } : null);
    setIsAssistantOpen(true);
  };

  const openRegionSelector = () => {
    setSelectedRegion(activeRegion);
    setIsRegionSelectorOpen(true);
  };

  const saveRegion = async () => {
    if (!selectedRegion.key || savingRegion) return;
    if (selectedRegion.key === activeRegion.key) {
      setIsRegionSelectorOpen(false);
      return;
    }

    setSavingRegion(true);
    try {
      const response = await fetch('/api/profile/region', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regionKey: selectedRegion.key }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? 'Não foi possível atualizar sua região.');

      const confirmedRegion = {
        key: payload?.user?.regionKey || selectedRegion.key,
        label: payload?.user?.locationLabel || selectedRegion.label,
      };
      setActiveRegion(confirmedRegion);
      setSelectedRegion(confirmedRegion);
      setIsRegionSelectorOpen(false);
      showToast('Região atualizada. Carregando o conteúdo local...', 'success');

      notifyContentUpdated({
        refreshSession: true,
        regionKey: confirmedRegion.key,
        locationLabel: confirmedRegion.label,
      });
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Não foi possível atualizar sua região.', 'error');
    } finally {
      setSavingRegion(false);
    }
  };

  return (
    <div className="app-shell min-h-screen bg-bg" data-persona={isProfessionalTheme ? 'professional' : 'personal'}>
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col overflow-hidden bg-bg font-sans md:max-w-none md:bg-transparent">
        {isMenuOpen ? (
          <div
            className="fixed inset-0 z-50 animate-in bg-overlay fade-in duration-300 md:hidden"
            onClick={() => setIsMenuOpen(false)}
          />
        ) : null}

        <div
          className={`fixed inset-y-0 left-0 z-[60] w-[85%] max-w-[380px] overflow-y-auto border-r border-border bg-bg transition-[width,transform] duration-300 ease-out md:max-w-none md:translate-x-0 md:overflow-visible md:shadow-none ${isSidebarCollapsed ? 'md:w-20' : 'md:w-72'} ${
            isMenuOpen ? 'translate-x-0' : '-translate-x-full'
          } ${panelClass}`}
        >
          <SidebarContent
            user={user}
            sourcePath={pathname}
            professionalBusinesses={professionalBusinesses}
            accentColorClass={accentColorClass}
            isActive={isActive}
            onNavigate={handleNavigate}
            onItemClick={() => setIsMenuOpen(false)}
            onSignOut={onSignOut}
            collapsed={isSidebarCollapsed}
            onToggleCollapsed={() => setIsSidebarCollapsed((current) => !current)}
          />
        </div>

        <div className={`relative flex min-h-screen flex-1 flex-col transition-[padding] duration-300 ${isSidebarCollapsed ? 'md:pl-20' : 'md:pl-72'}`}>
          <header className="sticky top-0 z-40 border-b border-border/70 bg-bg/95 backdrop-blur">
            {isNavigating ? <div className="absolute inset-x-0 top-0 h-0.5 overflow-hidden bg-brand-100"><span className="block h-full w-1/2 animate-pulse rounded-full bg-brand-500" /></div> : null}
            <div className="mx-auto flex w-full max-w-[600px] flex-wrap items-center justify-between gap-x-3 gap-y-4 px-4 pb-3 pt-3 md:flex-nowrap md:gap-y-2 md:px-5 md:py-4">
              <div className="flex min-w-0 items-center py-2 gap-2.5 md:hidden">
                <button
                  type="button"
                  onClick={() => setIsMenuOpen(true)}
                  aria-label="Abrir menu de navegação"
                  className={`shrink-0 rounded-full p-1.5 transition hover:bg-slate-100 ${accentColorClass}`}
                >
                  <Menu size={24} />
                </button>
                <span className="flex h-9 items-center">
                  <Logo size="sm" professional={isProfessionalTheme} href="/inicio" />
                </span>
              </div>

              <div className="order-3 flex w-full items-center gap-2 md:order-none md:mr-auto md:max-w-3xl">
                <div className="min-w-0 flex-1">
                  <UnifiedSearchInput
                    value={headerSearch}
                    onChange={setHeaderSearch}
                    onSubmit={handleHeaderSearch}
                    onFilterClick={() => {
                      setVoiceAssistantRequest(null);
                      setIsAssistantOpen(true);
                    }}
                    onVoiceResult={(query) => {
                      setHeaderSearch(query);
                      setVoiceAssistantRequest({ id: crypto.randomUUID(), query });
                      setIsAssistantOpen(true);
                    }}
                    onVoiceError={(message) => showToast(message, 'error')}
                    staticPlaceholder="Buscar pessoas, grupos, negócios e vagas"
                    className="h-12 shadow-none md:h-11"
                  />
                </div>
                <button
                  type="button"
                  onClick={openRegionSelector}
                  aria-label={`Região da comunidade: ${activeRegion.label}`}
                  title={`Alterar região: ${activeRegion.label}`}
                  className="hidden h-10 max-w-36 shrink-0 items-center gap-1.5 rounded-full border border-border bg-white px-3 text-left text-xs font-semibold text-slate-600 transition hover:border-brand-200 hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 md:flex"
                >
                  <MapPin size={15} className="shrink-0 text-brand-500" aria-hidden="true" />
                  <span className="truncate">{shortRegionLabel}</span>
                </button>
              </div>

              <div className="flex h-10 items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={openRegionSelector}
                  aria-label={`Alterar região da comunidade: ${activeRegion.label}`}
                  title={`Alterar região: ${activeRegion.label}`}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-brand-500 transition hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 md:hidden"
                >
                  <MapPin size={19} aria-hidden="true" />
                </button>
                <FriendRequestBell />
                <CommunityAccountMenu
                  user={{ name: user.name, avatar: user.avatar, email: user.email }}
                  profileHref={user.username ? `/perfil/${encodeURIComponent(user.username)}` : '/profile'}
                  knownBusinesses={professionalBusinesses}
                />
              </div>
            </div>
          </header>

          <main className="scrollbar-hide flex-1 overflow-y-auto">
            <div className="w-full px-0 md:px-6 lg:px-8 xl:px-10 2xl:px-12">{children}</div>
          </main>

          <SuggestionButton />

          {isQuickMenuOpen ? (
            <div className="fixed inset-0 z-[55] md:hidden" onClick={() => setIsQuickMenuOpen(false)} />
          ) : null}

          <div className="fixed inset-x-0 bottom-[max(0.625rem,env(safe-area-inset-bottom))] z-50 flex justify-center px-4 md:hidden">
            <div className="relative flex w-full max-w-[300px] justify-center">
              {isQuickMenuOpen ? (
                <div className="absolute bottom-[58px] flex w-full flex-col items-stretch gap-2 rounded-2xl bg-white p-3 shadow-xl">
                  <Button
                    variant="primary"
                    size="sm"
                    iconLeft={<MessageSquarePlus size={16} />}
                    onClick={() => {
                      setIsQuickMenuOpen(false);
                      window.dispatchEvent(new CustomEvent('gringoou:open-community-composer'));
                      handleNavigate('/community?compose=1');
                    }}
                  >
                    Publicar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="border-2 border-slate-200"
                    iconLeft={<MessageSquarePlus size={16} />}
                    onClick={() => {
                      setIsQuickMenuOpen(false);
                      window.dispatchEvent(new CustomEvent('gringoou:open-suggestion-modal'));
                    }}
                  >
                    Enviar sugestão
                  </Button>
                </div>
              ) : null}

              <nav className="flex h-[52px] w-full items-center justify-between rounded-full border border-slate-200/80 bg-white/95 px-1.5 shadow-[0_8px_24px_rgba(15,23,42,0.14)] backdrop-blur">
                <NavItem label="Home" icon={<HomeIcon size={18} />} active={isActive('/inicio')} onNavigate={() => handleNavigate('/inicio')} />
                <NavItem
                  label="Buscar"
                  icon={<SearchIcon size={18} />}
                  active={isAssistantOpen}
                  onNavigate={() => {
                    setIsQuickMenuOpen(false);
                    setVoiceAssistantRequest(null);
                    setIsAssistantOpen(true);
                  }}
                />

                <button
                  type="button"
                  onClick={() => setIsQuickMenuOpen((value) => !value)}
                  aria-label={isQuickMenuOpen ? 'Fechar menu de criacao' : 'Abrir menu de criacao'}
                  className="-mt-6 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white shadow-md ring-[3px] ring-white transition-transform hover:brightness-105 active:scale-95"
                >
                  {isQuickMenuOpen ? <X size={19} /> : <Plus size={21} />}
                </button>

                <NavItem label="Comunidade" icon={<MessageCircle size={18} />} active={isActive('/community')} onNavigate={() => handleNavigate('/community')} />
                <NavItem
                  label="Perfil"
                  icon={<Avatar src={activeAvatar} name={activeName} size="xs" />}
                  active={isActive('/profile') || isActive('/perfil')}
                  onNavigate={() => handleNavigate(publicProfileHref)}
                />
              </nav>
            </div>
          </div>
          <CommunityAssistantModal
            open={isAssistantOpen}
            initialQuery={headerSearch}
            autoSubmitRequest={voiceAssistantRequest}
            regionLabel={shortRegionLabel}
            onClose={() => setIsAssistantOpen(false)}
          />
          <Modal
            open={isRegionSelectorOpen}
            onClose={() => {
              if (!savingRegion) setIsRegionSelectorOpen(false);
            }}
            title="Alterar região"
            description="Escolha a comunidade local que deseja acompanhar."
            footer={
              <>
                <Button variant="ghost" onClick={() => setIsRegionSelectorOpen(false)} disabled={savingRegion}>
                  Cancelar
                </Button>
                <Button onClick={() => void saveRegion()} loading={savingRegion} disabled={!selectedRegion.key}>
                  Confirmar região
                </Button>
              </>
            }
          >
            <RegionSelector
              value={selectedRegion.key}
              onChange={(region) => setSelectedRegion({ key: region.key, label: region.label })}
              autoDetect
              inlineMenu
              disabled={savingRegion}
              label="Sua região"
              hint="Pesquise pela cidade ou use sua localização atual."
            />
          </Modal>
        </div>
      </div>
    </div>
  );
};

const NavItem: React.FC<{
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onNavigate: () => void;
}> = ({ label, icon, active, onNavigate }) => (
  <button type="button" onClick={onNavigate} className="flex w-12 flex-col items-center gap-0.5 py-1">
    <span
      className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
        active ? 'bg-brand-100 text-brand-500' : 'text-slate-400'
      }`}
    >
      {icon}
    </span>
    <span className={`text-[9px] leading-none ${active ? 'font-bold text-brand-500' : 'font-medium text-slate-400'}`}>
      {label}
    </span>
  </button>
);

export default Layout;
