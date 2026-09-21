'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Briefcase,
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
import PersonaModeDropdown from './profile/PersonaModeDropdown';
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
import { buildSearchPath } from '../lib/search-navigation';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  professional?: boolean;
  href?: string;
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', className = '', professional = false, href = '/' }) => {
  const sizePx = {
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
  personaMode: PersonaMode;
  canUseProfessionalMode: boolean;
  professionalIdentity?: ProfessionalProfileIdentity | null;
  professionalBusinesses?: ProfessionalProfileBusiness[];
  accentColorClass: string;
  isActive: (path: string) => boolean;
  onNavigate: (href: string) => void;
  onPersonaModeChange?: (mode: PersonaMode) => void;
  onProfessionalBusinessChange?: (businessId: string) => void;
  onItemClick?: () => void;
  onSignOut?: () => void;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}> = ({
  user,
  sourcePath,
  personaMode,
  canUseProfessionalMode,
  professionalIdentity,
  professionalBusinesses = [],
  accentColorClass,
  isActive,
  onNavigate,
  onPersonaModeChange,
  onProfessionalBusinessChange,
  onItemClick,
  onSignOut,
  collapsed = false,
  onToggleCollapsed,
}) => {
  const { showToast } = useToast();
  const isProfessionalTheme = personaMode === 'professional';
  const activeName =
    isProfessionalTheme && professionalIdentity ? professionalIdentity.name : user.name;
  const activeAvatar =
    isProfessionalTheme && professionalIdentity?.imageUrl ? professionalIdentity.imageUrl : user.avatar;
  const activeSubtitle =
    isProfessionalTheme && professionalIdentity
      ? 'Perfil profissional'
      : user.username
        ? `@${user.username}`
        : 'Membro da comunidade';
  const publicProfileHref =
    isProfessionalTheme && professionalIdentity
      ? professionalIdentity.publicPath
      : isProfessionalTheme
        ? '/negocios'
      : user.username
        ? `/perfil/${encodeURIComponent(user.username)}`
        : '/profile';

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
            <Logo size="lg" professional={isProfessionalTheme} href="/inicio" />
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
              <div className="flex items-center gap-1">
                <h2 className={`truncate text-body-sm font-semibold ${accentColorClass}`}>{activeName}</h2>
                {canUseProfessionalMode && onPersonaModeChange ? (
                  <PersonaModeDropdown
                    value={personaMode}
                    onChange={onPersonaModeChange}
                    personalSubtitle={user.username ? `@${user.username}` : 'Membro da comunidade'}
                    professionalSubtitle={professionalIdentity?.name || 'Cadastre um negocio'}
                    professionalDisabled={!professionalIdentity}
                    businesses={professionalBusinesses}
                    selectedBusinessId={professionalIdentity?.id}
                    onBusinessChange={onProfessionalBusinessChange}
                    align="left"
                    trigger="chevron"
                    menuClassName="z-30"
                  />
                ) : null}
              </div>
              <p className={`truncate text-[11px] font-medium ${isProfessionalTheme ? 'theme-text-soft' : 'text-slate-500'}`}>
                {activeSubtitle}
              </p>
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
          {user.role === UserRole.ADMIN ? (
            <>
              <SidebarMenuItem
                label="Admin"
                icon={<ShieldCheck size={18} />}
                active={sourcePath === '/admin'}
                collapsed={collapsed}
                onClick={() => onNavigate('/admin')}
              />
              <SidebarMenuItem
                label="Moderar anuncios"
                icon={<ShieldCheck size={18} />}
                active={isActive('/admin/ads')}
                collapsed={collapsed}
                onClick={() => onNavigate('/admin/ads')}
              />
            </>
          ) : null}
          <SidebarMenuItem
            label={isProfessionalTheme ? 'Meu negocio' : 'Meu perfil'}
            icon={<UserIcon size={18} />}
            active={isActive('/profile')}
            collapsed={collapsed}
            onClick={() => onNavigate('/profile')}
          />
        </SidebarMenu>
      </div>

      {!collapsed ? <div className="space-y-2">
        <Button variant="secondary" fullWidth onClick={() => onNavigate(professionalIdentity ? `/ads/promover/${professionalIdentity.id}` : '/negocios?create=1')}>
          {professionalIdentity ? 'Promover com Ads' : 'Divulgar meu negócio'}
        </Button>
        <button
          type="button"
          onClick={() => onNavigate('/eventos?create=1')}
          className="inline-flex h-11 w-full items-center justify-center rounded-full bg-secondary px-5 text-sm font-semibold text-foreground transition hover:brightness-95"
        >
          Cadastrar meu evento
        </button>
      </div> : null}

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
  const pathname = usePathname() || '/';
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isQuickMenuOpen, setIsQuickMenuOpen] = useState(false);
  const [headerSearch, setHeaderSearch] = useState(() => searchParams?.get('q') ?? '');
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const isProfessionalTheme = canUseProfessionalMode && personaMode === 'professional';
  const accentColorClass = 'theme-text';
  const panelClass = 'border-slate-200';
  const publicProfileHref =
    isProfessionalTheme && professionalIdentity
      ? professionalIdentity.publicPath
      : isProfessionalTheme
        ? '/negocios'
        : user.username
          ? `/perfil/${encodeURIComponent(user.username)}`
          : '/profile';
  const activeName = isProfessionalTheme && professionalIdentity ? professionalIdentity.name : user.name;
  const activeAvatar =
    isProfessionalTheme && professionalIdentity?.imageUrl ? professionalIdentity.imageUrl : user.avatar;
  const shortRegionLabel = user.location?.split(',')[0]?.trim() || 'Região';

  React.useEffect(() => {
    if (pathname === '/buscar') {
      setHeaderSearch(searchParams?.get('q') ?? '');
    }
  }, [pathname, searchParams]);

  const isActive = (path: string) =>
    pathname === path || pathname.startsWith(`${path}/`);

  const handleNavigate = (href: string) => {
    setIsMenuOpen(false);
    router.push(href);
  };

  const handleHeaderSearch = () => {
    router.push(buildSearchPath(headerSearch));
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
            personaMode={personaMode}
            canUseProfessionalMode={canUseProfessionalMode}
            professionalIdentity={professionalIdentity}
            professionalBusinesses={professionalBusinesses}
            accentColorClass={accentColorClass}
            isActive={isActive}
            onNavigate={handleNavigate}
            onPersonaModeChange={onPersonaModeChange}
            onProfessionalBusinessChange={onProfessionalBusinessChange}
            onItemClick={() => setIsMenuOpen(false)}
            onSignOut={onSignOut}
            collapsed={isSidebarCollapsed}
            onToggleCollapsed={() => setIsSidebarCollapsed((current) => !current)}
          />
        </div>

        <div className={`relative flex min-h-screen flex-1 flex-col transition-[padding] duration-300 ${isSidebarCollapsed ? 'md:pl-20' : 'md:pl-72'}`}>
          <header className="sticky top-0 z-40 border-b border-border/70 bg-bg/95 backdrop-blur">
            <div className="mx-auto flex w-full max-w-[600px] flex-wrap items-center justify-between gap-3 px-5 pb-3 pt-4 md:flex-nowrap md:py-4">
            <div className="flex items-center gap-4 md:hidden">
              <button
                type="button"
                onClick={() => setIsMenuOpen(true)}
                className={`p-1 ${accentColorClass}`}
              >
                <Menu size={28} />
              </button>
              <Logo size="md" professional={isProfessionalTheme} href="/inicio" />
            </div>

            <div className="order-3 flex w-full items-center gap-2 md:order-none md:mr-auto md:max-w-3xl">
              <div className="min-w-0 flex-1">
                <UnifiedSearchInput
                  value={headerSearch}
                  onChange={setHeaderSearch}
                  onSubmit={handleHeaderSearch}
                  onFilterClick={() => setIsAssistantOpen(true)}
                  staticPlaceholder="Buscar pessoas, grupos, negócios e vagas"
                  className="h-11 shadow-none"
                />
              </div>
              <button
                type="button"
                onClick={() => router.push('/profile?edit=region')}
                aria-label={`Região da comunidade: ${user.location}`}
                title={`Alterar região: ${user.location}`}
                className="flex h-10 max-w-[104px] shrink-0 items-center gap-1.5 rounded-full border border-border bg-white px-3 text-left text-xs font-semibold text-slate-600 transition hover:border-brand-200 hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 sm:max-w-36"
              >
                <MapPin size={15} className="shrink-0 text-brand-500" aria-hidden="true" />
                <span className="truncate">{shortRegionLabel}</span>
              </button>
            </div>

            <div className="flex h-10 items-center gap-2">
              <FriendRequestBell />
              <CommunityAccountMenu
                user={{ name: user.name, avatar: user.avatar, email: user.email }}
                profileHref={user.username ? `/perfil/${encodeURIComponent(user.username)}` : '/profile'}
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

          <div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center px-6 md:hidden">
            <div className="relative flex w-full max-w-[360px] justify-center">
              {isQuickMenuOpen ? (
                <div className="absolute bottom-[72px] flex w-full flex-col items-stretch gap-2 rounded-3xl bg-white p-3 shadow-xl">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setIsQuickMenuOpen(false);
                      handleNavigate(professionalIdentity ? `/ads/promover/${professionalIdentity.id}` : '/negocios?create=1');
                    }}
                  >
                    {professionalIdentity ? 'Promover com Ads' : 'Divulgar meu negócio'}
                  </Button>
                  <Button
                    variant="yellow"
                    size="sm"
                    onClick={() => {
                      setIsQuickMenuOpen(false);
                      handleNavigate('/eventos?create=1');
                    }}
                  >
                    Cadastrar meu evento
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
                    Enviar sugestao
                  </Button>
                </div>
              ) : null}

              <nav className="flex w-full items-center justify-between rounded-full bg-white px-2 py-2 shadow-xl">
                <NavItem label="Home" icon={<HomeIcon size={20} />} active={isActive('/inicio')} onNavigate={() => handleNavigate('/inicio')} />
                <NavItem label="Buscar" icon={<SearchIcon size={20} />} active={isActive('/buscar')} onNavigate={() => handleNavigate('/buscar')} />

                <button
                  type="button"
                  onClick={() => setIsQuickMenuOpen((value) => !value)}
                  aria-label={isQuickMenuOpen ? 'Fechar menu de criacao' : 'Abrir menu de criacao'}
                  className="-mt-9 flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white shadow-lg ring-4 ring-white transition-transform hover:brightness-105 active:scale-95"
                >
                  {isQuickMenuOpen ? <X size={22} /> : <Plus size={24} />}
                </button>

                <NavItem label="Comunidade" icon={<MessageCircle size={20} />} active={isActive('/community')} onNavigate={() => handleNavigate('/community')} />
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
            regionLabel={shortRegionLabel}
            onClose={() => setIsAssistantOpen(false)}
          />
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
  <button type="button" onClick={onNavigate} className="flex w-12 flex-col items-center gap-1">
    <span
      className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
        active ? 'bg-brand-100 text-brand-500' : 'text-slate-400'
      }`}
    >
      {icon}
    </span>
    <span className={`text-[10px] leading-none ${active ? 'font-bold text-brand-500' : 'font-medium text-slate-400'}`}>
      {label}
    </span>
  </button>
);

export default Layout;
