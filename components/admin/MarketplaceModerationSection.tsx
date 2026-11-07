'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, RefreshCcw, ShoppingBag, XCircle } from 'lucide-react';
import { useToast } from '@/components/feedback/ToastProvider';
import { Badge, Button, Skeleton } from '@/components/ui';
import type {
  MarketplaceModerationDecision,
  MarketplaceModerationItem,
} from '@/domain/marketplace/entities/marketplace.entity';

type QueueStatus = 'PENDING_REVIEW' | 'ACTIVE' | 'REJECTED' | 'REMOVED';

const TABS: { status: QueueStatus; label: string }[] = [
  { status: 'PENDING_REVIEW', label: 'Pendentes' },
  { status: 'ACTIVE', label: 'Publicados' },
  { status: 'REJECTED', label: 'Rejeitados' },
  { status: 'REMOVED', label: 'Removidos' },
];

const DECISION_LABELS: Record<MarketplaceModerationDecision, string> = {
  APPROVE: 'Aprovado',
  REJECT: 'Rejeitado',
  REMOVE: 'Removido',
};

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));

const formatPrice = (item: MarketplaceModerationItem) =>
  item.isFree ? 'Grátis' : item.priceCents != null ? `R$ ${(item.priceCents / 100).toFixed(2).replace('.', ',')}` : 'Sem preço';

/** Fila de moderação de anúncios do Marketplace (MODERATOR/ADMIN; autorização validada na API). */
export default function MarketplaceModerationSection() {
  const { showToast } = useToast();
  const [status, setStatus] = useState<QueueStatus>('PENDING_REVIEW');
  const [items, setItems] = useState<MarketplaceModerationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reasonFor, setReasonFor] = useState<{ id: string; decision: 'REJECT' | 'REMOVE' } | null>(null);
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/marketplace/moderation?status=${status}`, { cache: 'no-store' });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Não foi possível carregar os anúncios.');
      setItems(payload.items ?? []);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Não foi possível carregar os anúncios.', 'error');
    } finally {
      setLoading(false);
    }
  }, [status, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const decide = async (id: string, decision: MarketplaceModerationDecision, decisionReason: string | null) => {
    setBusyId(id);
    try {
      const response = await fetch(`/api/marketplace/${id}/moderate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, reason: decisionReason }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Não foi possível registrar a decisão.');
      setReasonFor(null);
      setReason('');
      showToast(`Anúncio ${DECISION_LABELS[decision].toLowerCase()}.`, 'success');
      await load();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Não foi possível registrar a decisão.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <ShoppingBag size={19} className="text-brand-500" /> Anúncios do Marketplace
          </h2>
          <p className="mt-1 text-sm text-slate-500">Aprove, rejeite (com motivo) ou remova anúncios.</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
          aria-label="Atualizar anúncios"
        >
          <RefreshCcw size={17} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Status dos anúncios">
        {TABS.map((tab) => (
          <button
            key={tab.status}
            type="button"
            role="tab"
            aria-selected={status === tab.status}
            onClick={() => setStatus(tab.status)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
              status === tab.status ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="mt-5 space-y-3" role="status" aria-label="Carregando anúncios"><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /></div>
      ) : items.length === 0 ? (
        <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
          Nenhum anúncio nesta lista.
        </div>
      ) : (
        <div className="mt-5 divide-y divide-slate-100">
          {items.map((item) => {
            const askingReason = reasonFor?.id === item.id;
            const busy = busyId === item.id;
            return (
              <article key={item.id} className="grid gap-3 py-4 sm:grid-cols-[96px_1fr]">
                <div className="h-24 w-24 overflow-hidden rounded-xl bg-slate-100">
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-300">
                      <ShoppingBag size={28} />
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={item.publicPath} className="truncate font-bold text-slate-900 hover:text-brand-600">
                      {item.title}
                    </Link>
                    <Badge tone="neutro">{item.category}</Badge>
                  </div>
                  <p className="mt-0.5 text-sm font-semibold text-slate-700">{formatPrice(item)}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {item.sellerName ?? 'Usuário'}
                    {item.sellerUsername ? ` · @${item.sellerUsername}` : ''} · {item.locationLabel} ·{' '}
                    {formatDate(item.createdAt)}
                  </p>
                  <p className="mt-1.5 line-clamp-2 text-sm text-slate-600">{item.description}</p>

                  {item.moderationReason ? (
                    <p className="mt-1.5 text-xs font-medium text-red-700">Motivo: {item.moderationReason}</p>
                  ) : null}

                  {item.logs.length > 0 ? (
                    <details className="mt-2 text-xs text-slate-500">
                      <summary className="cursor-pointer font-semibold">Histórico ({item.logs.length})</summary>
                      <ul className="mt-1 space-y-1">
                        {item.logs.map((log) => (
                          <li key={log.id}>
                            {formatDate(log.createdAt)} — {DECISION_LABELS[log.decision]} por{' '}
                            {log.moderatorName ?? 'moderador'}
                            {log.reason ? ` (${log.reason})` : ''}
                          </li>
                        ))}
                      </ul>
                    </details>
                  ) : null}

                  {askingReason ? (
                    <div className="mt-3 space-y-2">
                      <label className="block text-xs font-semibold text-slate-600" htmlFor={`reason-${item.id}`}>
                        Motivo {reasonFor?.decision === 'REJECT' ? 'da rejeição' : 'da remoção'} (mín. 5 caracteres)
                      </label>
                      <textarea
                        id={`reason-${item.id}`}
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                        maxLength={1000}
                        rows={3}
                        className="w-full rounded-xl border border-slate-200 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          loading={busy}
                          disabled={reason.trim().length < 5}
                          onClick={() => void decide(item.id, reasonFor!.decision, reason.trim())}
                        >
                          Confirmar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setReasonFor(null);
                            setReason('');
                          }}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {item.status === 'PENDING_REVIEW' ? (
                        <Button
                          size="sm"
                          loading={busy}
                          iconLeft={<CheckCircle2 size={15} />}
                          onClick={() => void decide(item.id, 'APPROVE', null)}
                        >
                          Aprovar
                        </Button>
                      ) : null}
                      {item.status === 'PENDING_REVIEW' || item.status === 'ACTIVE' ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={busy}
                          iconLeft={<XCircle size={15} />}
                          onClick={() => setReasonFor({ id: item.id, decision: 'REJECT' })}
                        >
                          Rejeitar
                        </Button>
                      ) : null}
                      {item.status !== 'REMOVED' ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy}
                          onClick={() => setReasonFor({ id: item.id, decision: 'REMOVE' })}
                        >
                          Remover
                        </Button>
                      ) : null}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
