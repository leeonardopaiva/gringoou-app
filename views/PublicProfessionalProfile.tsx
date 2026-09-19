import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { BadgeCheck, BriefcaseBusiness, CalendarDays, Globe2, MapPin, Megaphone } from 'lucide-react';
import StarRating from '../components/engagement/StarRating';
import { Logo } from '../components/Layout';
import { handleAvatarError } from '../lib/avatar';
import { PublicProfessionalProfile, User } from '../types';

type PublicProfessionalProfileProps = {
  username: string;
  viewer?: User | null;
  embedded?: boolean;
};

const defaultProfile: PublicProfessionalProfile = {
  id: '',
  name: 'Vitrine profissional',
  username: '',
  image: null,
  coverImageUrl: null,
  locationLabel: null,
  joinedAt: new Date().toISOString(),
  personalPublicPath: '/',
  professionalPublicPath: '/',
  headline: 'Vitrine profissional da comunidade.',
  stats: {
    businessCount: 0,
    eventCount: 0,
  },
  businesses: [],
  events: [],
};

const PROFILE_GRADIENT_CLASS = 'bg-foreground';

const getInitials = (name: string) =>
  name
    .split(' ')
    .map((part) => part.trim()[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

const PublicProfessionalProfileView: React.FC<PublicProfessionalProfileProps> = ({
  username,
  viewer,
  embedded = false,
}) => {
  const [profile, setProfile] = useState<PublicProfessionalProfile>(defaultProfile);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    const loadProfile = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/users/${encodeURIComponent(username)}/professional`, {
          cache: 'no-store',
        });
        const payload = await response.json().catch(() => null);

        if (!response.ok || !payload?.profile) {
          throw new Error(payload?.error ?? 'Não foi possível carregar esta vitrine profissional.');
        }

        if (!ignore) {
          setProfile(payload.profile);
        }
      } catch (loadError) {
        if (!ignore) {
          setError(
            loadError instanceof Error ? loadError.message : 'Não foi possível carregar a vitrine profissional.',
          );
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    void loadProfile();

    return () => {
      ignore = true;
    };
  }, [username]);

  const pageContainerClass = embedded
    ? 'animate-in pb-24 fade-in duration-500'
    : 'min-h-screen bg-texture px-4 py-5 sm:px-6 lg:px-8 lg:py-8';
  const wrapperClass = embedded
    ? 'mx-auto w-full max-w-[600px]'
    : 'mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-6xl items-start justify-center';
  const isOwnProfile = viewer?.username === profile.username;

  if (loading) {
    return (
      <div className={pageContainerClass}>
        <div className={wrapperClass}>
          <div className="w-full space-y-5">
            {!embedded ? (
              <div className="mb-4 flex justify-center">
                <Logo size="lg" />
              </div>
            ) : null}
            <div className="h-72 animate-pulse rounded-[36px] bg-white shadow-sm" />
            <div className="h-96 animate-pulse rounded-[36px] bg-white shadow-sm" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={pageContainerClass}>
        <div className={wrapperClass}>
          <div className="w-full space-y-5">
            {!embedded ? (
              <div className="mb-4 flex justify-center">
                <Logo size="lg" />
              </div>
            ) : null}
            <div className="rounded-[32px] border border-red-100 bg-red-50 p-6 text-center">
              <h1 className="text-xl font-bold text-red-700">Vitrine indisponível</h1>
              <p className="mt-3 text-sm text-red-600">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={pageContainerClass}>
      <div className={wrapperClass}>
        <div className="w-full">
          {!embedded ? (
            <div className="mb-4 flex justify-center">
              <Logo size="lg" />
            </div>
          ) : null}

          <section className="overflow-hidden rounded-[36px] bg-white shadow-sm">
            <div className={`relative h-80 ${profile.coverImageUrl ? 'bg-slate-100' : PROFILE_GRADIENT_CLASS}`}>
              {profile.coverImageUrl ? (
                <img src={profile.coverImageUrl} alt={`Capa profissional de ${profile.name}`} className="h-full w-full object-cover object-center" />
              ) : (
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.28),_transparent_28%)]" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-slate-950/10 to-transparent" />
              <div className="absolute left-6 top-6 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-white backdrop-blur-sm">
                <BriefcaseBusiness size={14} />
                Vitrine profissional
              </div>
            </div>

            <div className="-mt-12 px-5 pb-8">
              <div className="mx-auto flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-[5px] border-white bg-white shadow-lg">
                {profile.image ? (
                  <img src={profile.image} alt={profile.name} className="h-full w-full object-cover" onError={handleAvatarError} />
                ) : (
                  <div className={`flex h-full w-full items-center justify-center ${PROFILE_GRADIENT_CLASS} text-3xl font-bold text-white`}>
                    {getInitials(profile.name)}
                  </div>
                )}
              </div>

              <div className="mt-5 flex flex-col items-center text-center">
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">{profile.name}</h1>
                  <BadgeCheck size={28} className="text-brand-500" />
                </div>
                <p className="mt-2 text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                  @{profile.username}
                </p>
                <p className="mt-4 max-w-3xl text-lg leading-relaxed text-slate-700">{profile.headline}</p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-sm font-semibold text-slate-600">
                  {profile.locationLabel ? (
                    <span className="inline-flex items-center gap-2">
                      <MapPin size={16} />
                      {profile.locationLabel}
                    </span>
                  ) : null}
                  <span className="inline-flex items-center gap-2">
                    <Globe2 size={16} />
                    Presença pública profissional
                  </span>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href={profile.personalPublicPath}
                    className="inline-flex min-h-12 items-center justify-center rounded-[22px] border border-slate-200 bg-white px-6 text-sm font-bold text-slate-700 shadow-sm"
                  >
                    Ver perfil pessoal
                  </Link>
                  {isOwnProfile ? (
                    <Link
                      href="/profile"
                      className="inline-flex min-h-12 items-center justify-center rounded-full bg-brand-500 px-6 text-sm font-bold text-white shadow-sm"
                    >
                      Abrir central profissional
                    </Link>
                  ) : null}
                </div>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <MetricCard icon={<BriefcaseBusiness size={18} />} value={profile.stats.businessCount} label="Negócios" />
                <MetricCard icon={<CalendarDays size={18} />} value={profile.stats.eventCount} label="Eventos" />
                <MetricCard icon={<BadgeCheck size={18} />} value={profile.businesses.length} label="Em destaque" />
                <MetricCard icon={<Globe2 size={18} />} value={1} label="Vitrine ativa" />
              </div>
            </div>
          </section>

          <section className="mt-6 rounded-[32px] border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-slate-400">
              <BriefcaseBusiness size={16} />
              Negócios em destaque
            </div>
            {profile.businesses.length > 0 ? (
              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                {profile.businesses.map((business) => (
                  <div key={business.id} className="flex gap-4 rounded-[28px] border border-slate-100 bg-slate-50 p-4">
                    <img
                      src={business.imageUrl || `https://picsum.photos/seed/${business.id}/320`}
                      alt={business.name}
                      className="h-24 w-24 rounded-2xl object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-body-lg font-bold text-foreground">{business.name}</p>
                      <p className="mt-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{business.category}</p>
                      {business.locationLabel ? <p className="mt-2 text-sm text-slate-500">{business.locationLabel}</p> : null}
                      <div className="mt-3">
                        <StarRating average={business.ratingAverage} count={business.ratingCount} compact />
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Link href={`/negocios/${business.slug}`} className="inline-flex min-h-9 items-center rounded-full border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700">Ver página</Link>
                        {isOwnProfile ? <Link href={`/negocios/${business.slug || business.id}/gerenciar`} className="inline-flex min-h-9 items-center rounded-full border border-brand-100 bg-brand-50 px-3 text-xs font-bold text-brand-600">Gerenciar</Link> : null}
                        {isOwnProfile ? <Link href={`/ads/promover/${business.id}`} className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-brand-500 px-3 text-xs font-bold text-white"><Megaphone size={13} />Promover</Link> : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState text="Nenhum negócio público disponível nesta vitrine profissional." />
            )}
          </section>

          <section className="mt-6 rounded-[32px] border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-slate-400">
              <CalendarDays size={16} />
              Agenda profissional
            </div>
            {profile.events.length > 0 ? (
              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                {profile.events.map((event) => (
                  <Link key={event.id} href={`/eventos/${event.slug}`} className="flex gap-4 rounded-[28px] border border-slate-100 bg-slate-50 p-4">
                    <img
                      src={event.imageUrl || `https://picsum.photos/seed/${event.id}/320`}
                      alt={event.title}
                      className="h-24 w-24 rounded-2xl object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-body-lg font-bold text-foreground">{event.title}</p>
                      <p className="mt-1 text-sm text-slate-500">{formatDate(event.startsAt)}</p>
                      <p className="mt-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{event.venueName}</p>
                      <div className="mt-3">
                        <StarRating average={event.ratingAverage} count={event.ratingCount} compact />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState text="Nenhum evento público disponível nesta vitrine profissional." />
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

const MetricCard: React.FC<{ icon: React.ReactNode; value: number; label: string }> = ({ icon, value, label }) => (
  <div className="rounded-[24px] border border-slate-100 bg-slate-50 p-4 text-center">
    <div className="mx-auto inline-flex h-10 w-10 items-center justify-center rounded-md bg-brand-100 text-brand-500">
      {icon}
    </div>
    <p className="mt-3 text-2xl font-bold text-slate-900">{value}</p>
    <p className="text-xs font-medium text-slate-500">{label}</p>
  </div>
);

const EmptyState: React.FC<{ text: string }> = ({ text }) => (
  <div className="mt-5 rounded-[28px] border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center text-sm font-medium text-slate-500">
    {text}
  </div>
);

export default PublicProfessionalProfileView;
