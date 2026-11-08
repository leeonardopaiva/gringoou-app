'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Heart, ImageIcon, MessageCircle, Newspaper, Plus } from 'lucide-react';
import type { Post } from '@/types';

type BusinessPostsPanelProps = {
  businessId: string;
  businessName: string;
  management?: boolean;
};

const statusLabel = (status?: Post['status']) => {
  if (status === 'PENDING_REVIEW') return 'Em análise';
  if (status === 'REMOVED') return 'Removida';
  return 'Publicada';
};

const statusClass = (status?: Post['status']) => {
  if (status === 'PENDING_REVIEW') return 'bg-amber-50 text-amber-700';
  if (status === 'REMOVED') return 'bg-red-50 text-red-700';
  return 'bg-emerald-50 text-emerald-700';
};

export function BusinessPostsPanel({ businessId, businessName, management = false }: BusinessPostsPanelProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    const loadPosts = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ businessId, limit: '12' });
        if (management) params.set('manage', '1');
        const response = await fetch(`/api/community/posts?${params.toString()}`, { cache: 'no-store' });
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error ?? 'Não foi possível carregar as publicações.');
        if (!ignore) setPosts(Array.isArray(payload?.posts) ? payload.posts : []);
      } catch (error) {
        console.error('Failed to load business posts:', error);
        if (!ignore) setPosts([]);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    void loadPosts();
    return () => {
      ignore = true;
    };
  }, [businessId, management]);

  return (
    <section className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <Newspaper size={17} className="text-brand-500" />
            {management ? 'Publicações do negócio' : `Novidades de ${businessName}`}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {management ? 'Acompanhe status e interação das publicações feitas como negócio.' : 'Conteúdos publicados por esta página na comunidade.'}
          </p>
        </div>
        {management ? (
          <Link href="/community" aria-label="Nova publicação" title="Nova publicação" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 transition hover:bg-brand-100">
            <Plus size={18} />
          </Link>
        ) : null}
      </div>

      {loading ? (
        <div className="mt-5 space-y-3">
          <div className="h-28 animate-pulse rounded-3xl bg-slate-100" />
          <div className="h-28 animate-pulse rounded-3xl bg-slate-100" />
        </div>
      ) : posts.length ? (
        <div className="mt-5 space-y-4">
          {posts.map((post) => (
            <article key={post.id} className="overflow-hidden rounded-[24px] border border-slate-100 bg-slate-50/70">
              {post.imageUrl ? (
                <img src={post.imageUrl} alt="Imagem da publicação" className="max-h-72 w-full object-cover" />
              ) : null}
              <div className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${statusClass(post.status)}`}>
                    {statusLabel(post.status)}
                  </span>
                  <time className="text-[11px] text-slate-400">
                    {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(post.createdAt))}
                  </time>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{post.content}</p>
                <div className="mt-4 flex items-center gap-4 text-xs font-semibold text-slate-500">
                  <span className="inline-flex items-center gap-1.5"><Heart size={14} />{post.likeCount}</span>
                  <span className="inline-flex items-center gap-1.5"><MessageCircle size={14} />{post.commentCount}</span>
                  {post.imageUrl ? <span className="inline-flex items-center gap-1.5"><ImageIcon size={14} />Imagem</span> : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-4 flex flex-col items-center gap-2 py-8 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400"><Newspaper size={22} aria-hidden /></span>
          <p className="text-sm font-semibold text-slate-700">{management ? 'Nenhuma publicação ainda' : 'Sem novidades por aqui'}</p>
          <p className="max-w-xs text-xs text-slate-400">{management ? 'Use o botão + para compartilhar uma novidade com a comunidade.' : 'Quando este negócio publicar algo, aparece aqui.'}</p>
        </div>
      )}
    </section>
  );
}
