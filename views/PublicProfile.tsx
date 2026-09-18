import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  BadgeCheck,
  CalendarDays,
  Globe2,
  Images,
  MapPin,
  MessageSquareText,
  MoreHorizontal,
  Plus,
  UserCheck,
  UserPlus,
  Users,
  UsersRound,
} from 'lucide-react';
import StarRating from '../components/engagement/StarRating';
import { useToast } from '../components/feedback/ToastProvider';
import { Logo } from '../components/Layout';
import RegionSelector from '../components/RegionSelector';
import { DEFAULT_AVATAR_URL, handleAvatarError } from '../lib/avatar';
import { PublicUserProfile, User } from '../types';
import { Modal } from '../components/ui/Modal';

type PublicProfileProps = {
  username: string;
  viewer?: User | null;
  embedded?: boolean;
};

type PublicTab = 'about' | 'interests' | 'friends' | 'groups' | 'photos' | 'recommendations';

const defaultProfile: PublicUserProfile = {
  id: '',
  name: 'Perfil público',
  username: '',
  image: null,
  coverImageUrl: null,
  bio: null,
  interests: [],
  galleryUrls: [],
  locationLabel: null,
  joinedAt: new Date().toISOString(),
  publicPath: '/',
  friendFeature: {
    available: false,
    canRequest: false,
    status: 'signed_out',
    requestId: null,
  },
  stats: {
    friendCount: 0,
    businessCount: 0,
    eventCount: 0,
    postCount: 0,
  },
  friends: [],
  groups: [],
  businesses: [],
  events: [],
  posts: [],
};

const formatJoinedDate = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'long',
  }).format(new Date(value));

const formatEventDate = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

