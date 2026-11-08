'use client';

import React, { useEffect, useState } from 'react';
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
        <NewsCard article={article} detail />
      )}
    </ContentColumn>
  );
};

export default NewsDetail;
