import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import App from '../../App';
import { getCachedServerAuthSession } from '@/lib/server/auth-session';
import { listPublishedNews } from '@/lib/server/news-articles';
import type { NewsInitialData } from '@/lib/content-contracts';

export const metadata: Metadata = {
  title: 'Notícias — Gringoou',
  description:
    'Notícias da sua região e da comunidade brasileira no exterior. Imigração, atualidades e o que importa para você.',
};

export const revalidate = 300;

export default async function NewsRoute() {
  const session = await getCachedServerAuthSession();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const regionKey = session.user.regionKey ?? null;

  const initialNewsData: NewsInitialData | undefined = await listPublishedNews({ regionKey, viewerId: session.user.id })
    .then((feed) => ({ ...feed, regionKey }))
    .catch(() => undefined);

  return <App initialNewsData={initialNewsData} />;
}
