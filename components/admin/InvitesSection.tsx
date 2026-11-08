'use client';

import { InfoTip } from '@/components/ui/InfoTip';
import React, { startTransition, useEffect, useState } from 'react';
import { Copy, Link2, Plus, Search, Ticket, Users } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';
import { Pagination } from '../ui/Pagination';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { useToast } from '../feedback/ToastProvider';

type InviteStatus = 'ACTIVE' | 'USED' | 'EXPIRED' | 'REVOKED';
type WaitlistStatus = 'PENDING' | 'INVITED' | 'ACTIVE';

type InviteRow = {
  id: string;
  status: InviteStatus;
  email: string | null;
  usageLimit: number;
  usedCount: number;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  createdBy: { id: string; name: string | null; email: string | null } | null;
  waitlistEntry: { id: string; email: string; name: string | null; status: WaitlistStatus } | null;
  _count: { usages: number };
};

type WaitlistRow = {
  id: string;
  email: string;
  name: string | null;
  country: string | null;
  status: WaitlistStatus;
  invitedAt: string | null;
  createdAt: string;
  invites: Array<{ id: string; status: InviteStatus; createdAt: string }>;
};

type InviteDetail = {
  id: string;
  status: InviteStatus;
  email: string | null;
  usageLimit: number;
  usedCount: number;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  createdBy: { id: string; name: string | null; email: string | null } | null;
  revokedBy: { id: string; name: string | null; email: string | null } | null;
  waitlistEntry: { id: string; email: string; name: string | null; status: WaitlistStatus } | null;
  usages: Array<{ id: string; createdAt: string; user: { id: string; name: string | null; email: string | null; username: string | null } }>;
};

const STATUS_TONE: Record<InviteStatus, 'success' | 'primary' | 'neutro' | 'erro'> = {
  ACTIVE: 'success',
  USED: 'neutro',
  EXPIRED: 'erro',
  REVOKED: 'erro',
};

const STATUS_LABEL: Record<InviteStatus, string> = {
  ACTIVE: 'Ativo',
  USED: 'Utilizado',
  EXPIRED: 'Expirado',
  REVOKED: 'Revogado',
};

const WAITLIST_LABEL: Record<WaitlistStatus, string> = {
  PENDING: 'Aguardando',
  INVITED: 'Convidado',
  ACTIVE: 'Cadastrado',
};

const formatDate = (iso: string | null) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
};

const PAGE_SIZE = 20;

