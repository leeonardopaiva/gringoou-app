import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Ban, Check, ChevronDown, Flag, LogIn, LockKeyhole, MapPin, MoreHorizontal, Settings, ShieldCheck, Tag, Trash2, UserCheck, UserCog, UsersRound } from 'lucide-react';
import { useToast } from '../components/feedback/ToastProvider';
import { Logo } from '../components/Layout';
import type { User } from '../types';
import { Modal } from '../components/ui/Modal';
import { Dropdown } from '../components/ui/Dropdown';
import CloudinaryImageField from '../components/forms/CloudinaryImageField';
import RegionSelector from '../components/RegionSelector';
import GroupFeed from '../components/groups/GroupFeed';
import { notifyContentUpdated } from '../lib/content-refresh';

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
    verified?: boolean;
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
  const [membersOpen, setMembersOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<GroupMember | null>(null);
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
      notifyContentUpdated();
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
      setSelectedMember(null);
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
  const approvedMembers = group.members.filter((member) => member.status === 'APPROVED');
  const previewMembers = approvedMembers.slice(0, 3);

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

          <section className="overflow-hidden rounded-[28px] bg-white shadow-sm">
            <div className={`relative h-52 sm:h-60 ${group.coverImageUrl || group.imageUrl ? 'bg-slate-100' : PROFILE_GRADIENT_CLASS}`}>
              {group.coverImageUrl || group.imageUrl ? (
                <img src={group.coverImageUrl || group.imageUrl || ''} alt={`Capa de ${group.name}`} className="h-full w-full object-cover object-center" />
              ) : null}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/20 to-transparent" />
              {viewer ? <div className="absolute right-4 top-4 z-30"><Dropdown
                align="right"
                trigger={<span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition hover:bg-white/25" aria-label="Mais opções"><MoreHorizontal size={18} /></span>}
                sections={[{ items: group.canManage
                  ? [{ label: 'Configurações do grupo', icon: <Settings size={16} />, onClick: openSettings }]
                  : [{ label: 'Denunciar grupo', icon: <Flag size={16} />, onClick: () => setReportOpen(true), destructive: true }]
                }]}
              /></div> : null}
              <div className="absolute bottom-4 left-4 right-4 flex items-end gap-3 text-white">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-white/80 bg-surface text-lg font-bold text-brand-500 shadow-sm">
                  {group.imageUrl ? <img src={group.imageUrl} alt={`Imagem de ${group.name}`} className="h-full w-full object-cover object-top" /> : getInitials(group.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="truncate text-xl font-bold leading-tight sm:text-2xl">{group.name}</h1>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
                    {group.category ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-black/30 px-2 py-0.5">
                        <Tag size={10} />
                        {group.category}
                      </span>
                    ) : null}
                    {group.regionLabel ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-black/30 px-2 py-0.5">
                        <MapPin size={10} />
                        {group.regionLabel}
                      </span>
                    ) : null}
                    <span className="inline-flex items-center gap-1 rounded-full bg-black/30 px-2 py-0.5">
                      <UsersRound size={10} />
                      {group.memberCount} membro{group.memberCount === 1 ? '' : 's'}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-black/30 px-2 py-0.5">
                      {group.isPublic ? <UsersRound size={10} /> : <LockKeyhole size={10} />}
                      {group.isPublic ? 'Público' : 'Restrito'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4 p-4 sm:p-5">
              {group.description ? (
                <p className="text-sm leading-6 text-slate-600">{group.description}</p>
              ) : (
                <p className="text-sm leading-6 text-slate-500">Grupo publico da comunidade Gringoou.</p>
              )}

              {viewer ? (
                <button type="button" onClick={() => void handleMembership()} disabled={membershipLoading || group.viewerMembership?.role === 'OWNER' || group.viewerMembership?.status === 'BLOCKED'} className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full px-6 text-sm font-bold disabled:opacity-60 ${group.viewerMembership?.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700' : group.viewerMembership?.status === 'PENDING' ? 'bg-amber-50 text-amber-700' : group.viewerMembership?.status === 'BLOCKED' ? 'bg-red-50 text-red-700' : 'bg-brand-500 text-white'}`}>
                  <UserCheck size={17} />
                  {membershipLoading ? 'Aguarde...' : group.viewerMembership?.status === 'APPROVED' ? 'Participando' : group.viewerMembership?.status === 'PENDING' ? 'Solicitação pendente' : group.viewerMembership?.status === 'BLOCKED' ? 'Participação bloqueada' : 'Participar'}
                  {group.viewerMembership?.status === 'APPROVED' ? <ChevronDown size={15} /> : null}
                </button>
              ) : (
                <Link
                  href="/"
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-brand-500 px-6 text-sm font-bold text-white"
                >
                  <LogIn size={17} />
                  Entrar para participar
                </Link>
              )}
            </div>
          </section>

          {group.canViewContent ? (
            <div className="mt-4 flex items-center gap-5 border-b border-slate-100 px-1">
              <span className="relative pb-3 text-sm font-bold text-brand-500">
                Mural
                <span aria-hidden className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-brand-500" />
              </span>
              <button type="button" onClick={() => setMembersOpen(true)} className="pb-3 text-sm font-semibold text-slate-400 transition hover:text-slate-600">
                Membros · {group.memberCount}
              </button>
            </div>
          ) : null}

          {!group.canViewContent ? <section className="mt-5 rounded-[32px] border border-amber-100 bg-amber-50 p-6 text-center"><LockKeyhole className="mx-auto text-amber-600" /><h2 className="mt-3 text-xl font-bold text-amber-900">Conteúdo restrito</h2><p className="mt-2 text-sm text-amber-800">Sua solicitação precisa ser aprovada para acessar membros e publicações.</p></section> : null}

          {group.canViewContent ? (
            <div className="mt-4 px-1">
              {previewMembers.length ? (
                <div className="mb-4 flex items-center justify-between gap-4">
                  <p className="text-xs font-semibold text-slate-500">Quem participa</p>
                  <div className="flex items-center -space-x-2">
                    {previewMembers.map((member) => (
                      <Link key={member.id} href={member.user.username ? `/${member.user.username}` : '/'} className="relative z-10 block first:z-30 [&:nth-child(2)]:z-20">
                        {member.user.image ? <img src={member.user.image} alt={member.user.name || 'Membro'} className="h-8 w-8 rounded-full border-2 border-white object-cover object-top" /> : <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-brand-100 text-[10px] font-bold text-brand-600">{getInitials(member.user.name || 'Membro')}</span>}
                      </Link>
                    ))}
                    <button type="button" onClick={() => setMembersOpen(true)} className="relative z-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-slate-500" aria-label="Ver todos os membros"><MoreHorizontal size={15} /></button>
                  </div>
                </div>
              ) : null}
              <GroupFeed groupId={group.id} groupSlug={group.slug} user={viewer} canPost={Boolean(viewer && group.viewerMembership?.status === 'APPROVED')} />
            </div>
          ) : null}

          <Modal open={membersOpen} onClose={() => setMembersOpen(false)} title="Membros do grupo" description={`${group.memberCount} pessoa${group.memberCount === 1 ? '' : 's'} participando.`} className="max-w-lg">
            <div className="divide-y divide-slate-100">
              {group.members.map((member) => <div key={member.id} className="flex items-center gap-3 py-3">
                <Link href={member.user.username ? `/${member.user.username}` : '/'} onClick={() => setMembersOpen(false)} className="flex min-w-0 flex-1 items-center gap-3">
                  {member.user.image ? <img src={member.user.image} alt={member.user.name || 'Membro'} className="h-11 w-11 shrink-0 rounded-full object-cover object-top" /> : <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-600">{getInitials(member.user.name || 'Membro')}</span>}
                  <span className="min-w-0"><span className="flex flex-wrap items-center gap-1.5"><strong className="truncate text-sm text-slate-900">{member.user.name || 'Membro'}</strong>{member.user.verified ? <ShieldCheck size={15} className="shrink-0 fill-brand-500 text-white" aria-label="Perfil verificado" /> : null}{member.role === 'OWNER' || member.role === 'ADMIN' ? <span className="rounded-full bg-red-50 px-2 py-0.5 text-[9px] font-bold text-red-700">Admin</span> : member.role === 'MODERATOR' ? <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[9px] font-bold text-orange-700">Moderador</span> : null}</span><span className="mt-0.5 block truncate text-xs text-slate-500">{member.user.locationLabel || group.regionLabel || 'Região não informada'}</span></span>
                </Link>
                {member.status === 'PENDING' ? <span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700">Pendente</span> : null}
                {group.canManage && member.role !== 'OWNER' ? <button type="button" onClick={() => setSelectedMember(member)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100" aria-label={`Ações para ${member.user.name || 'membro'}`}><MoreHorizontal size={19} /></button> : null}
              </div>)}
              {group.members.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">Ainda não há membros visíveis neste grupo.</p> : null}
            </div>
          </Modal>

          <Modal open={Boolean(selectedMember)} onClose={() => setSelectedMember(null)} title="Gerenciar membro" description={selectedMember?.user.name || 'Membro do grupo'} className="max-w-sm">
            {selectedMember ? <div className="space-y-2">
              {selectedMember.status === 'PENDING' ? <button type="button" disabled={moderatingMemberId === selectedMember.id} onClick={() => void moderateMember(selectedMember.id, 'approve')} className="flex min-h-11 w-full items-center gap-3 rounded-2xl px-4 text-left text-sm font-bold text-emerald-700 transition hover:bg-emerald-50"><Check size={17} /> Aprovar participação</button> : null}
              {group.canManageAdmins && selectedMember.status === 'APPROVED' && selectedMember.role === 'MEMBER' ? <button type="button" disabled={moderatingMemberId === selectedMember.id} onClick={() => void moderateMember(selectedMember.id, 'promote')} className="flex min-h-11 w-full items-center gap-3 rounded-2xl px-4 text-left text-sm font-bold text-brand-700 transition hover:bg-brand-50"><UserCog size={17} /> Tornar administrador</button> : null}
              {group.canManageAdmins && selectedMember.status === 'APPROVED' && selectedMember.role === 'ADMIN' ? <button type="button" disabled={moderatingMemberId === selectedMember.id} onClick={() => void moderateMember(selectedMember.id, 'demote')} className="flex min-h-11 w-full items-center gap-3 rounded-2xl px-4 text-left text-sm font-bold text-slate-700 transition hover:bg-slate-100"><UserCog size={17} /> Remover permissão de administrador</button> : null}
              <button type="button" disabled={moderatingMemberId === selectedMember.id} onClick={() => void moderateMember(selectedMember.id, 'block')} className="flex min-h-11 w-full items-center gap-3 rounded-2xl px-4 text-left text-sm font-bold text-amber-700 transition hover:bg-amber-50"><Ban size={17} /> Bloquear membro</button>
              <button type="button" disabled={moderatingMemberId === selectedMember.id} onClick={() => void moderateMember(selectedMember.id, 'remove')} className="flex min-h-11 w-full items-center gap-3 rounded-2xl px-4 text-left text-sm font-bold text-red-700 transition hover:bg-red-50"><Trash2 size={17} /> Remover do grupo</button>
            </div> : null}
          </Modal>

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
