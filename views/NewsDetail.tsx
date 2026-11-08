'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { BackBar } from '../components/ui/BackBar';
import { ContentColumn } from '../components/ui/ContentColumn';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { NewsCard } from './NewsList';
import { newsIdFromSlug } from '../lib/news-url';
import type { NewsArticleContract } from '../lib/content-contracts';

/** Página da notícia no Gringoou: a matéria, curtidas, compartilhar e comentários completos. */
const NewsDetail: React.FC<{ slug: string }> = ({ slug }) => {
  const [article, setArticle] = useState<NewsArticleContract | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>('loading');
  const [related, setRelated] = useState<NewsArticleContract[]>([]);

  useEffect(() => {
    let ignore = false;
    setState('loading');
    fetch(`/api/news/${encodeURIComponent(newsIdFromSlug(slug))}`, { cache: 'no-store' })
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (ignore) return;
        if (response.ok && payload?.article) {
          setArticle(payload.article);
          setState('ready');
        } else {
          setState('missing');
        }
      })
      .catch(() => {
        if (!ignore) setState('missing');
      });
    return () => {
      ignore = true;
    };
  }, [slug]);

  // "Leia também": outras notícias da mesma categoria.
  useEffect(() => {
    if (!article) return;
    let ignore = false;
    fetch(`/api/news?category=${encodeURIComponent(article.category)}&limit=5`, { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (!ignore && Array.isArray(payload?.items)) {
          setRelated((payload.items as NewsArticleContract[]).filter((item) => item.id !== article.id).slice(0, 3));
        }
      })
      .catch(() => undefined);
    return () => {
      ignore = true;
    };
  }, [article]);

  return (
    <ContentColumn size="compact" className="animate-in pb-24 fade-in duration-500">
      <BackBar fallbackHref="/news" label="Notícias" />
      {state === 'loading' ? (
        <div className="space-y-3" role="status" aria-label="Carregando notícia">
          <Skeleton className="aspect-[16/9] w-full rounded-2xl" />
          <Skeleton className="h-5 w-4/5" />
          <Skeleton className="h-4 w-full" />
        </div>
      ) : state === 'missing' || !article ? (
        <EmptyState title="Notícia indisponível" description="Esta notícia não está mais disponível." />
      ) : (
        <>
          <NewsCard article={article} detail />
          {related.length > 0 ? (
            <section aria-label="Leia também" className="mt-8">
              <h2 className="mb-3 text-base font-bold text-slate-900">Leia também</h2>
              <ul className="space-y-3">
                {related.map((item) => (
                  <li key={item.id}>
                    <Link href={item.path} className="flex gap-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm transition hover:border-brand-200">
                      {item.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.imageUrl} alt="" loading="lazy" className="h-16 w-24 shrink-0 rounded-xl object-cover" />
                      ) : null}
                      <span className="min-w-0">
                        <span className="line-clamp-2 text-sm font-semibold leading-snug text-slate-900">{item.title}</span>
                        <span className="mt-1 block truncate text-xs text-slate-400">{item.source}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </ContentColumn>
  );
};

export default NewsDetail;
