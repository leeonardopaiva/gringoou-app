'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRightLeft, Database, ShieldAlert } from 'lucide-react';
import { Button, Modal, Select } from '@/components/ui';
import { useToast } from '@/components/feedback/ToastProvider';

type UserSummary = { id: string; name: string | null; username: string | null; email: string | null };
type Impact = {
  confirmationValue: string;
  counts: Record<string, number>;
  cascadeEffects: Record<string, number>;
  detachedRelations: Record<string, number>;
  preservedAsAnonymous: Record<string, number>;
  ownedContentCount: number;
  requiresAdAccountTransfer: boolean;
  criticalAdAccounts: Array<{ id: string; name: string; activeCampaigns: number; reason: string }>;
  externalAssetUrls: string[];
};

const labels: Record<string, string> = {
  posts: 'Posts', comments: 'Comentarios', reactions: 'Reacoes', reports: 'Denuncias',
  businesses: 'Negocios', events: 'Eventos', jobs: 'Vagas', housing: 'Moradias', groups: 'Grupos',
  suggestions: 'Sugestoes', favorites: 'Favoritos', ratings: 'Avaliacoes', friendRequests: 'Conexoes',
  bannerRegistrations: 'Cadastros em banners', businessMemberships: 'Vinculos com negocios',
  groupMemberships: 'Vinculos com grupos', adAccountMemberships: 'Vinculos com Ads', authRecords: 'Registros de acesso',
};
const cascadeLabels: Record<string, string> = {
  businessMembers: 'Membros dos negocios', businessFavorites: 'Favoritos nos negocios',
  businessRatings: 'Avaliacoes dos negocios', eventFavorites: 'Favoritos nos eventos',
  eventRatings: 'Avaliacoes dos eventos', postComments: 'Comentarios nos posts',
  postReactions: 'Reacoes nos posts', postReports: 'Denuncias dos posts', groupMembers: 'Membros dos grupos',
};

