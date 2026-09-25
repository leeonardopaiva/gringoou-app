'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MessageCircle, Reply, Send } from 'lucide-react';
import { useToast } from '@/components/feedback/ToastProvider';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';
import { DEFAULT_AVATAR_URL } from '@/lib/avatar';

type Comment = {
  id: string;
  content: string;
  createdAt: string;
  author: { id: string; name?: string | null; username?: string | null; image?: string | null };
  replies?: Comment[];
};

export default function CommentWall({ endpoint, title = 'Conversa da comunidade' }: { endpoint: string; title?: string }) {
  const { showToast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void fetch(endpoint, { signal: controller.signal }).then(async (response) => {
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Não foi possível carregar os comentários.');
      setComments(Array.isArray(payload?.comments) ? payload.comments : []);
    }).catch((error) => { if ((error as Error).name !== 'AbortError') showToast((error as Error).message, 'error'); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [endpoint, showToast]);

  const submit = async () => {
    if (!content.trim()) return;
    setSaving(true);
    try {
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: content.trim(), parentId: replyTo?.id }) });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Não foi possível publicar o comentário.');
      if (replyTo) setComments((current) => current.map((comment) => comment.id === replyTo.id ? { ...comment, replies: [...(comment.replies || []), payload.comment] } : comment));
      else setComments((current) => [...current, { ...payload.comment, replies: [] }]);
      setContent(''); setReplyTo(null);
    } catch (error) { showToast(error instanceof Error ? error.message : 'Não foi possível comentar.', 'error'); }
    finally { setSaving(false); }
  };

  const Item = ({ comment, reply = false }: { comment: Comment; reply?: boolean }) => (
    <article className={reply ? 'ml-9 border-l-2 border-brand-100 pl-3' : ''}>
      <div className="flex items-start gap-3">
        <img src={comment.author.image || DEFAULT_AVATAR_URL} alt={comment.author.name || 'Membro'} className="h-9 w-9 shrink-0 rounded-full object-cover" />
        <div className="min-w-0 flex-1 rounded-2xl bg-slate-50 px-4 py-3">
          {comment.author.username ? <Link href={`/${comment.author.username}`} className="text-xs font-bold text-foreground hover:text-brand-600">{comment.author.name || `@${comment.author.username}`}</Link> : <p className="text-xs font-bold">{comment.author.name || 'Membro da comunidade'}</p>}
          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-600">{comment.content}</p>
        </div>
      </div>
      {!reply ? <button type="button" onClick={() => { setReplyTo(comment); setContent(''); }} className="ml-12 mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-brand-600"><Reply size={12} /> Responder</button> : null}
      {comment.replies?.length ? <div className="mt-3 space-y-3">{comment.replies.map((item) => <Item key={item.id} comment={item} reply />)}</div> : null}
    </article>
  );

  return <section className="border-t border-border pt-6">
    <div className="flex items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-h3 font-bold"><MessageCircle size={19} className="text-brand-500" /> {title}</h2><span className="text-xs font-semibold text-slate-400">{comments.reduce((total, item) => total + 1 + (item.replies?.length || 0), 0)}</span></div>
    <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-4">
      {replyTo ? <div className="mb-2 flex items-center justify-between rounded-xl bg-brand-50 px-3 py-2 text-xs text-brand-700"><span>Respondendo a <strong>{replyTo.author.name || 'membro'}</strong></span><button type="button" onClick={() => setReplyTo(null)} className="font-bold">Cancelar</button></div> : null}
      <Textarea value={content} onChange={(event) => setContent(event.target.value)} maxLength={600} placeholder={replyTo ? 'Escreva uma resposta…' : 'Participe da conversa…'} />
      <div className="mt-3 flex justify-end"><Button size="sm" iconLeft={<Send size={15} />} loading={saving} disabled={!content.trim()} onClick={() => void submit()}>Publicar</Button></div>
    </div>
    <div className="mt-5 space-y-4">{loading ? <div className="h-20 animate-pulse rounded-2xl bg-slate-100" /> : comments.length ? comments.map((comment) => <Item key={comment.id} comment={comment} />) : <p className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">Seja a primeira pessoa a comentar.</p>}</div>
  </section>;
}
