import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, Flag, LogIn, LockKeyhole, MapPin, MoreHorizontal, Settings, ShieldCheck, Tag, Trash2, UserCheck, UsersRound } from 'lucide-react';
import { useToast } from '../components/feedback/ToastProvider';
import { Logo } from '../components/Layout';
import type { User } from '../types';
import { Modal } from '../components/ui/Modal';
import CloudinaryImageField from '../components/forms/CloudinaryImageField';
import RegionSelector from '../components/RegionSelector';
import GroupFeed from '../components/groups/GroupFeed';

type GroupMember = {
  id: string;
  role: string;
  status: string;
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
  coverImageUrl?: string | null;
  category?: string | null;
  regionKey?: string | null;
  regionLabel?: string | null;
  countryCode: string;
  isPublic: boolean;
  createdAt: string;
  memberCount: number;
  postCount: number;
  canViewContent: boolean;
  canManage: boolean;
  canManageAdmins: boolean;
  publicPath: string;
  viewerMembership?: {
    id: string;
    role: string;
    status: string;
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
  countryCode: 'US',
  isPublic: true,
  postCount: 0,
  canViewContent: true,
  canManage: false,
  canManageAdmins: false,
  viewerMembership: null,
  members: [],
};

const PROFILE_GRADIENT_CLASS = 'bg-brand-500';
const REPORT_REASONS = [
  ['MISINFORMATION', 'Disseminação de informações falsas'],
  ['VIOLENCE', 'Organização ou incentivo à violência'],
  ['HATE_SPEECH', 'Grupo de ódio ou discurso de ódio'],
  ['ILLEGAL_GOODS_SERVICES', 'Produtos ou serviços ilegais'],
  ['SEXUALLY_EXPLICIT', 'Conteúdo sexualmente explícito'],
  ['UNMODERATED', 'Administração não está moderando'],
  ['IMPERSONATION', 'Falsidade ideológica'],
] as const;

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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reporting, setReporting] = useState(false);
  const [moderatingMemberId, setModeratingMemberId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ name: '', description: '', category: '', imageUrl: '', coverImageUrl: '', regionKey: '', countryCode: 'US', isPublic: true });

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

  const openSettings = () => {
    setDraft({
      name: group.name,
      description: group.description || '',
      category: group.category || '',
      imageUrl: group.imageUrl || '',
      coverImageUrl: group.coverImageUrl || '',
      regionKey: group.regionKey || '',
      countryCode: group.countryCode || 'US',
      isPublic: group.isPublic,
    });
    setSettingsOpen(true);
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      const response = await fetch(`/api/groups/${encodeURIComponent(group.slug)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Não foi possível atualizar o grupo.');
      showToast(payload?.message || 'Grupo atualizado.', 'success');
      setSettingsOpen(false);
      setRefreshKey((current) => current + 1);
    } catch (settingsError) { showToast(settingsError instanceof Error ? settingsError.message : 'Não foi possível atualizar o grupo.', 'error'); }
    finally { setSavingSettings(false); }
  };

  const moderateMember = async (memberId: string, action: 'approve' | 'block' | 'remove' | 'promote' | 'demote') => {
    setModeratingMemberId(memberId);
    try {
      const response = await fetch(`/api/groups/${encodeURIComponent(group.slug)}/members/${memberId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Não foi possível moderar este membro.');
      showToast(payload?.message || 'Participação atualizada.', 'success');
      setRefreshKey((current) => current + 1);
    } catch (moderationError) { showToast(moderationError instanceof Error ? moderationError.message : 'Não foi possível moderar este membro.', 'error'); }
    finally { setModeratingMemberId(null); }
  };

  const reportGroup = async () => {
    if (!reportReason) return;
    setReporting(true);
    try {
      const response = await fetch(`/api/groups/${encodeURIComponent(group.slug)}/reports`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: reportReason }) });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Não foi possível enviar a denúncia.');
      setReportOpen(false);
      setReportReason('');
      showToast(payload.message || 'Denúncia enviada para moderação.', 'success');
    } catch (reportError) {
      showToast(reportError instanceof Error ? reportError.message : 'Não foi possível enviar a denúncia.', 'error');
    } finally {
      setReporting(false);
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

          <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
            <div className={`relative h-44 sm:h-56 ${group.coverImageUrl || group.imageUrl ? 'bg-slate-100' : PROFILE_GRADIENT_CLASS}`}>
              {group.coverImageUrl || group.imageUrl ? (
                <img src={group.coverImageUrl || group.imageUrl || ''} alt={`Capa de ${group.name}`} className="h-full w-full object-cover object-center" />
              ) : null}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 via-slate-950/10 to-transparent" />
              {viewer && !group.canManage ? <button type="button" onClick={() => setReportOpen(true)} className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-sm" aria-label="Mais opções"><MoreHorizontal size={20} /></button> : null}
              <div className="absolute bottom-5 left-5 right-5 text-white">
                <div className="mb-4 inline-flex h-16 w-16 items-center justify-center overflow-hidden rounded-card bg-surface text-xl font-bold text-brand-500">
                  {group.imageUrl ? <img src={group.imageUrl} alt={`Imagem de ${group.name}`} className="h-full w-full object-cover" /> : getInitials(group.name)}
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
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 backdrop-blur">
                    {group.isPublic ? <UsersRound size={14} /> : <LockKeyhole size={14} />}
                    {group.isPublic ? 'Público' : 'Restrito'}
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
                <div className="flex flex-wrap gap-3">
                  <button type="button" onClick={() => void handleMembership()} disabled={membershipLoading || group.viewerMembership?.role === 'OWNER' || group.viewerMembership?.status === 'BLOCKED'} className={`inline-flex min-h-12 items-center gap-3 rounded-[22px] px-8 text-base font-bold shadow-sm disabled:opacity-60 ${group.viewerMembership?.status === 'APPROVED' ? 'border border-emerald-100 bg-emerald-50 text-emerald-700' : group.viewerMembership?.status === 'PENDING' ? 'border border-amber-100 bg-amber-50 text-amber-700' : group.viewerMembership?.status === 'BLOCKED' ? 'border border-red-100 bg-red-50 text-red-700' : 'bg-brand-500 text-white'}`}>
                    <UserCheck size={20} />
                    {membershipLoading ? 'Aguarde...' : group.viewerMembership?.status === 'APPROVED' ? 'Participando' : group.viewerMembership?.status === 'PENDING' ? 'Solicitação pendente' : group.viewerMembership?.status === 'BLOCKED' ? 'Participação bloqueada' : 'Participar'}
                  </button>
                  {group.canManage ? <button type="button" onClick={openSettings} className="inline-flex min-h-12 items-center gap-2 rounded-[22px] border border-slate-200 bg-white px-6 text-sm font-bold text-slate-700"><Settings size={18} /> Configurações</button> : null}
                </div>
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

          {!group.canViewContent ? <section className="mt-5 rounded-[32px] border border-amber-100 bg-amber-50 p-6 text-center"><LockKeyhole className="mx-auto text-amber-600" /><h2 className="mt-3 text-xl font-bold text-amber-900">Conteúdo restrito</h2><p className="mt-2 text-sm text-amber-800">Sua solicitação precisa ser aprovada para acessar membros e publicações.</p></section> : null}

          {group.canViewContent ? <section className="mt-5 rounded-[32px] border border-slate-100 bg-white p-5 shadow-sm">
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
                  <div
                    key={member.id}
                    className="rounded-[28px] border border-slate-100 bg-slate-50 p-4"
                  >
                    <Link href={member.user.username ? `/${member.user.username}` : '/'} className="flex items-center gap-4">
                      {member.user.image ? (
                        <img src={member.user.image} alt={member.user.name || 'Membro'} className="h-14 w-14 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-base font-bold text-brand-500">{getInitials(member.user.name || 'Membro')}</div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2"><p className="truncate text-base font-bold text-slate-900">{member.user.name || 'Membro'}</p>{member.role !== 'MEMBER' ? <ShieldCheck size={15} className="text-brand-500" /> : null}</div>
                        <p className="truncate text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">@{member.user.username || 'perfil'} · {member.status === 'PENDING' ? 'Pendente' : member.role}</p>
                        {member.user.locationLabel ? <p className="mt-1 truncate text-sm text-slate-500">{member.user.locationLabel}</p> : null}
                      </div>
                    </Link>
                    {group.canManage && member.role !== 'OWNER' ? <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-200 pt-3">
                      {member.status === 'PENDING' ? <button type="button" disabled={moderatingMemberId === member.id} onClick={() => void moderateMember(member.id, 'approve')} className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-700"><Check size={13} /> Aprovar</button> : null}
                      {group.canManageAdmins && member.status === 'APPROVED' && member.role === 'MEMBER' ? <button type="button" disabled={moderatingMemberId === member.id} onClick={() => void moderateMember(member.id, 'promote')} className="rounded-full bg-brand-100 px-3 py-1.5 text-xs font-bold text-brand-700">Tornar admin</button> : null}
                      {group.canManageAdmins && member.status === 'APPROVED' && member.role === 'ADMIN' ? <button type="button" disabled={moderatingMemberId === member.id} onClick={() => void moderateMember(member.id, 'demote')} className="rounded-full bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700">Remover admin</button> : null}
                      <button type="button" disabled={moderatingMemberId === member.id} onClick={() => void moderateMember(member.id, 'block')} className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-800">Bloquear</button>
                      <button type="button" disabled={moderatingMemberId === member.id} onClick={() => void moderateMember(member.id, 'remove')} className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1.5 text-xs font-bold text-red-700"><Trash2 size={13} /> Remover</button>
                    </div> : null}
                  </div>
                ))}
              </div>
            )}
          </section> : null}

          {group.canViewContent ? <section className="mt-5 rounded-[32px] border border-slate-100 bg-white p-5 shadow-sm"><GroupFeed groupId={group.id} groupSlug={group.slug} user={viewer} canPost={Boolean(viewer && group.viewerMembership?.status === 'APPROVED')} /></section> : null}

          <Modal open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Configurações do grupo" description="Edite identidade, localização e acesso.">
            <div className="space-y-4">
              <label className="space-y-2"><span className="text-sm font-bold">Nome</span><input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} className="h-11 w-full rounded-full border-2 border-border px-4 text-sm" /></label>
              <label className="space-y-2"><span className="text-sm font-bold">Categoria</span><input value={draft.category} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))} className="h-11 w-full rounded-full border-2 border-border px-4 text-sm" /></label>
              <label className="space-y-2"><span className="text-sm font-bold">Descrição</span><textarea value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} rows={3} className="w-full rounded-2xl border-2 border-border px-4 py-3 text-sm" /></label>
              <div className="grid gap-4 sm:grid-cols-2"><div><p className="mb-2 text-sm font-bold">Avatar do grupo</p><CloudinaryImageField value={draft.imageUrl} onChange={(imageUrl) => setDraft((current) => ({ ...current, imageUrl }))} folder="groups" width="100%" height={160} /></div><div><p className="mb-2 text-sm font-bold">Imagem de capa</p><CloudinaryImageField value={draft.coverImageUrl} onChange={(coverImageUrl) => setDraft((current) => ({ ...current, coverImageUrl }))} folder="groups" width="100%" height={160} /></div></div>
              <RegionSelector value={draft.regionKey} onChange={(region) => setDraft((current) => ({ ...current, regionKey: region.key, countryCode: region.countryCode || current.countryCode }))} onClear={() => setDraft((current) => ({ ...current, regionKey: '' }))} allowEmpty emptyLabel="Sem região específica" label="Região" />
              <label className="space-y-2"><span className="text-sm font-bold">País de descoberta</span><select value={draft.countryCode} onChange={(event) => setDraft((current) => ({ ...current, countryCode: event.target.value }))} className="h-11 w-full rounded-full border-2 border-border px-4 text-sm"><option value="US">Estados Unidos</option><option value="BR">Brasil</option><option value="PT">Portugal</option><option value="CA">Canadá</option><option value="GB">Reino Unido</option><option value="IE">Irlanda</option></select></label>
              <label className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4"><input type="checkbox" checked={draft.isPublic} onChange={(event) => setDraft((current) => ({ ...current, isPublic: event.target.checked }))} className="mt-1" /><span><strong className="block text-sm">Grupo público</strong><span className="text-xs text-slate-500">Desmarque para exigir aprovação antes de acessar membros e mural.</span></span></label>
              <button type="button" disabled={savingSettings || draft.name.trim().length < 2} onClick={() => void saveSettings()} className="w-full rounded-full bg-brand-500 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{savingSettings ? 'Salvando...' : 'Salvar configurações'}</button>
            </div>
          </Modal>
          <Modal open={reportOpen} onClose={() => setReportOpen(false)} title="O que há de errado com este grupo?" description="Sua denúncia será analisada pela equipe de moderação.">
            <div className="space-y-2">{REPORT_REASONS.map(([value, label]) => <label key={value} className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${reportReason === value ? 'border-brand-500 bg-brand-50' : 'border-slate-200 hover:bg-slate-50'}`}><input type="radio" name="group-report-reason" value={value} checked={reportReason === value} onChange={() => setReportReason(value)} className="mt-1" /><span className="text-sm font-semibold text-slate-700">{label}</span></label>)}</div>
            <button type="button" disabled={!reportReason || reporting} onClick={() => void reportGroup()} className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-brand-500 px-5 text-sm font-bold text-white disabled:opacity-50"><Flag size={16} />{reporting ? 'Enviando...' : 'Enviar denúncia'}</button>
          </Modal>
        </div>
      </div>
    </div>
  );
};

export default PublicGroup;
