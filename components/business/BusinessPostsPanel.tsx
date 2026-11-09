'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Heart, MessageCircle, Newspaper, Plus } from 'lucide-react';
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

  const formatDate = (value: string) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(value)).replace('.', '');

  return (
    <section aria-label={management ? 'Publicações do negócio' : `Novidades de ${businessName}`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
          {management ? 'Publicações' : 'Novidades'}
          {!loading && posts.length > 0 ? <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-bold text-brand-700">{posts.length}</span> : null}
        </h2>
        {management ? (
          <Link href="/community" aria-label="Nova publicação" title="Nova publicação" className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 transition hover:bg-brand-100">
            <Plus size={18} />
          </Link>
        ) : null}
      </div>

      {loading ? (
        <div className="mt-4 flex gap-3 overflow-hidden">
          <div className="h-56 w-[72%] shrink-0 animate-pulse rounded-2xl bg-slate-100 sm:w-64" />
          <div className="h-56 w-[72%] shrink-0 animate-pulse rounded-2xl bg-slate-100 sm:w-64" />
        </div>
      ) : posts.length ? (
        <>
          <ul className="-mx-5 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 sm:-mx-7 sm:px-7 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {posts.map((post) => (
              <li key={post.id} className="w-[72%] shrink-0 snap-start sm:w-64">
                <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  {post.imageUrl ? (
                    <img src={post.imageUrl} alt="" loading="lazy" className="aspect-[4/3] w-full object-cover" />
                  ) : (
                    <div className="flex aspect-[4/3] w-full items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 text-slate-300" aria-hidden><Newspaper size={32} /></div>
                  )}
                  <div className="flex flex-1 flex-col p-3.5">
                    <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
                      <time dateTime={post.createdAt}>{formatDate(post.createdAt)}</time>
                      {management ? <span className={`rounded-full px-2 py-0.5 font-bold ${statusClass(post.status)}`}>{statusLabel(post.status)}</span> : null}
                    </div>
                    <p className="mt-1.5 line-clamp-3 flex-1 whitespace-pre-wrap text-sm leading-5 text-slate-700">{post.content}</p>
                    <div className="mt-3 flex items-center gap-4 text-xs font-semibold text-slate-400">
                      <span className="inline-flex items-center gap-1.5"><Heart size={14} />{post.likeCount}</span>
                      <span className="inline-flex items-center gap-1.5"><MessageCircle size={14} />{post.commentCount}</span>
                    </div>
                  </div>
                </article>
              </li>
            ))}
          </ul>
          {posts.length > 1 ? <p className="mt-1 text-center text-[11px] text-slate-400">Deslize para ver as {posts.length} publicações</p> : null}
        </>
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
