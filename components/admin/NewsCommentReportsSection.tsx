'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { MessageSquareWarning, RefreshCcw } from 'lucide-react';
import { useToast } from '@/components/feedback/ToastProvider';
import { Avatar, Skeleton } from '@/components/ui';

type Person = { id: string; name: string | null; username: string | null; image?: string | null };
type ReportedComment = {
  id: string;
  content: string;
  isHidden: boolean;
  createdAt: string;
  author: Person;
  article: { id: string; title: string; path: string };
  reportCount: number;
  reporters: Person[];
};

const personName = (person: Person) => person.name || person.username || 'Membro';

/** Fila de comentários de notícias denunciados pela comunidade. */
export default function NewsCommentReportsSection() {
  const { showToast } = useToast();
  const [comments, setComments] = useState<ReportedComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/news-comment-reports', { cache: 'no-store' });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Não foi possível carregar as denúncias.');
      setComments(payload.comments || []);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Não foi possível carregar as denúncias.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const decide = async (id: string, action: 'hide' | 'dismiss' | 'delete') => {
    setBusy(id);
    try {
      const response = await fetch(`/api/admin/news-comment-reports/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Não foi possível concluir a ação.');
      showToast(action === 'delete' ? 'Comentário excluído.' : action === 'hide' ? 'Comentário oculto.' : 'Denúncia descartada.', 'success');
      await load();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Não foi possível concluir a ação.', 'error');
    } finally {
      setBusy(null);
    }
  };

  const buttonClass = 'rounded-full px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50';

  return (
    <section className="mt-6 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <MessageSquareWarning size={19} className="text-brand-500" /> Comentários denunciados
        </h2>
        <button type="button" onClick={() => void load()} aria-label="Atualizar" className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100">
          <RefreshCcw size={17} />
        </button>
      </div>

      {loading ? (
        <div className="mt-5 space-y-3" role="status" aria-label="Carregando comentários denunciados">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : comments.length === 0 ? (
        <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">Nenhum comentário denunciado.</div>
      ) : (
        <div className="mt-5 divide-y divide-slate-100">
          {comments.map((comment) => (
            <article key={comment.id} className="space-y-2 py-4">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                <Avatar src={comment.author.image} name={personName(comment.author)} size="xs" />
                {comment.author.username ? (
                  <Link href={`/${comment.author.username}`} className="font-semibold text-slate-700 hover:underline">{personName(comment.author)}</Link>
                ) : (
                  <span className="font-semibold text-slate-700">{personName(comment.author)}</span>
                )}
                <span>em</span>
                <Link href={comment.article.path} className="max-w-[16rem] truncate font-semibold text-brand-600 hover:underline">{comment.article.title}</Link>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${comment.isHidden ? 'bg-slate-100 text-slate-500' : 'bg-amber-50 text-amber-700'}`}>
                  {comment.isHidden ? 'Oculto' : 'Visível'}
                </span>
                <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-600">
                  {comment.reportCount} {comment.reportCount === 1 ? 'denúncia' : 'denúncias'}
                </span>
              </div>
              <p className="text-sm text-slate-800">“{comment.content}”</p>
              <p className="text-xs text-slate-400">Denunciado por {comment.reporters.map(personName).join(', ')}</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={busy === comment.id} onClick={() => void decide(comment.id, 'dismiss')} className={`${buttonClass} bg-emerald-50 text-emerald-700 hover:bg-emerald-100`}>
                  Descartar denúncia
                </button>
                {!comment.isHidden ? (
                  <button type="button" disabled={busy === comment.id} onClick={() => void decide(comment.id, 'hide')} className={`${buttonClass} bg-slate-100 text-slate-600 hover:bg-slate-200`}>
                    Ocultar
                  </button>
                ) : null}
                <button type="button" disabled={busy === comment.id} onClick={() => void decide(comment.id, 'delete')} className={`${buttonClass} bg-red-50 text-red-600 hover:bg-red-100`}>
                  Excluir comentário
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