const formatMembershipDuration = (value: string) => {
  const joinedAt = new Date(value);
  const now = new Date();
  const monthDiff =
    (now.getFullYear() - joinedAt.getFullYear()) * 12 +
    (now.getMonth() - joinedAt.getMonth());

  if (monthDiff >= 12) {
    const years = Math.floor(monthDiff / 12);
    return `Membro ha ${years} ${years === 1 ? 'ano' : 'anos'}`;
  }

  if (monthDiff >= 1) {
    return `Membro ha ${monthDiff} ${monthDiff === 1 ? 'mes' : 'meses'}`;
  }

  const dayDiff = Math.max(1, Math.floor((now.getTime() - joinedAt.getTime()) / (1000 * 60 * 60 * 24)));
  return `Membro ha ${dayDiff} ${dayDiff === 1 ? 'dia' : 'dias'}`;
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

const uniqueStrings = (values: Array<string | null | undefined>) =>
  Array.from(new Set(values.filter((value): value is string => Boolean(value))));

const PublicProfile: React.FC<PublicProfileProps> = ({ username, viewer, embedded = false }) => {
  const { showToast } = useToast();
  const [profile, setProfile] = useState<PublicUserProfile>(defaultProfile);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<PublicTab>('about');
  const [refreshKey, setRefreshKey] = useState(0);
  const [friendActionLoading, setFriendActionLoading] = useState(false);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [groupDraft, setGroupDraft] = useState({
    name: '',
    category: '',
    description: '',
    regionKey: '',
  });

  useEffect(() => {
    let ignore = false;

    const loadProfile = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/users/${encodeURIComponent(username)}/public`, {
          cache: 'no-store',
        });
        const payload = await response.json().catch(() => null);

        if (!response.ok || !payload?.profile) {
          throw new Error(payload?.error ?? 'Nao foi possivel carregar este perfil publico.');
        }

        if (!ignore) {
          setProfile(payload.profile);
        }
      } catch (loadError) {
        if (!ignore) {
          setError(loadError instanceof Error ? loadError.message : 'Nao foi possivel carregar este perfil.');
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
  }, [username, refreshKey]);

  const isOwnProfile = viewer?.username === profile.username;
  const photoItems = useMemo(
    () =>
      uniqueStrings([
        ...(profile.galleryUrls || []),
        ...profile.businesses.map((business) => business.imageUrl),
        ...profile.events.map((event) => event.imageUrl),
        ...profile.posts.map((post) => post.imageUrl),
      ]),
    [profile],
  );
  const heroImage = profile.coverImageUrl || null;
  const photoPreview = photoItems.slice(0, 6);
  const extraPhotos = Math.max(photoItems.length - photoPreview.length, 0);
  const interests = useMemo(() => {
    if (profile.interests.length > 0) {
      return profile.interests.slice(0, 8);
    }

    return uniqueStrings([
      ...profile.businesses.map((business) => business.category),
      profile.stats.businessCount > 0 ? 'Negócios locais' : null,
      profile.stats.eventCount > 0 ? 'Eventos da comunidade' : null,
      profile.stats.postCount > 0 ? 'Conversas locais' : null,
      profile.locationLabel?.split(',')[0],
    ]).slice(0, 6);
  }, [profile]);
  const profileQuote =
    profile.bio ||
    (profile.locationLabel && (profile.stats.businessCount > 0 || profile.stats.eventCount > 0)
      ? `Conectando brasileiros e oportunidades em ${profile.locationLabel}.`
      : 'Compartilhando experiencias e fortalecendo a comunidade brasileira.');
  const pageContainerClass = embedded
    ? 'animate-in pb-24 fade-in duration-500'
    : 'min-h-screen bg-texture px-4 py-5 sm:px-6 lg:px-8 lg:py-8';
  const wrapperClass = embedded
    ? 'mx-auto w-full max-w-[600px]'
    : 'mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-5xl items-start justify-center';

  const refreshProfile = () => setRefreshKey((current) => current + 1);

  const handleFriendAction = async () => {
    if (!viewer) {
      return;
    }

    setFriendActionLoading(true);

    try {
      const status = profile.friendFeature.status;
      const requestId = profile.friendFeature.requestId;
      const response =
        status === 'pending_received' && requestId
          ? await fetch(`/api/friends/requests/${requestId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'accept' }),
            })
          : await fetch('/api/friends/requests', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ recipientId: profile.id }),
            });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error ?? 'Nao foi possivel atualizar a conexao.');
      }

      showToast(payload?.message ?? 'Conexao atualizada.', 'success');
      refreshProfile();
    } catch (actionError) {
      showToast(
        actionError instanceof Error ? actionError.message : 'Nao foi possivel atualizar a conexao.',
        'error',
      );
    } finally {
      setFriendActionLoading(false);
    }
  };

  const handleCreateGroup = async () => {
    setCreatingGroup(true);

    try {
      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(groupDraft),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error ?? 'Nao foi possivel criar o grupo.');
      }

      showToast('Grupo criado.', 'success');
      setGroupDraft({ name: '', category: '', description: '', regionKey: '' });
      setGroupModalOpen(false);
      refreshProfile();
    } catch (createError) {
      showToast(createError instanceof Error ? createError.message : 'Nao foi possivel criar o grupo.', 'error');
    } finally {
      setCreatingGroup(false);
    }
  };

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
            <div className="h-80 animate-pulse rounded-[36px] bg-white shadow-sm" />
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
              <h1 className="text-xl font-bold text-red-700">Perfil indisponivel</h1>
              <p className="mt-3 text-sm text-red-600">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'about' as const, label: 'Sobre' },
    { id: 'friends' as const, label: 'Amigos' },
    { id: 'groups' as const, label: 'Grupos' },
    { id: 'interests' as const, label: 'Interesses' },
    { id: 'photos' as const, label: 'Fotos' },
    { id: 'recommendations' as const, label: 'Recomendações' },
  ];
  const friendStatus = profile.friendFeature.status || (viewer ? 'none' : 'signed_out');

  return (
    <div className={pageContainerClass}>
      <div className={wrapperClass}>
        <div className="w-full">
          {!embedded ? (
            <div className="mb-4 flex justify-center">
              <Logo size="lg" />
            </div>
          ) : null}

          <div className="relative">
            <div className={`relative h-72 overflow-hidden rounded-t-[36px] sm:h-80 lg:h-96 ${heroImage ? 'bg-slate-100' : PROFILE_GRADIENT_CLASS}`}>
              {heroImage ? (
                <img
                  src={heroImage}
                  className="h-full w-full object-cover object-center"
                  alt={`Capa de ${profile.name}`}
                />
              ) : (
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.28),_transparent_28%)]" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-white via-white/15 to-white/10" />
              {isOwnProfile ? (
                <div className="absolute right-4 top-4">
                  <Link
                    href="/profile?edit=cover"
                    className="inline-flex rounded-[22px] border border-white/70 bg-white/85 p-3 text-slate-600 shadow-sm backdrop-blur"
                    aria-label="Editar capa"
                  >
                    <MoreHorizontal size={18} />
                  </Link>
                </div>
              ) : null}
            </div>

            <div className="absolute left-1/2 top-full z-20 h-32 w-32 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full border-[6px] border-white bg-white shadow-lg sm:h-40 sm:w-40">
              {profile.image ? (
                <img
                  src={profile.image}
                  alt={profile.name}
                  className="h-full w-full object-cover"
                  onError={handleAvatarError}
                />
              ) : (
                <div className={`flex h-full w-full items-center justify-center ${PROFILE_GRADIENT_CLASS} text-4xl font-bold text-white`}>
                  {getInitials(profile.name)}
                </div>
              )}
            </div>
          </div>

          <div className="-mt-8 rounded-t-[36px] bg-white px-5 pb-8 pt-20 shadow-sm">
            <div className="flex flex-col items-center text-center">
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                  {profile.name}
                </h1>
                {profile.stats.businessCount > 0 || profile.stats.eventCount > 0 ? (
                  <BadgeCheck size={28} className="text-brand-500" />
                ) : null}
              </div>

              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                {formatMembershipDuration(profile.joinedAt)}
              </p>

              <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-700">
                "{profileQuote}"
              </p>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-base font-semibold text-slate-700">
                <span className="inline-flex items-center gap-2">
                  <Globe2 size={18} />
                  {profile.username}
                </span>
                {profile.locationLabel ? (
                  <span className="inline-flex items-center gap-2">
                    <MapPin size={18} />
                    {profile.locationLabel}
                  </span>
                ) : null}
              </div>

              <div className="mt-6 flex flex-wrap justify-center gap-3">
                {isOwnProfile ? (
                  <div className="inline-flex min-h-12 items-center gap-2 rounded-[22px] border border-slate-200 bg-white px-6 text-sm font-bold text-slate-600 shadow-sm">
                    Perfil público ativo
                  </div>
                ) : friendStatus === 'signed_out' ? (
                  <Link
                    href="/"
                    className="inline-flex min-h-12 items-center gap-3 rounded-full bg-brand-500 px-8 text-base font-bold text-white shadow-sm"
                  >
                    <UserPlus size={20} />
                    Entrar para adicionar
                  </Link>
                ) : friendStatus === 'accepted' ? (
                  <div className="inline-flex min-h-12 items-center gap-3 rounded-[22px] border border-emerald-100 bg-emerald-50 px-8 text-base font-bold text-emerald-700">
                    <UserCheck size={20} />
                    Conectado
                  </div>
                ) : friendStatus === 'pending_sent' ? (
                  <div className="inline-flex min-h-12 items-center gap-3 rounded-[22px] border border-slate-200 bg-slate-50 px-8 text-base font-bold text-slate-500">
                    <UserPlus size={20} />
                    Solicitado
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handleFriendAction()}
                    disabled={friendActionLoading}
                    className="inline-flex min-h-12 items-center gap-3 rounded-full bg-brand-500 px-8 text-base font-bold text-white opacity-90 shadow-sm"
                  >
                    {friendStatus === 'pending_received' ? <UserCheck size={20} /> : <UserPlus size={20} />}
                    {friendActionLoading ? 'Aguarde...' : friendStatus === 'pending_received' ? 'Aceitar conexão' : 'Adicionar'}
                  </button>
                )}
                {profile.stats.businessCount > 0 || profile.stats.eventCount > 0 ? (
                  <Link
                    href={`/profissional/${profile.username}`}
                    className="inline-flex min-h-12 items-center gap-3 rounded-[22px] border border-slate-200 bg-white px-8 text-base font-bold text-slate-700 shadow-sm"
                  >
                    <BadgeCheck size={20} />
                    Ver vitrine profissional
                  </Link>
                ) : null}
              </div>
            </div>

            <div className="mt-8 border-t border-slate-100 pt-5">
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative whitespace-nowrap px-4 py-3 text-base font-semibold transition ${
                      activeTab === tab.id ? 'text-brand-500' : 'text-muted-foreground'
                    }`}
                  >
                    {tab.label}
                    {activeTab === tab.id ? (
                      <span className="absolute inset-x-3 bottom-0 h-1 rounded-full bg-brand-500" />
                    ) : null}
                  </button>
                ))}
              </div>
            </div>

            {activeTab === 'about' ? (
              <section className="mt-6 rounded-[32px] border border-slate-100 bg-white p-5 shadow-sm">
                <h2 className="text-2xl font-bold text-slate-900">Sobre</h2>
                {profile.bio ? (
                  <p className="mt-4 text-base leading-7 text-slate-700">{profile.bio}</p>
                ) : null}
                <p className="mt-4 text-sm leading-7 text-slate-600">
                  Membro da comunidade desde {formatJoinedDate(profile.joinedAt)}. Hoje este perfil tem{' '}
                  {profile.stats.businessCount} negócio{profile.stats.businessCount === 1 ? '' : 's'} público{profile.stats.businessCount === 1 ? '' : 's'},{' '}
                  {profile.stats.eventCount} evento{profile.stats.eventCount === 1 ? '' : 's'} e{' '}
                  {profile.stats.postCount} publicaç{profile.stats.postCount === 1 ? 'ão' : 'ões'} visíve{profile.stats.postCount === 1 ? 'l' : 'is'} na comunidade.
                </p>

                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <ProfileMetric icon={<Users size={16} />} value={profile.stats.friendCount} label="Conexões" />
                  <ProfileMetric icon={<Images size={16} />} value={profile.stats.businessCount} label="Negócios" />
                  <ProfileMetric icon={<CalendarDays size={16} />} value={profile.stats.eventCount} label="Eventos" />
                  <ProfileMetric icon={<MessageSquareText size={16} />} value={profile.stats.postCount} label="Posts" />
                </div>
              </section>
            ) : null}

            {activeTab === 'friends' ? (
              <section className="mt-6 rounded-[32px] border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-2xl font-bold text-slate-900">Amigos</h2>
                  <span className="text-sm font-semibold text-slate-400">
                    {profile.friends.length} conexao{profile.friends.length === 1 ? '' : 'es'}
                  </span>
                </div>

                {profile.friends.length === 0 ? (
                  <EmptyPublicState text="Ainda nao ha conexoes publicas neste perfil." />
                ) : (
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {profile.friends.map((friend) => (
                      <Link
                        key={friend.id}
                        href={friend.publicPath || '/'}
                        className="flex items-center gap-4 rounded-[28px] border border-slate-100 bg-slate-50 p-4"
                      >
                        {friend.image ? (
                          <img src={friend.image || DEFAULT_AVATAR_URL} alt={friend.name} className="h-14 w-14 rounded-full object-cover" onError={handleAvatarError} />
                        ) : (
                          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-base font-bold text-brand-500">
                            {getInitials(friend.name)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-base font-bold text-slate-900">{friend.name}</p>
                          <p className="truncate text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                            @{friend.username}
                          </p>
                          {friend.locationLabel ? (
                            <p className="mt-1 truncate text-sm text-slate-500">{friend.locationLabel}</p>
                          ) : null}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </section>
            ) : null}

            {activeTab === 'groups' ? (
              <section className="mt-6 space-y-4">
                {isOwnProfile ? (
                  <div className="rounded-[32px] border border-slate-100 bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-md bg-brand-100 text-brand-500">
                        <Plus size={20} />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-slate-900">Criar grupo</h2>
                        <p className="text-sm text-slate-500">Organize pessoas por cidade, bairro ou interesse.</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setGroupModalOpen(true)}
                      className="theme-bg theme-shadow mt-5 w-full rounded-2xl px-4 py-3 text-sm font-bold"
                    >
                      Criar novo grupo
                    </button>
                    <Modal
                      open={groupModalOpen}
                      onClose={() => setGroupModalOpen(false)}
                      title="Criar grupo"
                      description="Organize pessoas por cidade, bairro ou interesse."
                    >
                    <div className="space-y-3">
                      <input
                        value={groupDraft.name}
                        onChange={(event) => setGroupDraft((current) => ({ ...current, name: event.target.value }))}
                        placeholder="Nome do grupo"
                        className="theme-outline-ring w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
                      />
                      <input
                        value={groupDraft.category}
                        onChange={(event) => setGroupDraft((current) => ({ ...current, category: event.target.value }))}
                        placeholder="Categoria, ex: Bairro, Musica, Cidade"
                        className="theme-outline-ring w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
                      />
                      <textarea
                        value={groupDraft.description}
                        onChange={(event) => setGroupDraft((current) => ({ ...current, description: event.target.value }))}
                        placeholder="Descricao curta"
                        rows={3}
                        className="theme-outline-ring w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
                      />
                      <RegionSelector
                        value={groupDraft.regionKey}
                        onChange={(region) => setGroupDraft((current) => ({ ...current, regionKey: region.key }))}
                        onClear={() => setGroupDraft((current) => ({ ...current, regionKey: '' }))}
                        allowEmpty
                        emptyLabel="Sem regiao especifica"
                        label="Regiao opcional"
                        hint="Use apenas quando o grupo for local."
                      />
                      <button
                        type="button"
                        onClick={() => void handleCreateGroup()}
                        disabled={creatingGroup || groupDraft.name.trim().length < 2}
                        className="theme-bg theme-shadow w-full rounded-2xl px-4 py-3 text-sm font-bold disabled:opacity-60"
                      >
                        {creatingGroup ? 'Criando...' : 'Criar grupo'}
                      </button>
                    </div>
                    </Modal>
                  </div>
                ) : null}

                <div className="rounded-[32px] border border-slate-100 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-2xl font-bold text-slate-900">Grupos</h2>
                    <span className="text-sm font-semibold text-slate-400">
                      {profile.groups.length} grupo{profile.groups.length === 1 ? '' : 's'}
                    </span>
                  </div>

                  {profile.groups.length === 0 ? (
                    <EmptyPublicState text="Ainda nao ha grupos publicos neste perfil." />
                  ) : (
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      {profile.groups.map((group) => (
                        <Link
                          key={group.id}
                          href={group.publicPath}
                          className="rounded-[28px] border border-slate-100 bg-slate-50 p-4"
                        >
                          <div className="flex items-center gap-3">
                            {group.imageUrl ? (
                              <img src={group.imageUrl} alt={group.name} className="h-14 w-14 rounded-2xl object-cover" />
                            ) : (
                              <div className="flex h-14 w-14 items-center justify-center rounded-md bg-brand-100 text-base font-bold text-brand-500">
                                {getInitials(group.name)}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="truncate text-base font-bold text-slate-900">{group.name}</p>
                              <p className="truncate text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                                {group.category || 'Comunidade'}
                              </p>
                            </div>
                          </div>
                          {group.description ? (
                            <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">{group.description}</p>
                          ) : null}
                          <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-slate-500">
                            {group.regionLabel ? <span className="rounded-full bg-white px-3 py-1">{group.regionLabel}</span> : null}
                            <span className="rounded-full bg-white px-3 py-1">
                              {group.memberCount} membro{group.memberCount === 1 ? '' : 's'}
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            ) : null}

            {activeTab === 'interests' ? (
              <section className="mt-6 rounded-[32px] border border-slate-100 bg-white p-5 shadow-sm">
                <h2 className="text-2xl font-bold text-slate-900">Interesses</h2>
                {interests.length === 0 ? (
                  <EmptyPublicState text="Ainda nao ha interesses publicos suficientes para este perfil." />
                ) : (
                  <div className="mt-5 flex flex-wrap gap-3">
                    {interests.map((interest) => (
                      <span
                        key={interest}
                        className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600"
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                )}
              </section>
            ) : null}

            {activeTab === 'photos' ? (
              <section className="mt-6 rounded-[32px] border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-2xl font-bold text-slate-900">Fotos</h2>
                  <span className="text-sm font-semibold text-slate-400">
                    {photoItems.length} imagem{photoItems.length === 1 ? '' : 'ns'}
                  </span>
                </div>

                {photoPreview.length === 0 ? (
                  <EmptyPublicState text="Nenhuma foto publica disponivel para este perfil." />
                ) : (
                  <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {photoPreview.map((photo, index) => {
                      const showOverflow = index === photoPreview.length - 1 && extraPhotos > 0;

                      return (
                        <div
                          key={`${photo}-${index}`}
                          className="relative overflow-hidden rounded-[24px] border border-slate-100 bg-slate-50 shadow-sm"
                        >
                          <img
                            src={photo}
                            alt={`${profile.name} - foto ${index + 1}`}
                            className="aspect-square w-full object-cover"
                          />
                          {showOverflow ? (
                            <div className="absolute inset-0 flex items-end justify-end bg-slate-950/20 p-3">
                              <span className="rounded-full bg-slate-950/55 px-3 py-1 text-xl font-bold text-white">
                                +{extraPhotos}
                              </span>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            ) : null}

            {activeTab === 'recommendations' ? (
              <section className="mt-6 space-y-4">
                {profile.businesses.length > 0 ? (
                  <div className="rounded-[32px] border border-slate-100 bg-white p-5 shadow-sm">
                    <h2 className="text-2xl font-bold text-slate-900">Negócios em destaque</h2>
                    <div className="mt-5 space-y-3">
                      {profile.businesses.slice(0, 3).map((business) => (
                        <Link
                          key={business.id}
                          href={`/negocios/${business.slug}`}
                          className="flex gap-4 rounded-[28px] border border-slate-100 bg-slate-50 p-4"
                        >
                          <img
                            src={business.imageUrl || `https://picsum.photos/seed/${business.id}/320`}
                            alt={business.name}
                            className="h-24 w-24 rounded-2xl object-cover"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-body-lg font-bold text-foreground">{business.name}</p>
                            <p className="mt-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                              {business.category}
                            </p>
                            {business.locationLabel ? (
                              <p className="mt-2 text-sm text-slate-500">{business.locationLabel}</p>
                            ) : null}
                            <div className="mt-3">
                              <StarRating average={business.ratingAverage} count={business.ratingCount} compact />
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : null}

                {profile.events.length > 0 ? (
                  <div className="rounded-[32px] border border-slate-100 bg-white p-5 shadow-sm">
                    <h2 className="text-2xl font-bold text-slate-900">Agenda recomendada</h2>
                    <div className="mt-5 space-y-3">
                      {profile.events.slice(0, 3).map((event) => (
                        <Link
                          key={event.id}
                          href={`/eventos/${event.slug}`}
                          className="flex gap-4 rounded-[28px] border border-slate-100 bg-slate-50 p-4"
                        >
                          <img
                            src={event.imageUrl || `https://picsum.photos/seed/${event.id}/320`}
                            alt={event.title}
                            className="h-24 w-24 rounded-2xl object-cover"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-body-lg font-bold text-foreground">{event.title}</p>
                            <p className="mt-1 text-sm text-slate-500">{formatEventDate(event.startsAt)}</p>
                            <p className="mt-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                              {event.venueName}
                            </p>
                            <div className="mt-3">
                              <StarRating average={event.ratingAverage} count={event.ratingCount} compact />
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : null}

                {profile.businesses.length === 0 && profile.events.length === 0 ? (
                  <EmptyPublicState text="Ainda nao ha negocios ou eventos suficientes para montar recomendacoes." />
                ) : null}
              </section>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

const ProfileMetric: React.FC<{ icon: React.ReactNode; value: number; label: string }> = ({
  icon,
  value,
  label,
}) => (
  <div className="rounded-[24px] border border-slate-100 bg-slate-50 p-4 text-center">
    <div className="mx-auto inline-flex h-10 w-10 items-center justify-center rounded-md bg-brand-100 text-brand-500">
      {icon}
    </div>
    <p className="mt-3 text-2xl font-bold text-slate-900">{value}</p>
    <p className="text-xs font-medium text-slate-500">{label}</p>
  </div>
);

const EmptyPublicState: React.FC<{ text: string }> = ({ text }) => (
  <div className="mt-5 rounded-[28px] border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center text-sm font-medium text-slate-500">
    {text}
  </div>
);

export default PublicProfile;

