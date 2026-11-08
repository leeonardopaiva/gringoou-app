import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import App from '../../../App';
import { getCachedServerAuthSession } from '@/lib/server/auth-session';
import { getPublishedNewsById } from '@/lib/server/news-articles';
import { isCanonicalNewsSlug, newsIdFromSlug, newsPath } from '@/lib/news-url';
import { getNewsCategoryLabel } from '@/lib/news';

type PageProps = { params: Promise<{ slug: string }> };

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await getPublishedNewsById(newsIdFromSlug(slug)).catch(() => null);
  if (!article) return { title: 'Notícia — Gringoou' };

  const description = article.subtitle ?? `${article.source} · Notícia para a comunidade brasileira no exterior.`;
  return {
    title: `${article.title} — Gringoou`,
    description,
    alternates: { canonical: newsPath(article) },
    openGraph: {
      type: 'article',
      title: article.title,
      description,
      url: newsPath(article),
      publishedTime: article.publishedAt,
      images: article.imageUrl ? [{ url: article.imageUrl }] : undefined,
    },
    twitter: { card: article.imageUrl ? 'summary_large_image' : 'summary', title: article.title, description },
  };
}

export default async function NewsArticleRoute({ params }: PageProps) {
  const { slug } = await params;
  const session = await getCachedServerAuthSession();
  const article = await getPublishedNewsById(newsIdFromSlug(slug), session?.user?.id ?? null).catch(() => null);

  if (!article) notFound();
  if (!isCanonicalNewsSlug(slug, article)) permanentRedirect(newsPath(article));

  // Quem está logado vê a notícia dentro do app (curtir, comentar, voltar para a lista).
  if (session?.user?.id) {
    return <App />;
  }

  // Visitante (link compartilhado): a notícia é pública; curtir e comentar pedem entrada.
  return (
    <main className="mx-auto min-h-screen w-full max-w-[620px] px-4 py-8">
      <article className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        {article.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={article.imageUrl} alt="" className="aspect-[16/9] w-full object-cover" />
        ) : null}
        <div className="space-y-3 p-5">
          <p className="text-xs font-semibold text-brand-700">{getNewsCategoryLabel(article.category)}</p>
          <h1 className="text-xl font-bold leading-snug text-slate-900">{article.title}</h1>
          {article.subtitle ? <p className="text-sm leading-relaxed text-slate-600">{article.subtitle}</p> : null}
          <p className="text-xs text-slate-400">
            <span className="font-semibold text-slate-600">{article.source}</span> ·{' '}
            <time dateTime={article.publishedAt}>{new Date(article.publishedAt).toLocaleDateString('pt-BR')}</time>
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <Link href={`/login?callbackUrl=${encodeURIComponent(newsPath(article))}`} className="rounded-full bg-brand-500 px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-105">
              Entrar para curtir e comentar
            </Link>
            <a href={article.externalUrl} target="_blank" rel="noopener noreferrer nofollow" className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">
              Ler matéria original
            </a>
          </div>
        </div>
      </article>
    </main>
  );
}
