'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, MessageSquareWarning, RefreshCcw, XCircle } from 'lucide-react';
import { useToast } from '@/components/feedback/ToastProvider';
import { Avatar, Skeleton } from '@/components/ui';

type Person = { id: string; name: string | null; username: string | null; image: string | null };
type Report = {
  id: string;
  reason: 'SPAM' | 'HARASSMENT' | 'SCAM' | 'INAPPROPRIATE' | 'OTHER';
  details: string | null;
  status: 'PENDING' | 'RESOLVED' | 'DISMISSED';
  createdAt: string;
  reporter: Person;
  reportedUser: Person;
  reviewedBy?: { name: string | null } | null;
  conversation: {
    item: { title: string } | null;
    messages: Array<{ id: string; senderId: string; content: string; createdAt: string }>;
  } | null;
};

const REASONS: Record<Report['reason'], string> = {
  SPAM: 'Spam ou propaganda',
  HARASSMENT: 'Assédio ou ofensas',
  SCAM: 'Golpe ou fraude',
  INAPPROPRIATE: 'Conteúdo impróprio',
  OTHER: 'Outro motivo',
};

const STATUS_LABEL: Record<Report['status'], string> = { PENDING: 'Pendente', RESOLVED: 'Resolvida', DISMISSED: 'Arquivada' };

const personName = (person: Person) => person.name || person.username || 'Membro';

/** Fila de denúncias de conversas (mensagens diretas e de anúncios) para a moderação. */
export default function MessageReportsSection() {
  const { showToast } = useToast();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/message-reports', { cache: 'no-store' });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Não foi possível carregar as denúncias.');
      setReports(payload.reports || []);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Não foi possível carregar as denúncias.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const review = async (id: string, status: 'RESOLVED' | 'DISMISSED') => {
    setUpdating(id);
    try {
      const response = await fetch(`/api/admin/message-reports/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Não foi possível atualizar a denúncia.');
      showToast(status === 'RESOLVED' ? 'Denúncia marcada como resolvida.' : 'Denúncia arquivada.', 'success');
      await load();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Não foi possível atualizar a denúncia.', 'error');
    } finally {
      setUpdating(null);
    }
  };

  return (
    <section className="mt-6 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <MessageSquareWarning size={19} className="text-brand-500" /> Denúncias de mensagens
          </h2>
          <p className="mt-1 text-sm text-slate-500">Quem denunciou, quem foi denunciado, o motivo e as últimas mensagens da conversa.</p>
        </div>
        <button type="button" onClick={() => void load()} aria-label="Atualizar" className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100">
          <RefreshCcw size={17} />
        </button>
      </div>

      {loading ? (
        <div className="mt-5 space-y-3" role="status" aria-label="Carregando denúncias de mensagens">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : reports.length === 0 ? (
        <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">Nenhuma denúncia de mensagem registrada.</div>
      ) : (
        <div className="mt-5 divide-y divide-slate-100">
          {reports.map((report) => {
            const open = expanded === report.id;
            return (
              <article key={report.id} className="py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-semibold text-slate-900">
                      {REASONS[report.reason]}
                      <span className={`ml-2 rounded-full px-2 py-0.5 text-[11px] font-bold ${report.status === 'PENDING' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                        {STATUS_LABEL[report.status]}
                      </span>
                    </p>
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                      <Avatar src={report.reporter.image} name={personName(report.reporter)} size="xs" />
                      {report.reporter.username ? (
                        <Link href={`/${report.reporter.username}`} className="font-semibold text-slate-700 hover:underline">{personName(report.reporter)}</Link>
                      ) : (
                        <span className="font-semibold text-slate-700">{personName(report.reporter)}</span>
                      )}
                      <span>denunciou</span>
                      <Avatar src={report.reportedUser.image} name={personName(report.reportedUser)} size="xs" />
                      {report.reportedUser.username ? (
                        <Link href={`/${report.reportedUser.username}`} className="font-semibold text-slate-700 hover:underline">{personName(report.reportedUser)}</Link>
                      ) : (
                        <span className="font-semibold text-slate-700">{personName(report.reportedUser)}</span>
                      )}
                      <span>· {new Date(report.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                    </p>
                    {report.details ? <p className="text-sm text-slate-600">“{report.details}”</p> : null}
                    {report.conversation?.item ? <p className="text-xs text-slate-400">Anúncio: {report.conversation.item.title}</p> : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {report.conversation ? (
                      <button type="button" onClick={() => setExpanded(open ? null : report.id)} className="rounded-full px-3 py-1.5 text-xs font-semibold text-brand-600 transition hover:bg-brand-50">
                        {open ? 'Ocultar mensagens' : 'Ver mensagens'}
                      </button>
                    ) : null}
                    {report.status === 'PENDING' ? (
                      <>
                        <button type="button" disabled={updating === report.id} onClick={() => void review(report.id, 'RESOLVED')} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50">
                          <CheckCircle2 size={14} /> Resolver
                        </button>
                        <button type="button" disabled={updating === report.id} onClick={() => void review(report.id, 'DISMISSED')} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-200 disabled:opacity-50">
                          <XCircle size={14} /> Arquivar
                        </button>
                      </>
                    ) : report.reviewedBy?.name ? (
                      <span className="text-xs text-slate-400">por {report.reviewedBy.name}</span>
                    ) : null}
                  </div>
                </div>

                {open && report.conversation ? (
                  <ul className="mt-3 space-y-1.5 rounded-2xl bg-slate-50 p-3">
                    {[...report.conversation.messages].reverse().map((message) => (
                      <li key={message.id} className="text-sm text-slate-700">
                        <span className="font-semibold text-slate-900">
                          {message.senderId === report.reportedUser.id ? personName(report.reportedUser) : personName(report.reporter)}:
                        </span>{' '}
                        {message.content}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
