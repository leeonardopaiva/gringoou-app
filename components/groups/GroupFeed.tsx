'use client';

import React, { useCallback, useEffect, useState } from 'react';
import CommunityComposer from '@/components/community/CommunityComposer';
import FeedPostCard from '@/components/community/FeedPostCard';
import type { ComposerMode } from '@/components/community/utils';
import { isYoutubeUrl } from '@/components/community/utils';
import { useToast } from '@/components/feedback/ToastProvider';
import { normalizeUrlFieldValue } from '@/lib/forms/validation';
import type { Post, User } from '@/types';
import { DEFAULT_AVATAR_URL } from '@/lib/avatar';

type GroupFeedProps = { groupId: string; groupSlug: string; user?: User | null; canPost: boolean };

export default function GroupFeed({ groupId, groupSlug, user, canPost }: GroupFeedProps) {
  const { showToast } = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [nextOffset, setNextOffset] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [mode, setMode] = useState<ComposerMode>('text');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [externalUrl, setExternalUrl] = useState('');

  const loadPosts = useCallback(async (offset = 0, append = false) => {
    append ? setLoadingMore(true) : setLoading(true);
    try {
      const response = await fetch(`/api/community/posts?groupId=${encodeURIComponent(groupId)}&limit=10&offset=${offset}`, { cache: 'no-store' });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Não foi possível carregar o mural.');
      setPosts((current) => append ? [...current, ...(payload.posts || [])] : payload.posts || []);
      setHasMore(Boolean(payload.hasMore));
      setNextOffset(Number(payload.nextOffset || 0));
    } catch (error) { showToast(error instanceof Error ? error.message : 'Não foi possível carregar o mural.', 'error'); }
    finally { setLoading(false); setLoadingMore(false); }
  }, [groupId, showToast]);
  useEffect(() => { void loadPosts(); }, [loadPosts]);

  const resetComposer = () => { setMode('text'); setContent(''); setImageUrl(''); setExternalUrl(''); };
  const changeMode = (nextMode: ComposerMode) => {
    setMode(nextMode);
    if (nextMode === 'photo' || nextMode === 'text') setExternalUrl('');
    if (nextMode === 'link' || nextMode === 'video' || nextMode === 'text') setImageUrl('');
  };
  const publish = async () => {
    const image = normalizeUrlFieldValue(imageUrl);
    const link = normalizeUrlFieldValue(externalUrl);
    if (mode === 'photo' && !image) return showToast('Adicione uma imagem.', 'error');
    if ((mode === 'link' || mode === 'video') && !link) return showToast('Informe o link da publicação.', 'error');
    if (mode === 'video' && link && !isYoutubeUrl(link)) return showToast('Use um link do YouTube.', 'error');
    const normalizedContent = content.trim() || (image ? 'Compartilhando uma imagem com o grupo.' : link ? 'Compartilhando um link com o grupo.' : '');
    if (!normalizedContent) return showToast('Escreva algo antes de publicar.', 'error');
    setPublishing(true);
    try {
      const response = await fetch('/api/community/posts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: normalizedContent, imageUrl: image, externalUrl: link, personaMode: 'personal', groupId }) });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Não foi possível publicar.');
      resetComposer();
      await loadPosts();
      showToast(payload?.message || 'Publicação criada.', 'success');
    } catch (error) { showToast(error instanceof Error ? error.message : 'Não foi possível publicar.', 'error'); }
    finally { setPublishing(false); }
  };
  const request = async (url: string, init?: RequestInit) => {
    const response = await fetch(url, init);
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error || 'Não foi possível concluir a ação.');
    return payload;
  };
  const toggleLike = async (postId: string) => {
    try {
      const payload = await request(`/api/community/posts/${postId}/reactions`, { method: 'POST' });
      setPosts((current) => current.map((post) => post.id === postId ? { ...post, viewerHasLiked: Boolean(payload.liked), likeCount: Number(payload.likeCount), likedBy: payload.likedBy || [] } : post));
    } catch (error) { showToast(error instanceof Error ? error.message : 'Não foi possível curtir.', 'error'); }
  };
  const refreshAction = async (url: string, init?: RequestInit) => { const payload = await request(url, init); await loadPosts(); if (payload?.message) showToast(payload.message, 'success'); };
  const share = async (post: Post) => {
    const url = `${window.location.origin}/grupos/${groupSlug}?post=${post.id}`;
    if (navigator.share) { try { await navigator.share({ title: 'Publicação em grupo na Gringoou', text: post.content, url }); return; } catch { /* use clipboard */ } }
    await navigator.clipboard.writeText(url); showToast('Link copiado.', 'success');
  };

  return <section className="space-y-4">
    <div className="flex items-center justify-between"><div><h2 className="text-2xl font-bold text-slate-900">Mural do grupo</h2><p className="text-sm text-slate-500">Publicações exclusivas desta comunidade.</p></div><span className="text-xs font-semibold text-slate-400">{posts.length} exibidas</span></div>
    {canPost && user ? <div className={publishing ? 'pointer-events-none opacity-70' : ''}><CommunityComposer.Root><CommunityComposer.Editor avatar={user.avatar} avatarHref={user.username ? `/${user.username}` : undefined} value={content} onChange={setContent} placeholder="Compartilhe algo com o grupo..." /><CommunityComposer.MediaField mode={mode} imageUrl={imageUrl} externalUrl={externalUrl} onImageChange={setImageUrl} onExternalChange={setExternalUrl} /><CommunityComposer.Actions mode={mode} onModeChange={changeMode} onPublish={() => void publish()} /></CommunityComposer.Root></div> : <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">Participe do grupo para publicar, comentar e reagir.</div>}
    {loading ? <div className="h-40 animate-pulse rounded-3xl bg-slate-100" /> : null}
    {!loading && posts.length === 0 ? <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Ainda não há publicações neste grupo.</div> : null}
    {posts.map((post) => canPost && user ? <FeedPostCard key={post.id} post={post} onToggleLike={() => void toggleLike(post.id)} onAddComment={(text, parentId) => refreshAction(`/api/community/posts/${post.id}/comments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: text, parentId }) })} onUpdatePost={(nextContent, nextImage, nextExternal) => refreshAction(`/api/community/posts/${post.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: nextContent, imageUrl: normalizeUrlFieldValue(nextImage), externalUrl: normalizeUrlFieldValue(nextExternal), personaMode: 'personal', groupId }) })} onDeletePost={() => refreshAction(`/api/community/posts/${post.id}`, { method: 'DELETE' })} onUpdateComment={(commentId, text) => refreshAction(`/api/community/posts/${post.id}/comments/${commentId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: text }) })} onDeleteComment={(commentId) => refreshAction(`/api/community/posts/${post.id}/comments/${commentId}`, { method: 'DELETE' })} onSharePost={() => void share(post)} /> : <article key={post.id} className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm"><div className="flex items-center gap-3"><img src={post.author.image || user?.avatar || DEFAULT_AVATAR_URL} alt={post.author.name} className="h-11 w-11 rounded-full object-cover" /><div><p className="font-bold">{post.author.name}</p><p className="text-xs text-slate-400">{new Date(post.createdAt).toLocaleString('pt-BR')}</p></div></div><p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700">{post.content}</p>{post.imageUrl ? <img src={post.imageUrl} alt="Imagem da publicação" className="mt-4 max-h-[560px] w-full rounded-2xl object-cover" /> : null}</article>)}
    {hasMore ? <button type="button" disabled={loadingMore} onClick={() => void loadPosts(nextOffset, true)} className="w-full rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-bold disabled:opacity-50">{loadingMore ? 'Carregando...' : 'Carregar mais'}</button> : null}
  </section>;
}
