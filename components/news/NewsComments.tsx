'use client';

import { MentionInput } from '@/components/community/MentionInput';
import { MentionText } from '@/components/community/MentionText';
import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, MessageCircle, Send } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { useToast } from '@/components/feedback/ToastProvider';
import { formatRelativeTime } from '@/components/marketplace/MarketplaceCard';

type NewsComment = {
  id: string;
  content: string;
  isHidden: boolean;
  createdAt: string;
  author: { id: string; name: string | null; username: string | null; image: string | null };
  canDelete: boolean;
  canHide: boolean;
  canReport: boolean;
};

type NewsCommentsProps = {
  articleId: string;
  /** Total de comentários já conhecido (evita piscar o contador antes de carregar). */
  initialCount?: number;
  /** Mostra todos os comentários desde o início (página da notícia). */
  expanded?: boolean;
};

const PREVIEW_LIMIT = 1;

/**
 * Comentários da notícia. Na lista mostra só o mais recente, com "Ver todos os comentários";
 * na página da notícia já abre completo.
 */
export function NewsComments({ articleId, initialCount = 0, expanded = false }: NewsCommentsProps) {
  const { showToast } = useToast();
  const [open, setOpen] = useState(expanded);
  const [comments, setComments] = useState<NewsComment[]>([]);
  const [total, setTotal] = useState(initialCount);
  const [loading, setLoading] = useState(expanded || initialCount > 0);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(
    async (all: boolean) => {
      try {
        const response = await fetch(`/api/news/${articleId}/comments${all ? '' : `?limit=${PREVIEW_LIMIT}`}`, { cache: 'no-store' });
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error ?? 'Não foi possível carregar os comentários.');
        setComments(payload.comments ?? []);
        setTotal(payload.total ?? 0);
      } catch (error) {
        showToast(error instanceof Error ? error.message : 'Não foi possível carregar os comentários.', 'error');
      } finally {
        setLoading(false);
      }
    },
    [articleId, showToast],
  );

  useEffect(() => {
    if (!expanded && initialCount === 0) return;
    void load(expanded);
  }, [expanded, initialCount, load]);

  const openAll = async () => {
    setOpen(true);
    setLoading(true);
    await load(true);
  };

  const submit = async () => {
    const content = draft.trim();
    if (content.length < 2 || sending) return;
    setSending(true);
    try {
      const response = await fetch(`/api/news/${articleId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? 'Não foi possível comentar agora.');
      setDraft('');
      setTotal((count) => count + 1);
      // Na prévia, o comentário novo passa a ser o único exibido; aberto, entra no fim da lista.
      setComments((current) => (open ? [...current, payload.comment] : [payload.comment]));
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Não foi possível comentar agora.', 'error');
    } finally {
      setSending(false);
    }
  };

  const remove = async (comment: NewsComment) => {
    const response = await fetch(`/api/news/${articleId}/comments/${comment.id}`, { method: 'DELETE' });
    if (!response.ok) {
      showToast('Não foi possível excluir o comentário.', 'error');
      return;
    }
    setComments((current) => current.filter((item) => item.id !== comment.id));
    setTotal((count) => Math.max(0, count - 1));
  };

  const toggleHidden = async (comment: NewsComment) => {
    const response = await fetch(`/api/news/${articleId}/comments/${comment.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: comment.isHidden ? 'unhide' : 'hide' }),
    });
    if (!response.ok) {
      showToast('Não foi possível atualizar o comentário.', 'error');
      return;
    }
    setComments((current) => current.map((item) => (item.id === comment.id ? { ...item, isHidden: !item.isHidden } : item)));
  };

  const report = async (comment: NewsComment) => {
    const response = await fetch(`/api/news/${articleId}/comments/${comment.id}/report`, { method: 'POST' });
    const payload = await response.json().catch(() => null);
    showToast(payload?.message ?? payload?.error ?? 'Não foi possível denunciar agora.', response.ok ? 'success' : 'error');
  };

  const remaining = Math.max(0, total - comments.length);
  const actionClass = 'font-semibold text-slate-400 transition hover:text-slate-600';

  return (
    <div className="border-t border-slate-100 pt-3">
      {!open && total > PREVIEW_LIMIT ? (
        <button type="button" onClick={() => void openAll()} className="mb-2 text-xs font-semibold text-slate-500 transition hover:text-brand-600">
          Ver todos os {total} comentários
        </button>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-3" role="status" aria-label="Carregando comentários">
          <Loader2 size={16} className="animate-spin text-slate-400" aria-hidden />
        </div>
      ) : (
        <ul className="space-y-3">
          {comments.map((comment) => {
            const name = comment.author.name || comment.author.username || 'Membro da comunidade';
            return (
              <li key={comment.id} className="flex items-start gap-2.5">
                <Avatar src={comment.author.image} name={name} size="xs" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-5">
                    {comment.author.username ? (
                      <Link href={`/${comment.author.username}`} className="font-semibold text-slate-900 hover:underline">
                        {name}
                      </Link>
                    ) : (
                      <span className="font-semibold text-slate-900">{name}</span>
                    )}{' '}
                    <span className={comment.isHidden ? 'italic text-slate-400' : 'text-slate-700'}><MentionText text={comment.content} /></span>
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[11px] text-slate-400">
                    <span>{formatRelativeTime(comment.createdAt)}</span>
                    {comment.isHidden ? <span className="font-semibold text-amber-600">Oculto</span> : null}
                    {comment.canHide ? (
                      <button type="button" onClick={() => void toggleHidden(comment)} className={actionClass}>
                        {comment.isHidden ? 'Reexibir' : 'Ocultar'}
                      </button>
                    ) : null}
                    {comment.canDelete ? (
                      <button type="button" onClick={() => void remove(comment)} className={actionClass}>
                        Excluir
                      </button>
                    ) : null}
                    {comment.canReport ? (
                      <button type="button" onClick={() => void report(comment)} className={actionClass}>
                        Denunciar
                      </button>
                    ) : null}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {open && remaining > 0 ? (
        <p className="mt-2 text-xs text-slate-400">Mostrando os {comments.length} comentários mais recentes.</p>
      ) : null}

      <form
        className="mt-3 flex items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <MessageCircle size={16} className="shrink-0 text-slate-400" aria-hidden />
        <MentionInput value={draft} onChange={setDraft} maxLength={500} placeholder="Escreva um comentário (use @ para marcar)" ariaLabel="Escreva um comentário" className="w-full rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-brand-400" />
        <button
          type="submit"
          disabled={draft.trim().length < 2 || sending}
          aria-label="Enviar comentário"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white transition hover:brightness-105 disabled:opacity-40"
        >
          {sending ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Send size={16} aria-hidden />}
        </button>
      </form>
    </div>
  );
}

export default NewsComments;