export default function UserDeletionModal({ target, onClose, onDeleted }: {
  target: UserSummary;
  onClose: () => void;
  onDeleted: () => void | Promise<void>;
}) {
  const { showToast } = useToast();
  const [impact, setImpact] = useState<Impact | null>(null);
  const [transferCandidates, setTransferCandidates] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transferToUserId, setTransferToUserId] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [confirmation, setConfirmation] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    void fetch(`/api/admin/users/${target.id}`, { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error || 'Nao foi possivel analisar a exclusao.');
        setImpact(payload.impact);
        setTransferCandidates(Array.isArray(payload.transferCandidates) ? payload.transferCandidates : []);
      })
      .catch((loadError) => {
        if (loadError instanceof DOMException && loadError.name === 'AbortError') return;
        setError(loadError instanceof Error ? loadError.message : 'Nao foi possivel analisar a exclusao.');
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [target.id]);

  const affectedItems = useMemo(() => Object.entries(impact?.counts ?? {}).filter(([, count]) => count > 0), [impact]);
  const cascadeItems = useMemo(() => Object.entries(impact?.cascadeEffects ?? {}).filter(([, count]) => count > 0), [impact]);
  const detachedCount = Object.values(impact?.detachedRelations ?? {}).reduce((total, count) => total + count, 0);
  const anonymousCount = Object.values(impact?.preservedAsAnonymous ?? {}).reduce((total, count) => total + count, 0);
  const hasTransfer = Boolean(transferToUserId);
  const destructiveCascadeItems = hasTransfer ? cascadeItems.filter(([key]) => key.startsWith('post')) : cascadeItems;
  const effectiveDetachedCount = hasTransfer ? 0 : detachedCount;
  const confirmationMatches = confirmation === impact?.confirmationValue;
  const blockedByAds = Boolean(impact?.requiresAdAccountTransfer && !hasTransfer);
  const needsAcknowledgement = affectedItems.length > 0;
  const canDelete = Boolean(impact && confirmationMatches && !blockedByAds && (!needsAcknowledgement || acknowledged));

  const submit = async () => {
    if (!impact || !canDelete) return;
    setDeleting(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/users/${target.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmation,
          transferToUserId: transferToUserId || undefined,
          deleteOwnedContent: acknowledged,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Nao foi possivel excluir o usuario.');
      await onDeleted();
      showToast(hasTransfer ? 'Usuario excluido, propriedades transferidas e dados pessoais removidos.' : 'Usuario e dados vinculados excluidos.', 'success');
      onClose();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Nao foi possivel excluir o usuario.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal open onClose={deleting ? () => undefined : onClose} title="Exclusao segura de usuario" description={target.name || target.email || target.username || target.id} className="max-w-2xl">
      {loading ? <div className="space-y-3"><div className="h-24 animate-pulse rounded-2xl bg-slate-100" /><div className="h-32 animate-pulse rounded-2xl bg-slate-100" /></div> : null}
      {error ? <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div> : null}
      {impact ? <div className="space-y-5">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><div className="flex gap-3"><AlertTriangle className="mt-0.5 shrink-0 text-amber-600" size={20} /><div><p className="font-bold text-amber-900">Revise o impacto antes de continuar</p><p className="mt-1 text-sm text-amber-800">Sem transferencia, conteudos pertencentes ao usuario serao removidos pelo banco.</p></div></div></div>

        <section><p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Registros afetados</p>{affectedItems.length ? <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">{affectedItems.map(([key, count]) => <div key={key} className="rounded-xl bg-slate-50 px-3 py-2"><strong className="block text-lg text-slate-900">{count}</strong><span className="text-xs text-slate-500">{labels[key] || key}</span></div>)}</div> : <p className="mt-2 text-sm text-slate-500">Nenhum conteudo dependente encontrado.</p>}</section>

        {destructiveCascadeItems.length ? <section><p className="text-[11px] font-extrabold uppercase tracking-wider text-red-500">Impacto em dados de outras pessoas</p><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">{destructiveCascadeItems.map(([key, count]) => <div key={key} className="rounded-xl border border-red-100 bg-red-50 px-3 py-2"><strong className="block text-lg text-red-700">{count}</strong><span className="text-xs text-red-600">{cascadeLabels[key] || key}</span></div>)}</div></section> : null}

        {effectiveDetachedCount > 0 ? <p className="rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">{effectiveDetachedCount} evento(s) ou post(s) criados por terceiros permanecerao, mas perderao o vinculo com negocios que forem excluidos.</p> : null}

        {anonymousCount > 0 ? <div className="flex gap-3 rounded-2xl border border-sky-100 bg-sky-50 p-4"><Database size={19} className="shrink-0 text-sky-600" /><p className="text-sm text-sky-900"><strong>{anonymousCount} registros historicos</strong> de Analytics, impressoes, cobrancas ou campanhas serao preservados sem a identificacao do usuario.</p></div> : null}

        {impact.criticalAdAccounts.length ? <section className="rounded-2xl border border-red-200 bg-red-50 p-4"><div className="flex gap-3"><ShieldAlert size={20} className="shrink-0 text-red-600" /><div className="min-w-0"><p className="font-bold text-red-900">Transferencia obrigatoria para contas Ads</p><div className="mt-2 space-y-1 text-sm text-red-800">{impact.criticalAdAccounts.map((account) => <p key={account.id}>{account.name}: {account.reason}{account.activeCampaigns ? `, ${account.activeCampaigns} campanha(s) ativa(s)` : ''}.</p>)}</div></div></div></section> : null}

        <label className="block"><span className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700"><ArrowRightLeft size={17} />Transferir propriedades antes de excluir</span><Select value={transferToUserId} onChange={(event) => { setTransferToUserId(event.target.value); setAcknowledged(false); }}><option value="">Nao transferir</option>{transferCandidates.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name || candidate.email || candidate.username || candidate.id}</option>)}</Select><p className="mt-2 text-xs leading-5 text-slate-500">A transferencia preserva negocios, eventos, vagas, moradias, grupos e contas Ads criticas. Posts e interacoes pessoais nao sao atribuidos a outra pessoa.</p></label>

        {needsAcknowledgement ? <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-4"><input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} className="mt-1 h-4 w-4 accent-red-600" /><span className="text-sm text-slate-700"><strong className="block text-slate-900">Revisei e aceito a exclusao dos registros indicados</strong>Mesmo com transferencia, dados pessoais, posts e interacoes do usuario serao removidos. Interacoes de terceiros dentro de posts excluidos tambem podem ser afetadas.</span></label> : null}

        {impact.externalAssetUrls.length ? <p className="text-xs leading-5 text-slate-500">Atenção: {impact.externalAssetUrls.length} arquivo(s) externo(s) podem permanecer na Cloudinary. Eles nao serao removidos automaticamente sem uma credencial segura de exclusao.</p> : null}

        <label className="block"><span className="text-sm font-bold text-slate-700">Digite <code className="rounded bg-slate-100 px-1.5 py-0.5">{impact.confirmationValue}</code> para confirmar</span><input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100" /></label>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end"><Button variant="secondary" onClick={onClose} disabled={deleting}>Cancelar</Button><Button className="!bg-red-600 hover:!bg-red-700" onClick={() => void submit()} disabled={!canDelete} loading={deleting}>Excluir usuario</Button></div>
      </div> : null}
    </Modal>
  );
}