const InvitesSection: React.FC = () => {
  const { showToast } = useToast();
  const [tab, setTab] = useState<'invites' | 'waitlist'>('invites');

  // Invites state
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [invitesTotal, setInvitesTotal] = useState(0);
  const [invitesPage, setInvitesPage] = useState(1);
  const [invitesSearch, setInvitesSearch] = useState('');
  const [invitesStatus, setInvitesStatus] = useState('');
  const [invitesLoading, setInvitesLoading] = useState(true);

  // Waitlist state
  const [waitlist, setWaitlist] = useState<WaitlistRow[]>([]);
  const [waitlistTotal, setWaitlistTotal] = useState(0);
  const [waitlistPage, setWaitlistPage] = useState(1);
  const [waitlistSearch, setWaitlistSearch] = useState('');
  const [waitlistStatus, setWaitlistStatus] = useState('');
  const [waitlistLoading, setWaitlistLoading] = useState(false);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ email: '', usageLimit: '1', expiresAt: '', waitlistEntryId: '' });
  const [creating, setCreating] = useState(false);
  const [createdCode, setCreatedCode] = useState<string | null>(null);

  // Detail modal
  const [detail, setDetail] = useState<InviteDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadInvites = async (page = invitesPage) => {
    setInvitesLoading(true);
    try {
      const params = new URLSearchParams();
      if (invitesSearch) params.set('q', invitesSearch);
      if (invitesStatus) params.set('status', invitesStatus);
      params.set('page', String(page));
      const response = await fetch(`/api/admin/invites?${params.toString()}`, { cache: 'no-store' });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? 'Erro ao carregar convites.');
      startTransition(() => {
        setInvites(payload.invites ?? []);
        setInvitesTotal(payload.total ?? 0);
      });
    } catch (error) {
      console.error('Failed to load invites:', error);
      setInvites([]);
    } finally {
      setInvitesLoading(false);
    }
  };

  const loadWaitlist = async (page = waitlistPage) => {
    setWaitlistLoading(true);
    try {
      const params = new URLSearchParams();
      if (waitlistSearch) params.set('q', waitlistSearch);
      if (waitlistStatus) params.set('status', waitlistStatus);
      params.set('page', String(page));
      const response = await fetch(`/api/admin/waitlist?${params.toString()}`, { cache: 'no-store' });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? 'Erro ao carregar lista de espera.');
      startTransition(() => {
        setWaitlist(payload.entries ?? []);
        setWaitlistTotal(payload.total ?? 0);
      });
    } catch (error) {
      console.error('Failed to load waitlist:', error);
      setWaitlist([]);
    } finally {
      setWaitlistLoading(false);
    }
  };

  useEffect(() => {
    void loadInvites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invitesPage, invitesSearch, invitesStatus]);

  useEffect(() => {
    if (tab === 'waitlist') void loadWaitlist();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, waitlistPage, waitlistSearch, waitlistStatus]);

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreating(true);
    setCreatedCode(null);
    try {
      const response = await fetch('/api/admin/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: createForm.email,
          usageLimit: Number(createForm.usageLimit) || 1,
          expiresAt: createForm.expiresAt ? new Date(createForm.expiresAt).toISOString() : null,
          waitlistEntryId: createForm.waitlistEntryId || null,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        showToast(payload?.error ?? 'Não foi possível gerar o convite.', 'error');
        return;
      }
      setCreatedCode(payload.invite.code);
      setCreateForm({ email: '', usageLimit: '1', expiresAt: '', waitlistEntryId: '' });
      void loadInvites(1);
    } catch (error) {
      console.error('Failed to create invite:', error);
      showToast('Não foi possível gerar o convite.', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/invites/${id}`, { method: 'POST' });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        showToast(payload?.error ?? 'Não foi possível revogar.', 'error');
        return;
      }
      showToast('Convite revogado.', 'success');
      void loadInvites(invitesPage);
    } catch {
      showToast('Não foi possível revogar.', 'error');
    }
  };

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    setDetail(null);
    try {
      const response = await fetch(`/api/admin/invites/${id}`, { cache: 'no-store' });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? 'Erro ao carregar detalhes.');
      setDetail(payload.invite);
    } catch (error) {
      console.error('Failed to load invite detail:', error);
      showToast('Não foi possível carregar os detalhes.', 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  const copyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(`${label} copiado.`, 'success');
    } catch {
      showToast('Não foi possível copiar.', 'error');
    }
  };

  const inviteLink = (code: string) =>
    `${typeof window !== 'undefined' ? window.location.origin : ''}/login?invite=${encodeURIComponent(code)}`;

  const invitesTotalPages = Math.max(1, Math.ceil(invitesTotal / PAGE_SIZE));
  const waitlistTotalPages = Math.max(1, Math.ceil(waitlistTotal / PAGE_SIZE));

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-5 sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-1.5 text-2xl font-extrabold tracking-tight text-[#132F40]">Convites<InfoTip text="Gerencie a lista de espera e o acesso ao Private Beta." /></h1>
        </div>
        <Button iconLeft={<Plus size={16} />} onClick={() => setShowCreate(true)}>
          Gerar convite
        </Button>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: 'invites', label: 'Convites', icon: <Ticket size={15} /> },
          { id: 'waitlist', label: 'Lista de espera', icon: <Users size={15} /> },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id as 'invites' | 'waitlist')}
            className={`inline-flex shrink-0 items-center gap-2 rounded-2xl border px-4 py-2 text-xs font-bold transition ${
              tab === item.id ? 'border-transparent bg-brand-500 text-white' : 'border-slate-100 bg-white text-slate-700 hover:bg-brand-50'
            }`}
          >
            {item.icon} {item.label}
          </button>
        ))}
      </div>

      {tab === 'invites' ? (
        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <input
                type="text"
                value={invitesSearch}
                onChange={(event) => {
                  setInvitesSearch(event.target.value);
                  setInvitesPage(1);
                }}
                placeholder="Buscar por email..."
                className="w-full rounded-2xl border border-slate-100 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm focus:border-brand-300 focus:outline-none"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            </div>
            <select
              value={invitesStatus}
              onChange={(event) => {
                setInvitesStatus(event.target.value);
                setInvitesPage(1);
              }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
            >
              <option value="">Todos os status</option>
              <option value="ACTIVE">Ativo</option>
              <option value="USED">Utilizado</option>
              <option value="EXPIRED">Expirado</option>
              <option value="REVOKED">Revogado</option>
            </select>
          </div>

          {invitesLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : invites.length === 0 ? (
            <EmptyState icon={<Ticket size={28} />} title="Nenhum convite encontrado" description="Gere um convite para liberar o acesso de novos usuários." />
          ) : (
            <div className="overflow-x-auto rounded-card bg-white shadow-sm">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Usos</th>
                    <th className="px-4 py-3">Criado em</th>
                    <th className="px-4 py-3">Expira</th>
                    <th className="px-4 py-3">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {invites.map((invite) => (
                    <tr key={invite.id} className="border-b border-slate-50 last:border-0">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800">{invite.email ?? 'Sem email vinculado'}</p>
                        {invite.waitlistEntry ? (
                          <p className="text-xs text-slate-400">Lista de espera: {invite.waitlistEntry.email}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={STATUS_TONE[invite.status]}>{STATUS_LABEL[invite.status]}</Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {invite.usedCount}/{invite.usageLimit}
                      </td>
                      <td className="px-4 py-3 text-slate-500">{formatDate(invite.createdAt)}</td>
                      <td className="px-4 py-3 text-slate-500">{formatDate(invite.expiresAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => void openDetail(invite.id)}
                            className="rounded-full px-2 py-1 text-xs font-bold text-brand-600 hover:bg-brand-50"
                          >
                            Detalhes
                          </button>
                          {invite.status === 'ACTIVE' ? (
                            <button
                              type="button"
                              onClick={() => void handleRevoke(invite.id)}
                              className="rounded-full px-2 py-1 text-xs font-bold text-red-600 hover:bg-red-50"
                            >
                              Revogar
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {invitesTotalPages > 1 ? (
            <div className="flex justify-center">
              <Pagination page={invitesPage} totalPages={invitesTotalPages} onChange={setInvitesPage} />
            </div>
          ) : null}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <input
                type="text"
                value={waitlistSearch}
                onChange={(event) => {
                  setWaitlistSearch(event.target.value);
                  setWaitlistPage(1);
                }}
                placeholder="Buscar por nome ou email..."
                className="w-full rounded-2xl border border-slate-100 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm focus:border-brand-300 focus:outline-none"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            </div>
            <select
              value={waitlistStatus}
              onChange={(event) => {
                setWaitlistStatus(event.target.value);
                setWaitlistPage(1);
              }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
            >
              <option value="">Todos</option>
              <option value="PENDING">Aguardando</option>
              <option value="INVITED">Convidado</option>
              <option value="ACTIVE">Cadastrado</option>
            </select>
          </div>

          {waitlistLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : waitlist.length === 0 ? (
            <EmptyState icon={<Users size={28} />} title="Nenhum interessado encontrado" description="A lista de espera está vazia para os filtros selecionados." />
          ) : (
            <div className="overflow-x-auto rounded-card bg-white shadow-sm">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                    <th className="px-4 py-3">Nome</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">País</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Data</th>
                    <th className="px-4 py-3">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {waitlist.map((entry) => (
                    <tr key={entry.id} className="border-b border-slate-50 last:border-0">
                      <td className="px-4 py-3 font-semibold text-slate-800">{entry.name ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{entry.email}</td>
                      <td className="px-4 py-3 text-slate-500">{entry.country ?? '—'}</td>
                      <td className="px-4 py-3">
                        <Badge tone={entry.status === 'ACTIVE' ? 'success' : entry.status === 'INVITED' ? 'primary' : 'neutro'}>
                          {WAITLIST_LABEL[entry.status]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{formatDate(entry.createdAt)}</td>
                      <td className="px-4 py-3">
                        {entry.status === 'PENDING' ? (
                          <button
                            type="button"
                            onClick={() => {
                              setCreateForm((current) => ({ ...current, email: entry.email, waitlistEntryId: entry.id }));
                              setShowCreate(true);
                            }}
                            className="rounded-full px-2 py-1 text-xs font-bold text-brand-600 hover:bg-brand-50"
                          >
                            Convidar
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">{entry.invites[0] ? 'Convite emitido' : '—'}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {waitlistTotalPages > 1 ? (
            <div className="flex justify-center">
              <Pagination page={waitlistPage} totalPages={waitlistTotalPages} onChange={setWaitlistPage} />
            </div>
          ) : null}
        </div>
      )}

      {/* Create modal */}
      <Modal
        open={showCreate}
        onClose={() => {
          setShowCreate(false);
          setCreatedCode(null);
        }}
        title={createdCode ? 'Convite gerado' : 'Gerar convite'}
        description={createdCode ? 'Copie o código agora. Ele não poderá ser recuperado depois.' : 'Defina os parâmetros do convite.'}
        footer={
          createdCode ? (
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowCreate(false)}>
                Fechar
              </Button>
              <Button iconLeft={<Copy size={15} />} onClick={() => void copyText(createdCode, 'Código')}>
                Copiar código
              </Button>
              <Button iconLeft={<Link2 size={15} />} onClick={() => void copyText(inviteLink(createdCode), 'Link')}>
                Copiar link
              </Button>
            </div>
          ) : (
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowCreate(false)}>
                Cancelar
              </Button>
              <Button type="submit" form="invite-create-form" loading={creating}>
                Gerar
              </Button>
            </div>
          )
        }
      >
        {createdCode ? (
          <div className="space-y-4">
            <div className="rounded-2xl border-2 border-dashed border-brand-300 bg-brand-50 p-6 text-center">
              <p className="text-2xl font-extrabold tracking-widest text-brand-700">{createdCode}</p>
            </div>
            <p className="text-center text-xs text-slate-400">
              Link: <span className="break-all text-slate-500">{inviteLink(createdCode)}</span>
            </p>
          </div>
        ) : (
          <form id="invite-create-form" onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">Email (opcional)</label>
              <Input
                type="email"
                value={createForm.email}
                onChange={(event) => setCreateForm((current) => ({ ...current, email: event.target.value }))}
                placeholder="email@exemplo.com"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-600">Limite de usos</label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={createForm.usageLimit}
                  onChange={(event) => setCreateForm((current) => ({ ...current, usageLimit: event.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-600">Expiração (opcional)</label>
                <Input
                  type="datetime-local"
                  value={createForm.expiresAt}
                  onChange={(event) => setCreateForm((current) => ({ ...current, expiresAt: event.target.value }))}
                />
              </div>
            </div>
          </form>
        )}
      </Modal>

      {/* Detail modal */}
      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title="Detalhes do convite"
        description="Histórico de utilização e informações do convite."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDetail(null)}>
              Fechar
            </Button>
            {detail?.status === 'ACTIVE' ? (
              <Button variant="destructive" onClick={() => void handleRevoke(detail.id)}>
                Revogar
              </Button>
            ) : null}
          </div>
        }
      >
        {detailLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
          </div>
        ) : detail ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-slate-400">Status</p>
                <Badge tone={STATUS_TONE[detail.status]}>{STATUS_LABEL[detail.status]}</Badge>
              </div>
              <div>
                <p className="text-xs text-slate-400">Usos</p>
                <p className="font-semibold text-slate-800">{detail.usedCount}/{detail.usageLimit}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Email</p>
                <p className="font-semibold text-slate-800">{detail.email ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Criado por</p>
                <p className="font-semibold text-slate-800">{detail.createdBy?.name ?? detail.createdBy?.email ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Criado em</p>
                <p className="font-semibold text-slate-800">{formatDate(detail.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Expira</p>
                <p className="font-semibold text-slate-800">{formatDate(detail.expiresAt)}</p>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Histórico de utilização</p>
              {detail.usages.length === 0 ? (
                <p className="text-sm text-slate-400">Nenhum uso registrado.</p>
              ) : (
                <ul className="space-y-2">
                  {detail.usages.map((usage) => (
                    <li key={usage.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm">
                      <span className="font-semibold text-slate-700">{usage.user.name ?? usage.user.email ?? 'Usuário'}</span>
                      <span className="text-xs text-slate-400">{formatDate(usage.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

export default InvitesSection;