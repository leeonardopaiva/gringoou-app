'use client';

import React, { useState } from 'react';
import { useUtmRules } from '@/lib/utm-client';
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
import { MarketplaceChatBubble } from './marketplace/MarketplaceChatBubble';
import { useMessaging } from '@/lib/MessagingProvider';
import RegionSelector from './RegionSelector';
import { Modal } from './ui/Modal';
import { notifyContentUpdated, onContentUpdated } from '@/lib/content-refresh';
import { ActiveRegionProvider } from './RegionContext';
import { useLanguage } from './i18n/LanguageProvider';
import type { TranslationKey } from '@/lib/i18n/dictionaries';
import { getUserErrorMessage, sanitizeUserMessage } from '@/lib/user-error';

interface LogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  professional?: boolean;
  href?: string;
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', className = '', professional = false, href = '/' }) => {
  const { tx } = useLanguage();
  const sizePx = {
    xs: 24,
    sm: 28,
    md: 38,
    lg: 48,
  }[size];

  return (
    <Link href={href} aria-label={tx('Home')}>
      <span className={`inline-flex items-center transition-opacity duration-300 ${professional ? 'opacity-95' : ''} ${className}`}>
        <GringoouLogo size={sizePx} />
        <span className="sr-only">{tx('Gringoou')}</span>
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
  labelKey: TranslationKey;
  icon: React.ReactNode;
  disabled?: boolean;
  badge?: string;
};

