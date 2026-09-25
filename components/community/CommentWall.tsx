'use client';
import { useCallback, useEffect, useState } from 'react';
import { MessageCircle, MoreHorizontal } from 'lucide-react';
import PostCard from '@/components/community/PostCard';
import { useToast } from '@/components/feedback/ToastProvider';
import { DEFAULT_AVATAR_URL } from '@/lib/avatar';

type Comment = { id: string; content: string; isHidden?: boolean; createdAt: string; canEdit?: boolean; canDelete?: boolean; canHide?: boolean; author: { id: string; name?: string | null; username?: string | null; image?: string | null }; replies?: Comment[] };

export default function CommentWall({ endpoint, title = 'Conversa da comunidade' }: { endpoint: string; title?: string }) {
  const { showToast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [editing, setEditing] = useState<Comment | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch(endpoint, { signal });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error || 'Nao foi possivel carregar os comentarios.');
    setComments(Array.isArray(payload?.comments) ? payload.comments : []);
  }, [endpoint]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    load(controller.signal).catch((error) => {
      if ((error as Error).name !== 'AbortError') showToast((error as Error).message, 'error');
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [load, showToast]);

  const refresh = async () => { try { await load(); } catch (error) { showToast(error instanceof Error ? error.message : 'Erro ao atualizar comentarios.', 'error'); } };

  const submit = async () => {
    if (!content.trim() || saving) return;
    setSaving(true);
    try {
      const url = editing ? `${endpoint}/${editing.id}` : endpoint;
      const response = await fetch(url, { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editing ? { content: content.trim() } : { content: content.trim(), parentId: replyTo?.id }) });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Nao foi possivel salvar o comentario.');
      setContent('');
      setReplyTo(null);
      setEditing(null);
      await refresh();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Nao foi possivel comentar.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const runAction = async (comment: Comment, method: 'DELETE' | 'PATCH', action?: 'hide' | 'unhide') => {
    setMenuId(null);
    const response = await fetch(`${endpoint}/${comment.id}`, { method, headers: { 'Content-Type': 'application/json' }, body: method === 'PATCH' ? JSON.stringify({ action }) : undefined });
    const payload = await response.json().catch(() => null);
    if (!response.ok) return showToast(payload?.error || 'Nao foi possivel atualizar o comentario.', 'error');
    await refresh();
  };

  const Item = ({ comment, reply = false }: { comment: Comment; reply?: boolean }) => {
    const hasActions = comment.canEdit || comment.canDelete || comment.canHide;
    return <article className={reply ? 'ml-10 border-l-2 border-brand-100 pl-3' : ''}><PostCard.CommentItem authorImage={comment.author.image || DEFAULT_AVATAR_URL} authorName={comment.author.name || 'Membro da comunidade'} authorHref={comment.author.username ? `/${comment.author.username}` : undefined} content={<p className={`whitespace-pre-wrap text-[11px] leading-5 ${comment.isHidden ? 'italic text-slate-400' : 'text-slate-600'}`}>{comment.content}</p>} footer={<div className="mt-2 flex items-center gap-3 text-[11px] font-bold text-brand-600">{!reply && !comment.isHidden ? <button type="button" onClick={() => { setReplyTo(comment); setEditing(null); setContent(''); }}>Responder</button> : null}{hasActions ? <div className="relative"><button type="button" onClick={() => setMenuId(menuId === comment.id ? null : comment.id)} className="rounded-full p-1 text-slate-500 hover:bg-slate-100"><MoreHorizontal size={15} /></button>{menuId === comment.id ? <div className="absolute left-0 z-10 mt-1 w-32 rounded-xl border bg-white p-1 text-slate-700 shadow-lg">{comment.canEdit ? <button type="button" onClick={() => { setEditing(comment); setReplyTo(null); setContent(comment.content); setMenuId(null); }} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-slate-50">Editar</button> : null}{comment.canHide ? <button type="button" onClick={() => void runAction(comment, 'PATCH', comment.isHidden ? 'unhide' : 'hide')} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-slate-50">{comment.isHidden ? 'Reexibir' : 'Ocultar'}</button> : null}{comment.canDelete ? <button type="button" onClick={() => void runAction(comment, 'DELETE')} className="block w-full rounded-lg px-3 py-2 text-left text-red-600 hover:bg-red-50">Excluir</button> : null}</div> : null}</div> : null}</div>} />{comment.replies?.length ? <div className="mt-3 space-y-3">{comment.replies.map((item) => <Item key={item.id} comment={item} reply />)}</div> : null}</article>;
  };

  return <section className="border-t border-border pt-6"><div className="flex items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-h3 font-bold"><MessageCircle size={19} className="text-brand-500" /> {title}</h2><span className="text-xs font-semibold text-slate-400">{comments.reduce((total, item) => total + 1 + (item.replies?.length || 0), 0)}</span></div><div className="mt-4 rounded-[18px] border border-slate-100 bg-white p-4 shadow-sm">{replyTo || editing ? <div className="mb-3 flex items-center justify-between rounded-xl bg-brand-50 px-3 py-2 text-xs text-brand-700"><span>{editing ? 'Editando comentario' : <>Respondendo a <strong>{replyTo?.author.name || 'membro'}</strong></>}</span><button type="button" onClick={() => { setReplyTo(null); setEditing(null); setContent(''); }} className="font-bold">Cancelar</button></div> : null}<div className={saving ? 'pointer-events-none opacity-60' : ''}><PostCard.CommentComposer value={content} onChange={setContent} onSubmit={() => void submit()} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void submit(); } }} /></div></div><div className="mt-5 space-y-4">{loading ? <div className="h-20 animate-pulse rounded-2xl bg-slate-100" /> : comments.length ? comments.map((comment) => <Item key={comment.id} comment={comment} />) : <p className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">Seja a primeira pessoa a comentar.</p>}</div></section>;
}
