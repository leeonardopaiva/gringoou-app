'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  MapPin,
  ChevronDown,
  ExternalLink,
  Building2,
  House,
  Briefcase,
  Users,
  CalendarDays,
  ShoppingBag,
  UserPlus,
  type LucideIcon,
} from 'lucide-react';
import { useToast } from '../components/feedback/ToastProvider';
import RegionSelector from '../components/RegionSelector';
import UnifiedSearchInput from '../components/search/UnifiedSearchInput';
import { useRegionBanners, useRegionCommunityPosts } from '../hooks/useRegionContent';
import { trackAnalyticsEvent } from '../lib/analytics';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { TrendsCarousel, type TrendItem } from '../components/app/TrendsCarousel';
import { STATIC_HOUSING, STATIC_JOBS } from '../lib/static-catalog';
import { BannerAd, Business, EventItem, User } from '../types';
import type { HomeInitialData } from '../lib/content-contracts';
import { ViewableAdSlot } from '../components/ads/ViewableAdSlot';
import { ContentColumn } from '../components/ui/ContentColumn';

const animatedSearchTerms = ['restaurantes', 'bares', 'eventos', 'pessoas'];

const Home: React.FC<{ user: User; initialData?: HomeInitialData }> = ({ user, initialData }) => {
  const router = useRouter();
  const { update } = useSession();
  const { showToast } = useToast();
  const [editingRegion, setEditingRegion] = useState(false);
  const [selectedRegionKey, setSelectedRegionKey] = useState(user.regionKey || '');
  const [savingRegion, setSavingRegion] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAiSearchOpen, setIsAiSearchOpen] = useState(false);
  const [latestBusiness, setLatestBusiness] = useState<Business | null>(initialData?.latestBusiness ?? null);
  const [latestEvent, setLatestEvent] = useState<EventItem | null>(initialData?.latestEvent ?? null);
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const [submittingBannerId, setSubmittingBannerId] = useState<string | null>(null);
  const [searchPlaceholderIndex, setSearchPlaceholderIndex] = useState(0);
  const { data: banners } = useRegionBanners('home', user.regionKey);
  const { data: communityPosts } = useRegionCommunityPosts(user.regionKey, 4);
  const latestPost = communityPosts[0] ?? initialData?.latestPost;
  const latestJob = STATIC_JOBS[0];
  const latestHousing = STATIC_HOUSING[0];
  const trendItems: TrendItem[] = [
    { href: latestPost ? `/community?post=${encodeURIComponent(latestPost.id)}` : '/community', category: 'Comunidade', title: latestPost?.content || 'Participe das conversas da comunidade', description: latestPost ? `Por ${latestPost.author.name}` : 'Veja as publicações mais recentes', icon: Users, imageUrl: latestPost?.imageUrl },
    { href: latestBusiness?.publicPath || (latestBusiness ? `/negocios/${latestBusiness.slug || latestBusiness.id}` : '/negocios'), category: 'Negócios', title: latestBusiness?.name || 'Descubra negócios brasileiros', description: latestBusiness?.category || 'Serviços perto de você', icon: Building2, imageUrl: latestBusiness?.imageUrl },
    { href: latestEvent?.publicPath || (latestEvent ? `/eventos/${latestEvent.slug || latestEvent.id}` : '/eventos'), category: 'Eventos', title: latestEvent?.title || 'Veja os próximos eventos', description: latestEvent?.venueName || 'Agenda da sua região', icon: CalendarDays, imageUrl: latestEvent?.imageUrl },
    { href: '/vagas', category: 'Vagas', title: latestJob.title, description: `${latestJob.company} · ${latestJob.salary}`, icon: Briefcase, imageUrl: latestJob.img },
    { href: '/moradia', category: 'Moradia', title: latestHousing.title, description: `${latestHousing.location} · ${latestHousing.price}`, icon: House, imageUrl: latestHousing.img },
  ];

  useEffect(() => {
    setSelectedRegionKey(user.regionKey || '');
  }, [user.regionKey]);

  useEffect(() => {
    const controller = new AbortController();
    const regionQuery = user.regionKey ? `?region=${encodeURIComponent(user.regionKey)}` : '';

    void Promise.all([
      fetch(`/api/businesses${regionQuery}`, { signal: controller.signal }).then((response) => response.ok ? response.json() : null),
      fetch(`/api/events${regionQuery}`, { signal: controller.signal, cache: 'no-store' }).then((response) => response.ok ? response.json() : null),
    ]).then(([businessPayload, eventPayload]) => {
      setLatestBusiness(businessPayload?.businesses?.[0] ?? null);
      setLatestEvent(eventPayload?.events?.[0] ?? null);
    }).catch((error) => {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      console.error('Failed to load Home trends:', error);
    });

    return () => controller.abort();
  }, [user.regionKey]);

  useEffect(() => {
    if (activeBannerIndex <= Math.max(banners.length - 1, 0)) {
      return;
    }

    setActiveBannerIndex(0);
  }, [activeBannerIndex, banners.length]);

  useEffect(() => {
    if (banners.length <= 1) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setActiveBannerIndex((current) => (current + 1) % banners.length);
    }, 3000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [banners.length]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setSearchPlaceholderIndex((current) => (current + 1) % animatedSearchTerms.length);
    }, 2200);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const handleRegionSave = async () => {
    if (!selectedRegionKey) {
      showToast('Selecione uma regiao valida antes de salvar.', 'error');
      return;
    }

    setSavingRegion(true);

    try {
      const response = await fetch('/api/profile/region', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ regionKey: selectedRegionKey }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        showToast(payload?.error ?? 'Nao foi possivel atualizar a sua regiao.', 'error');
        return;
      }

      await update();
      setEditingRegion(false);
      showToast('Regiao de visualizacao atualizada.', 'success');
    } catch (error) {
      console.error('Failed to update region from home:', error);
      showToast('Nao foi possivel atualizar a sua regiao.', 'error');
    } finally {
      setSavingRegion(false);
    }
  };

  const handleDisabledFeatureClick = (targetKey: string, label: string) => {
    showToast(`${label} chega em breve.`, 'info');
    trackAnalyticsEvent({
      type: 'disabled_feature_click',
      targetType: 'feature',
      targetKey,
      label,
      sourcePath: '/',
      sourceSection: 'home_services',
      regionKey: user.regionKey,
    });
  };

  const handleBannerLinkClick = (banner: BannerAd) => {
    if (!banner.targetUrl) {
      showToast('Esse banner ainda nao tem um link configurado.', 'error');
      return;
    }

    trackAnalyticsEvent({
      type: 'banner_click',
      targetType: 'banner',
      targetKey: banner.id,
      label: banner.name,
      sourcePath: '/',
      sourceSection: 'home_banner',
      regionKey: user.regionKey,
    });

    window.open(banner.targetUrl, '_blank', 'noopener,noreferrer');
  };

  const handleBannerRegistration = async (banner: BannerAd) => {
    setSubmittingBannerId(banner.id);

    try {
      const response = await fetch(`/api/banners/${banner.id}/registration`, {
        method: 'POST',
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error ?? 'Nao foi possivel registrar seu interesse.');
      }

      showToast(payload?.message ?? 'Cadastro registrado.', 'success');
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Nao foi possivel registrar seu interesse.',
        'error',
      );
    } finally {
      setSubmittingBannerId(null);
    }
  };

  return (
    <ContentColumn className="animate-in space-y-5 px-5 pb-28 fade-in slide-in-from-bottom-4 duration-500 md:pb-8">
      <div className="relative mt-3 inline-block">
        <button
          type="button"
          onClick={() => {
            setEditingRegion((current) => !current);
          }}
          className="inline-flex h-7 items-center gap-1 rounded-full bg-brand-100 px-2.5 text-[11px] font-semibold text-brand-500 transition hover:brightness-95"
        >
          <MapPin size={12} />
          <span className="leading-none">{user.location}</span>
          <ChevronDown
            size={12}
            className={`transition-transform ${editingRegion ? 'rotate-180' : ''}`}
          />
        </button>

        {editingRegion ? (
          <div className="absolute left-0 top-full z-[120] mt-2 w-[min(24rem,calc(100vw-2.5rem))] rounded-2xl border border-border bg-surface p-4 shadow-lg">
            <RegionSelector
              value={selectedRegionKey}
              onChange={(region) => {
                setSelectedRegionKey(region.key);
              }}
              autoDetect
              hint="Escolha a regiao para priorizar negocios, comunidade e eventos."
            />

            <div className="mt-4 flex gap-3">
              <Button variant="primary" fullWidth loading={savingRegion} onClick={handleRegionSave}>
                Salvar regiao
              </Button>
              <Button
                variant="secondary"
                fullWidth
                disabled={savingRegion}
                onClick={() => {
                  setEditingRegion(false);
                  setSelectedRegionKey(user.regionKey || '');
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <UnifiedSearchInput
        value={searchQuery}
        onChange={setSearchQuery}
        animatedTerms={animatedSearchTerms}
        animatedIndex={searchPlaceholderIndex}
        onSubmit={() => {
          const trimmed = searchQuery.trim();
          if (!trimmed) return;
          router.push(`/buscar?q=${encodeURIComponent(trimmed)}`);
        }}
        onFilterClick={() => setIsAiSearchOpen(true)}
      />

      <div className="flex items-center justify-between">
        <h3 className="text-body-sm font-bold text-text">Categorias</h3>
        <button type="button" onClick={() => router.push('/buscar')} className="text-body-sm font-semibold text-brand-500">
          Ver todas
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <ServiceCard href="/negocios" icon={Building2} label="Negocios" onActivate={() => router.push('/negocios')} />
        <ServiceCard href="/community" icon={Users} label="Comunidade" onActivate={() => router.push('/community')} />
        <ServiceCard href="/eventos" icon={CalendarDays} label="Eventos" onActivate={() => router.push('/eventos')} />
        <ServiceCard
          href="/vagas"
          icon={Briefcase}
          label="Vagas"
          onActivate={() => router.push('/vagas')}
        />
        <ServiceCard
          href="/marketplace"
          icon={ShoppingBag}
          label="Marketplace"
          disabled
          onDisabledClick={() => handleDisabledFeatureClick('marketplace', 'Marketplace')}
        />
        <ServiceCard
          href="/moradia"
          icon={House}
          label="Moradia"
          onActivate={() => router.push('/moradia')}
        />
      </div>

      {banners.length > 0 ? (
        <div className="space-y-3">
          <div className="overflow-hidden rounded-2xl">
            <div
              className="flex transition-transform duration-700 ease-out"
              style={{ transform: `translateX(-${activeBannerIndex * 100}%)` }}
            >
              {banners.map((banner) => (
                <ViewableAdSlot
                  key={banner.id}
                  banner={banner}
                  placement="HOME"
                  className="w-full flex-none"
                >
                  <div className="relative overflow-hidden rounded-2xl bg-white shadow-sm">
                    {banner.type === 'REGISTRATION' ? (
                      <>
                        <img src={banner.imageUrl} alt={banner.name} className="aspect-[16/7] w-full object-cover" />
                        <div className="flex items-center justify-between gap-3 px-4 py-3">
                          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Publicidade</span>
                          <Button
                            size="sm"
                            iconLeft={<UserPlus size={16} />}
                            onClick={() => void handleBannerRegistration(banner)}
                            loading={submittingBannerId === banner.id}
                          >
                            {banner.ctaLabel || 'Tenho interesse'}
                          </Button>
                        </div>
                      </>
                    ) : (
                      <button type="button" onClick={() => handleBannerLinkClick(banner)} className="group relative block w-full text-left">
                        <img src={banner.imageUrl} alt={banner.name} className="aspect-[16/7] w-full object-cover transition duration-300 group-hover:scale-[1.01]" />
                        <span className="absolute bottom-3 left-3 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white backdrop-blur">Publicidade</span>
                        <span className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-foreground shadow-sm"><ExternalLink size={15} /></span>
                      </button>
                    )}
                  </div>
                </ViewableAdSlot>
              ))}
            </div>
          </div>
          {banners.length > 1 ? (
            <div className="flex items-center justify-center gap-2">
              {banners.map((banner, index) => (
                <button
                  key={banner.id}
                  type="button"
                  onClick={() => setActiveBannerIndex(index)}
                  aria-label={`Ir para banner ${index + 1}`}
                  className={`h-2.5 rounded-full transition-all ${
                    index === activeBannerIndex ? 'theme-bg w-6' : 'w-2.5 bg-slate-300'
                  }`}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <TrendsCarousel items={trendItems} />

      <Modal
        open={isAiSearchOpen}
        onClose={() => setIsAiSearchOpen(false)}
        title="O que você procura?"
        description="Pesquise em toda a comunidade ou escolha uma categoria."
        fullscreen
      >
        <div className="mx-auto mt-6 max-w-2xl space-y-8">
          <UnifiedSearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            staticPlaceholder="Descreva o que você precisa..."
            onSubmit={() => {
              const trimmed = searchQuery.trim();
              if (!trimmed) return;
              setIsAiSearchOpen(false);
              router.push(`/buscar?q=${encodeURIComponent(trimmed)}`);
            }}
          />
          <div>
            <h3 className="mb-3 text-body-sm font-bold text-foreground">Explorar categorias</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {trendItems.map(({ href, category, icon: Icon }) => (
                <button
                  key={href}
                  type="button"
                  onClick={() => {
                    setIsAiSearchOpen(false);
                    router.push(href);
                  }}
                  className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-card border border-border bg-surface p-4 text-center text-body-sm font-semibold text-foreground transition hover:border-brand-200 hover:bg-brand-100"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-brand-500">
                    <Icon size={19} aria-hidden="true" />
                  </span>
                  {category}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Modal>

    </ContentColumn>
  );
};

const ServiceCard: React.FC<{
  href: string;
  icon: LucideIcon;
  label: string;
  disabled?: boolean;
  onDisabledClick?: () => void;
  onActivate?: () => void;
}> = ({
  href,
  icon: Icon,
  label,
  disabled = false,
  onDisabledClick,
  onActivate,
}) => {
  const classes = `flex flex-col items-center justify-center gap-2 rounded-2xl border p-3 transition-all ${
    disabled
      ? 'cursor-pointer border-slate-200 bg-white opacity-50'
      : 'border-slate-200 bg-white hover:border-brand-300 active:scale-95'
  }`;

  const content = (
    <>
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-full ${
          disabled ? 'bg-slate-100 text-slate-400' : 'theme-icon-surface'
        }`}
      >
        <Icon size={20} strokeWidth={2.2} />
      </div>
      <span className={`block text-center text-caption font-bold leading-tight ${disabled ? 'text-slate-400' : 'text-text'}`}>
        {label}
      </span>
    </>
  );

  if (disabled) {
    return (
      <button type="button" aria-disabled="true" onClick={onDisabledClick} className={classes}>
        {content}
      </button>
    );
  }

  if (onActivate) {
    return (
      <button type="button" onClick={onActivate} className={classes}>
        {content}
      </button>
    );
  }

  return (
    <Link href={href} className={classes}>
      {content}
    </Link>
  );
};

export default Home;