const navigationItems: NavigationItem[] = [
  { href: '/home', labelKey: 'menu.home', icon: <HomeIcon size={22} /> },
  { href: '/businesses', labelKey: 'menu.businesses', icon: <Store size={18} /> },
  { href: '/community', labelKey: 'menu.community', icon: <Users size={24} /> },
  { href: '/groups', labelKey: 'menu.groups', icon: <MessageCircle size={24} /> },
  { href: '/events', labelKey: 'menu.events', icon: <Calendar size={18} /> },
  { href: '/jobs', labelKey: 'menu.jobs', icon: <Briefcase size={18} /> },
  { href: '/housing', labelKey: 'menu.housing', icon: <House size={18} /> },
  { href: '/marketplace', labelKey: 'menu.marketplace', icon: <ShoppingBag size={18} /> },
  { href: '/news', labelKey: 'menu.news', icon: <Newspaper size={18} /> },
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
  const { tx } = useLanguage();
  const { showToast } = useToast();
  const { t } = useLanguage();
  const activeName = user.name;
  const activeAvatar = user.avatar;
  const activeSubtitle = user.username ? `@${user.username}` : t('menu.member');

  const handleDisabledNavigation = (item: NavigationItem) => {
    onItemClick?.();
    showToast(`${t(item.labelKey)} chega em breve.`, 'info');
    trackAnalyticsEvent({
      type: 'disabled_feature_click',
      targetType: 'feature',
      targetKey: item.href.replace(/^\//, ''),
      label: t(item.labelKey),
      sourcePath,
      sourceSection: 'sidebar_navigation',
      regionKey: user.regionKey,
    });
  };

  return (
    <div className={`space-y-4 p-5 pb-20 pt-7 lg:flex lg:h-full lg:flex-col lg:justify-between lg:py-7 ${collapsed ? 'lg:px-3' : 'lg:px-6'}`}>
      <div className="space-y-4">
        <div className="mb-5 space-y-4">
          <div className={`flex items-center gap-1 ${collapsed ? 'justify-center' : 'justify-start'}`}>
          {collapsed ? (
            <Link href="/home" aria-label={t('menu.goHome')} title={t('menu.home')} className="flex h-9 w-9 items-center justify-center">
              <img src="/assets/logo_simbolo.svg" alt={tx('Gringoou')} className="h-8 w-8 object-contain" />
            </Link>
          ) : (
            <Logo size="lg" href="/home" />
          )}
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? t('menu.expand') : t('menu.collapse')}
            title={collapsed ? t('menu.expand') : t('menu.collapse')}
            className="order-last hidden h-7 w-7 items-center justify-center rounded-full text-brand-600 transition hover:bg-brand-50 lg:inline-flex"
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
              label={t(item.labelKey)}
              icon={item.icon}
              active={isActive(item.href)}
              disabled={item.disabled}
              badge={item.badge}
              collapsed={collapsed}
              onClick={item.disabled ? () => handleDisabledNavigation(item) : () => onNavigate(item.href)}
            />
          ))}
        </SidebarMenu>

        <div className="my-3 border-t border-slate-200" role="separator" />

        <SidebarMenu label={t('menu.restricted')}>
          {user.role === UserRole.ADMIN || user.role === UserRole.MODERATOR ? (
            <>
              <SidebarMenuItem
                label={user.role === UserRole.MODERATOR ? t('menu.moderation') : t('menu.admin')}
                icon={<ShieldCheck size={18} />}
                active={isActive('/admin')}
                collapsed={collapsed}
                onClick={() => onNavigate(user.role === UserRole.MODERATOR ? '/admin/moderation' : '/admin')}
              />
              {user.role === UserRole.ADMIN ? <SidebarMenuItem
                label={t('menu.moderateAds')}
                icon={<ShieldCheck size={18} />}
                active={isActive('/admin/ads')}
                collapsed={collapsed}
                onClick={() => onNavigate('/admin/ads')}
              /> : null}
            </>
          ) : null}
          <SidebarMenuItem
            label={t('menu.publicProfile')}
            icon={<UserIcon size={18} />}
            active={isActive('/perfil')}
            collapsed={collapsed}
            onClick={() => onNavigate(user.username ? `/perfil/${encodeURIComponent(user.username)}` : '/profile')}
          />
          {professionalBusinesses.length > 0 ? (
            <SidebarMenuItem
              label={t('menu.businessPage')}
              icon={<Store size={18} />}
              active={isActive('/businesses') && sourcePath.includes('/gerenciar')}
              collapsed={collapsed}
              onClick={() => onNavigate(`/businesses/${professionalBusinesses[0].slug || professionalBusinesses[0].id}/gerenciar`)}
            />
          ) : null}
        </SidebarMenu>
      </div>

      {!collapsed ? (
        <div className="space-y-2">
          <Button
            variant="ghost"
            fullWidth
            className="border-2 border-slate-200 text-slate-700"
            iconLeft={<MessageSquarePlus size={16} />}
            onClick={() => {
              onItemClick?.();
              window.dispatchEvent(new CustomEvent('gringoou:open-suggestion-modal'));
            }}
          >
            {tx('Enviar sugestão')}
          </Button>
          {onSignOut ? (
            <Button
              variant="primary"
              fullWidth
              onClick={() => {
                onItemClick?.();
                onSignOut();
              }}
            >
              {tx('Sair')}
            </Button>
          ) : null}
        </div>
      ) : null}
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
  const { tx } = useLanguage();
  const { showToast } = useToast();
  const { t } = useLanguage();
  const { unreadCount } = useMessaging();
  const { update: updateSession } = useSession();
  const pathname = usePathname() || '/';
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isQuickMenuOpen, setIsQuickMenuOpen] = useState(false);
  const [headerSearch, setHeaderSearch] = useState(() => searchParams?.get('q') ?? '');
  const [searchTermIndex, setSearchTermIndex] = useState(0);
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

  useUtmRules();

  React.useEffect(() => {
    setActiveRegion({ key: user.regionKey || '', label: user.location });
  }, [user.location, user.regionKey]);

  React.useEffect(() => {
    if (headerSearch) return;
    const timer = window.setInterval(() => setSearchTermIndex((current) => (current + 1) % 3), 2400);
    return () => window.clearInterval(timer);
  }, [headerSearch]);

  React.useEffect(() => onContentUpdated(async (detail) => {
    if (detail.refreshSession) await updateSession();
    // A region switch already re-fetches every listing through the active-region
    // context, so skip the heavier RSC refresh to keep the update instant.
    if (!detail.regionKey) router.refresh();
  }), [router, updateSession]);

  React.useEffect(() => {
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (connection?.saveData) return;

    const prefetchCoreRoutes = () => {
      ['/home', '/community', '/businesses', '/events', '/jobs', '/housing'].forEach((href) => router.prefetch(href));
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
    if (pathname === '/search') {
      setHeaderSearch(searchParams?.get('q') ?? '');
    }
  }, [pathname, searchParams]);

  // `authGrace=1` is a transient marker added by the login flow (see App.tsx)
  // so the middleware lets the first post-OAuth request through before the
  // session cookie is readable. Once the authenticated shell is mounted the
  // marker has served its purpose, so we strip it from the URL without adding
  // a new history entry.
  React.useEffect(() => {
    if (!searchParams?.get('authGrace')) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete('authGrace');
    const query = params.toString();
    const nextUrl = `${pathname}${query ? `?${query}` : ''}`;
    // Update the address bar synchronously so the marker disappears even before
    // the App Router reconciles, then keep the router in sync. Neither call
    // adds a new history entry.
    window.history.replaceState(null, '', nextUrl);
    router.replace(nextUrl, { scroll: false });
  }, [pathname, router, searchParams]);

  const isActive = (path: string) =>
    pathname === path || pathname.startsWith(`${path}/`);

  const handleNavigate = (href: string) => {
    setIsMenuOpen(false);
    startNavigation(() => router.push(href));
  };

  const handleHeaderSearch = () => {
    const query = headerSearch.trim();
    if (!query) return;
    startNavigation(() => router.push(`/search?q=${encodeURIComponent(query)}`));
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
      if (!response.ok) throw new Error(sanitizeUserMessage(payload?.error, 'Não foi possível atualizar sua região.'));

      const confirmedRegion = {
        key: payload?.user?.regionKey || selectedRegion.key,
        label: payload?.user?.locationLabel || selectedRegion.label,
      };
      setActiveRegion(confirmedRegion);
      setSelectedRegion(confirmedRegion);
      setIsRegionSelectorOpen(false);
      showToast(tx('Região atualizada. Carregando o conteúdo local...'), 'success');

      notifyContentUpdated({
        refreshSession: true,
        regionKey: confirmedRegion.key,
        locationLabel: confirmedRegion.label,
      });
    } catch (error) {
      showToast(getUserErrorMessage(error, 'Não foi possível atualizar sua região.'), 'error');
    } finally {
      setSavingRegion(false);
    }
  };

  return (
    <div className="app-shell min-h-dvh bg-bg" data-persona={isProfessionalTheme ? 'professional' : 'personal'}>
      <div className="mx-auto flex min-h-dvh w-full flex-col bg-bg font-sans lg:bg-transparent">
        {isMenuOpen ? (
          <div
            className="fixed inset-0 z-50 animate-in bg-overlay fade-in duration-300 lg:hidden"
            onClick={() => setIsMenuOpen(false)}
          />
        ) : null}

        <div
          className={`fixed inset-y-0 left-0 z-[60] w-[85%] max-w-[380px] overflow-y-auto border-r border-border bg-bg transition-[width,transform] duration-300 ease-out lg:max-w-none lg:translate-x-0 lg:overflow-visible lg:shadow-none ${isSidebarCollapsed ? 'lg:w-20' : 'lg:w-72'} ${
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

        <div className={`relative flex flex-1 flex-col transition-[padding] duration-300 ${isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-72'}`}>
          <header className="relative border-b border-border/70">
            {isNavigating ? <div className="absolute inset-x-0 top-0 h-0.5 overflow-hidden bg-brand-100"><span className="block h-full w-1/2 animate-pulse rounded-full bg-brand-500" /></div> : null}
            <div className="mx-auto flex w-full max-w-[1600px] flex-wrap items-center justify-between gap-x-3 gap-y-4 px-3 pb-3 pt-3 sm:px-4 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,620px)_minmax(max-content,1fr)] lg:items-center lg:gap-x-4 lg:gap-y-2 lg:px-6 lg:py-4">
              <div className="flex min-w-0 items-center py-2 gap-2.5 lg:hidden">
                <button
                  type="button"
                  onClick={() => setIsMenuOpen(true)}
                  aria-label={t('menu.open')}
                  className={`shrink-0 rounded-full p-1.5 transition hover:bg-slate-100 ${accentColorClass}`}
                >
                  <Menu size={24} />
                </button>
                <span className="flex h-9 items-center">
                  <Logo size="sm" professional={isProfessionalTheme} href="/home" />
                </span>
              </div>

              <div className="order-3 flex w-full items-center gap-2 lg:order-none lg:col-start-2 lg:row-start-1 lg:w-full">
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
                      startNavigation(() => router.push(`/search?q=${encodeURIComponent(query)}`));
                    }}
                    onVoiceError={(message) => showToast(message, 'error')}
                    animatedTerms={[t('menu.businesses'), t('menu.events'), t('menu.jobs')]}
                    animatedIndex={searchTermIndex}
                    className="h-12 shadow-none"
                  />
                </div>
              </div>

              <div className="flex h-10 items-center gap-1.5 sm:gap-2 lg:col-start-3 lg:row-start-1 lg:justify-self-end">
                <button
                  type="button"
                  onClick={openRegionSelector}
                  aria-label={`${tx('Região da comunidade:')} ${activeRegion.label}`}
                  title={`${tx('Alterar região:')} ${activeRegion.label}`}
                  className="hidden h-10 max-w-36 shrink-0 items-center gap-1.5 rounded-full border border-border bg-surface px-3 text-left text-xs font-semibold text-slate-600 transition hover:border-brand-200 hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 xl:flex"
                >
                  <MapPin size={15} className="shrink-0 text-brand-500" aria-hidden="true" />
                  <span className="truncate">{shortRegionLabel}</span>
                </button>
                <button
                  type="button"
                  onClick={openRegionSelector}
                  aria-label={`${tx('Alterar região da comunidade:')} ${activeRegion.label}`}
                  title={`${tx('Alterar região:')} ${activeRegion.label}`}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-brand-500 transition hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 xl:hidden"
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

          <main className="mx-auto w-full max-w-[1600px] px-3 pt-4 sm:px-4 lg:px-6 lg:pt-6">
            <ActiveRegionProvider value={activeRegion.key || null}>
              {children}
            </ActiveRegionProvider>
          </main>

          <SuggestionButton />

          {isQuickMenuOpen ? (
            <div className="fixed inset-0 z-45 lg:hidden" onClick={() => setIsQuickMenuOpen(false)} />
          ) : null}

          <div className="fixed inset-x-0 bottom-[max(0.625rem,env(safe-area-inset-bottom))] z-50 flex justify-center px-4 lg:hidden">
            <div className="relative flex w-full max-w-[340px] justify-center">
              {isQuickMenuOpen ? (
                <div className="absolute bottom-[66px] flex w-full flex-col items-stretch gap-2 rounded-2xl bg-surface p-3 shadow-xl">
                  <Button
                    variant="primary"
                    size="sm"
                    iconLeft={<MessageSquarePlus size={16} />}
                    onClick={() => {
                      setIsQuickMenuOpen(false);
                      handleNavigate('/community?compose=1');
                    }}
                  >
                    {tx('Publicar')}
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
                    {t('menu.suggest')}
                  </Button>
                </div>
              ) : null}

              <nav className="flex h-[60px] w-full items-center justify-between rounded-full border border-slate-200/80 bg-surface/95 px-1.5 shadow-[0_8px_24px_rgba(15,23,42,0.14)] backdrop-blur">
                <NavItem label={t('menu.home')} icon={<HomeIcon size={24} />} active={isActive('/home')} onNavigate={() => handleNavigate('/home')} />
                <NavItem
                  label={t('menu.search')}
                  icon={<SearchIcon size={24} />}
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
                  aria-label={isQuickMenuOpen ? t('menu.createClose') : t('menu.createOpen')}
                  className="-mt-7 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white shadow-md ring-[3px] ring-white transition-transform hover:brightness-105 active:scale-95"
                >
                  {isQuickMenuOpen ? <X size={19} /> : <Plus size={21} />}
                </button>

                <NavItem label={t('menu.community')} icon={<Users size={24} />} active={isActive('/community')} onNavigate={() => handleNavigate('/community')} />
                <NavItem
                  label={t('menu.messages')}
                  icon={<MessageCircle size={24} />}
                  active={isActive('/inbox')}
                  badge={unreadCount}
                  onNavigate={() => handleNavigate('/inbox')}
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
            title={tx('Alterar região')}
            description={tx('Escolha a comunidade local que deseja acompanhar.')}
            footer={
              <>
                <Button variant="ghost" onClick={() => setIsRegionSelectorOpen(false)} disabled={savingRegion}>
                  {tx('Cancelar')}
                </Button>
                <Button onClick={() => void saveRegion()} loading={savingRegion} disabled={!selectedRegion.key}>
                  {tx('Confirmar região')}
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
              label={tx('Sua região')}
              hint={tx('Pesquise pela cidade ou use sua localização atual.')}
            />
          </Modal>
          <MarketplaceChatBubble user={user} />
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
  badge?: number;
}> = ({ label, icon, active, onNavigate, badge = 0 }) => {
  const { tx } = useLanguage();
  return (
  <button
    type="button"
    onClick={onNavigate}
    aria-label={badge > 0 ? `${label}, ${badge} ${tx('novas')}` : label}
    aria-current={active ? "page" : undefined}
    className="flex h-full min-w-[56px] flex-1 flex-col items-center justify-center gap-0.5"
  >
    <span
      className={`relative flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
        active ? 'bg-brand-100 text-brand-500' : 'text-slate-400'
      }`}
    >
      {icon}
      {badge > 0 ? <span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-red-500" aria-hidden /> : null}
    </span>
    {active ? <span className="text-[10px] font-bold leading-none text-brand-500">{label}</span> : null}
  </button>
);
};

export default Layout;
