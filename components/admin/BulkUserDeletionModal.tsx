'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, ArrowRightLeft, CheckCircle2, ShieldAlert, XCircle } from 'lucide-react';
import { Button, Modal, Select } from '@/components/ui';
import { AckCheckbox } from '@/components/admin/AckCheckbox';
import { useLanguage } from '@/components/i18n/LanguageProvider';
import { getUserErrorMessage, sanitizeUserMessage } from '@/lib/user-error';

type Candidate = { id: string; name: string | null; username: string | null; email: string | null };
type Impact = { id: string; label: string; email: string | null; role: string; records: number; requiresAdAccountTransfer: boolean };
type Result = { id: string; label: string; ok: boolean; error?: string };

/**
 * Excluir vários usuários de uma vez. Mostra o que cada um tem de vinculado, deixa escolher UMA pessoa
 * para receber os negócios, eventos, grupos e contas Ads de todos, e pede a confirmação "EXCLUIR N".
 */
export default function BulkUserDeletionModal({ userIds, onClose, onDone }: { userIds: string[]; onClose: () => void; onDone: () => void | Promise<void> }) {
  const { tx } = useLanguage();
  const [impacts, setImpacts] = useState<Impact[] | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [transferToUserId, setTransferToUserId] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Result[] | null>(null);

  const post = async (body: Record<string, unknown>) => {
    const response = await fetch('/api/admin/users/bulk-delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userIds, ...body }) });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(sanitizeUserMessage(payload?.error, 'Não foi possível concluir a exclusão.'));
    return payload;
  };

  useEffect(() => {
    let cancelled = false;
    post({ dryRun: true })
      .then((payload) => {
        if (cancelled) return;
        setImpacts(payload.impacts ?? []);
        setCandidates(payload.transferCandidates ?? []);
      })
      .catch((loadError) => {
        if (!cancelled) setError(getUserErrorMessage(loadError, 'Não foi possível analisar a exclusão.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const total = impacts?.length ?? userIds.length;
  const withRecords = (impacts ?? []).filter((item) => item.records > 0).length;
  const needsAdsTransfer = (impacts ?? []).some((item) => item.requiresAdAccountTransfer);
  const phrase = `EXCLUIR ${total}`;
  const blockedByAds = needsAdsTransfer && !transferToUserId;
  const canDelete = Boolean(impacts) && confirmation.trim() === phrase && !blockedByAds && (withRecords === 0 || acknowledged);

  const submit = async () => {
    if (!canDelete || deleting) return;
    setDeleting(true);
    setError(null);
    try {
      const payload = await post({ confirmation: confirmation.trim(), transferToUserId: transferToUserId || undefined, deleteOwnedContent: acknowledged });
      setResults(payload.results ?? []);
      await onDone();
    } catch (deleteError) {
      setError(getUserErrorMessage(deleteError, 'Não foi possível excluir os usuários.'));
    } finally {
      setDeleting(false);
    }
  };

  const close = () => (deleting ? undefined : onClose());

  if (results) {
    const failed = results.filter((item) => !item.ok);
    return (
      <Modal open onClose={close} title={tx('Exclusão concluída')} description={`${results.length - failed.length} ${tx('de')} ${results.length} ${tx('usuários excluídos')}`} className="max-w-xl">
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
            <CheckCircle2 size={20} className="shrink-0" /> {results.length - failed.length} {tx('usuários excluídos')}
          </div>
          {failed.length ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              <p className="mb-2 flex items-center gap-2 font-bold"><XCircle size={18} /> {failed.length} {tx('não foram excluídos')}</p>
              <ul className="space-y-1">
                {failed.map((item) => <li key={item.id}><strong>{item.label}</strong>: {tx(item.error ?? 'Não foi possível excluir este usuário.')}</li>)}
              </ul>
            </div>
          ) : null}
          <div className="flex justify-end"><Button onClick={onClose}>{tx('Fechar')}</Button></div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open onClose={close} title={tx('Excluir usuários selecionados')} description={`${total} ${total === 1 ? tx('usuário') : tx('usuários')}`} className="max-w-2xl">
      {loading ? <div className="space-y-3"><div className="h-24 animate-pulse rounded-2xl bg-slate-100" /><div className="h-24 animate-pulse rounded-2xl bg-slate-100" /></div> : null}
      {error ? <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div> : null}
      {impacts ? (
        <div className="space-y-5">
          <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <AlertTriangle className="mt-0.5 shrink-0 text-amber-600" size={20} />
            <p className="text-sm text-amber-800">{tx('Esta ação não pode ser desfeita. Dados pessoais, posts e interações desses usuários serão removidos.')}</p>
          </div>

          <div className="max-h-56 overflow-y-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr><th className="px-3 py-2">{tx('Usuário')}</th><th className="px-3 py-2">{tx('Papel')}</th><th className="px-3 py-2 text-right">{tx('Registros')}</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {impacts.map((item) => (
                  <tr key={item.id}>
                    <td className="px-3 py-2"><p className="font-semibold text-slate-800">{item.label}</p>{item.email ? <p className="text-xs text-slate-500">{item.email}</p> : null}</td>
                    <td className="px-3 py-2 text-xs font-bold text-slate-500">{item.role}</td>
                    <td className="px-3 py-2 text-right">
                      <span className="font-bold text-slate-800">{item.records}</span>
                      {item.requiresAdAccountTransfer ? <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-extrabold uppercase text-red-700">Ads</span> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {needsAdsTransfer ? (
            <div className="flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
              <ShieldAlert size={20} className="shrink-0 text-red-600" />
              <p className="text-sm text-red-900"><strong>{tx('Transferência obrigatória:')}</strong> {tx('há conta Ads que ficaria sem responsável. Escolha quem vai receber.')}</p>
            </div>
          ) : null}

          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700"><ArrowRightLeft size={17} />{tx('Transferir negócios, eventos, grupos e contas Ads para')}</span>
            <Select value={transferToUserId} onChange={(event) => setTransferToUserId(event.target.value)}>
              <option value="">{tx('Não transferir (excluir os vínculos)')}</option>
              {candidates.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name || candidate.email || candidate.username}{candidate.username ? ` (@${candidate.username})` : ''}</option>)}
            </Select>
          </label>

          {withRecords > 0 ? (
            <AckCheckbox
              checked={acknowledged}
              onChange={setAcknowledged}
              title={tx('Revisei e aceito a exclusão dos registros indicados')}
              description={tx('Mesmo com transferência, dados pessoais, posts e interações serão removidos.')}
            />
          ) : null}

          <label className="block">
            <span className="text-sm font-bold text-slate-700">{tx('Digite')} <code className="rounded bg-slate-100 px-1.5 py-0.5">{phrase}</code> {tx('para confirmar')}</span>
            <input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" className="mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-surface px-4 text-sm focus:border-red-400 focus:outline-none" />
          </label>

          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={onClose} disabled={deleting}>{tx('Cancelar')}</Button>
            <Button className="!bg-red-600 hover:!bg-red-700" onClick={() => void submit()} disabled={!canDelete} loading={deleting}>
              {tx('Excluir')} {total} {total === 1 ? tx('usuário') : tx('usuários')}
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
