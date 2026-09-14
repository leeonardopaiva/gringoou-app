import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { LogIn, MapPin, Tag, UserCheck, UsersRound } from 'lucide-react';
import { useToast } from '../components/feedback/ToastProvider';
import { Logo } from '../components/Layout';
import type { User } from '../types';

type GroupMember = {
  id: string;
  role: string;
  joinedAt: string;
  user: {
    id: string;
    name?: string | null;
    username?: string | null;
    image?: string | null;
    locationLabel?: string | null;
  };
};

type PublicGroupState = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  category?: string | null;
  regionLabel?: string | null;
  createdAt: string;
  memberCount: number;
  publicPath: string;
  viewerMembership?: {
    id: string;
    role: string;
  } | null;
  members: GroupMember[];
};

type PublicGroupProps = {
  slug: string;
  viewer?: User | null;
  embedded?: boolean;
};

const defaultGroup: PublicGroupState = {
  id: '',
  name: 'Grupo',
  slug: '',
  createdAt: new Date().toISOString(),
  memberCount: 0,
  publicPath: '/',
  viewerMembership: null,
  members: [],
};

const PROFILE_GRADIENT_CLASS = 'bg-brand-500';

const getInitials = (name: string) =>
  name
    .split(' ')
    .map((part) => part.trim()[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

const PublicGroup: React.FC<PublicGroupProps> = ({ slug, viewer, embedded = false }) => {
  const { showToast } = useToast();
  const [group, setGroup] = useState<PublicGroupState>(defaultGroup);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [membershipLoading, setMembershipLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let ignore = false;

    const loadGroup = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/groups/${encodeURIComponent(slug)}`, { cache: 'no-store' });
        const payload = await response.json().catch(() => null);

        if (!response.ok || !payload?.group) {
          throw new Error(payload?.error ?? 'Nao foi possivel carregar este grupo.');
        }

        if (!ignore) {
          setGroup(payload.group);
        }
      } catch (loadError) {
        if (!ignore) {
          setError(loadError instanceof Error ? loadError.message : 'Nao foi possivel carregar este grupo.');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    void loadGroup();

    return () => {
      ignore = true;
    };
  }, [slug, refreshKey]);

  const handleMembership = async () => {
    if (!viewer) {
      return;
    }

    setMembershipLoading(true);

    try {
      const response = await fetch(`/api/groups/${encodeURIComponent(group.slug)}/members`, {
        method: group.viewerMembership ? 'DELETE' : 'POST',
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error ?? 'Nao foi possivel atualizar sua participacao.');
      }

      showToast(payload?.message ?? 'Participacao atualizada.', 'success');
      setRefreshKey((current) => current + 1);
    } catch (membershipError) {
      showToast(
        membershipError instanceof Error ? membershipError.message : 'Nao foi possivel atualizar sua participacao.',
        'error',
      );
    } finally {
      setMembershipLoading(false);
    }
  };

  const pageContainerClass = embedded
    ? 'animate-in pb-24 fade-in duration-500'
    : 'min-h-screen bg-texture px-4 py-5 sm:px-6 lg:px-8 lg:py-8';
  const wrapperClass = embedded
    ? 'mx-auto w-full max-w-[600px]'
    : 'mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-5xl items-start justify-center';

  if (loading) {
    return (
      <div className={pageContainerClass}>
        <div className={wrapperClass}>
          <div className="w-full space-y-5">
            {!embedded ? <div className="mb-4 flex justify-center"><Logo size="lg" /></div> : null}
            <div className="h-80 animate-pulse rounded-[36px] bg-white shadow-sm" />
            <div className="h-72 animate-pulse rounded-[36px] bg-white shadow-sm" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={pageContainerClass}>
        <div className={wrapperClass}>
          <div className="w-full rounded-[32px] border border-red-100 bg-red-50 p-6 text-center">
            <h1 className="text-xl font-bold text-red-700">Grupo indisponivel</h1>
            <p className="mt-3 text-sm text-red-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={pageContainerClass}>
      <div className={wrapperClass}>
        <div className="w-full">
          {!embedded ? <div className="mb-4 flex justify-center"><Logo size="lg" /></div> : null}

          <section className="overflow-hidden rounded-[36px] bg-white shadow-sm">
            <div className={`relative h-72 ${group.imageUrl ? 'bg-slate-100' : PROFILE_GRADIENT_CLASS}`}>
              {group.imageUrl ? (
                <img src={group.imageUrl} alt={group.name} className="h-full w-full object-cover object-center" />
              ) : null}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 via-slate-950/10 to-transparent" />
              <div className="absolute bottom-5 left-5 right-5 text-white">
                <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-card bg-surface text-xl font-bold text-brand-500">
                  {getInitials(group.name)}
                </div>
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{group.name}</h1>
                <div className="mt-3 flex flex-wrap gap-2 text-sm font-semibold">
                  {group.category ? (
                    <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 backdrop-blur">
                      <Tag size={14} />
                      {group.category}
                    </span>
                  ) : null}
                  {group.regionLabel ? (
                    <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 backdrop-blur">
                      <MapPin size={14} />
                      {group.regionLabel}
                    </span>
                  ) : null}
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 backdrop-blur">
                    <UsersRound size={14} />
                    {group.memberCount} membro{group.memberCount === 1 ? '' : 's'}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-6 p-5">
              {group.description ? (
                <p className="text-base leading-7 text-slate-700">{group.description}</p>
              ) : (
                <p className="text-base leading-7 text-slate-500">Grupo publico da comunidade Gringoou.</p>
              )}

              {viewer ? (
                <button
                  type="button"
                  onClick={() => void handleMembership()}
                  disabled={membershipLoading}
                  className={`inline-flex min-h-12 items-center gap-3 rounded-[22px] px-8 text-base font-bold shadow-sm disabled:opacity-60 ${
                    group.viewerMembership
                      ? 'border border-emerald-100 bg-emerald-50 text-emerald-700'
                      : 'bg-brand-500 text-white'
                  }`}
                >
                  <UserCheck size={20} />
                  {membershipLoading ? 'Aguarde...' : group.viewerMembership ? 'Participando' : 'Participar'}
                </button>
              ) : (
                <Link
                  href="/"
                  className="inline-flex min-h-12 items-center gap-3 rounded-full bg-brand-500 px-8 text-base font-bold text-white shadow-sm"
                >
                  <LogIn size={20} />
                  Entrar para participar
                </Link>
              )}
            </div>
          </section>

          <section className="mt-5 rounded-[32px] border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-2xl font-bold text-slate-900">Membros</h2>
              <span className="text-sm font-semibold text-slate-400">
                {group.memberCount} pessoa{group.memberCount === 1 ? '' : 's'}
              </span>
            </div>

            {group.members.length === 0 ? (
              <div className="mt-5 rounded-[28px] border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center text-sm font-medium text-slate-500">
                Ainda nao ha membros visiveis neste grupo.
              </div>
            ) : (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {group.members.map((member) => (
                  <Link
                    key={member.id}
                    href={member.user.username ? `/${member.user.username}` : '/'}
                    className="flex items-center gap-4 rounded-[28px] border border-slate-100 bg-slate-50 p-4"
                  >
                    {member.user.image ? (
                      <img src={member.user.image} alt={member.user.name || 'Membro'} className="h-14 w-14 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-base font-bold text-brand-500">
                        {getInitials(member.user.name || 'Membro')}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-base font-bold text-slate-900">{member.user.name || 'Membro'}</p>
                      <p className="truncate text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                        @{member.user.username || 'perfil'}
                      </p>
                      {member.user.locationLabel ? (
                        <p className="mt-1 truncate text-sm text-slate-500">{member.user.locationLabel}</p>
                      ) : null}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default PublicGroup;
