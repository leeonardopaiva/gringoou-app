import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import App from '../../App';
import { getCachedServerAuthSession } from '@/lib/server/auth-session';
import { newsUseCases } from '@/lib/server/news-usecases';
import { findRegionByKey } from '@/lib/region-store';
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

  const regionKey = session?.user?.regionKey ?? null;
  const region = regionKey ? await findRegionByKey(regionKey) : null;

  const initialNewsData: NewsInitialData | undefined = regionKey
    ? await newsUseCases
        .listNews({
          regionKey,
          regionLabel: region?.label ?? null,
          city: region?.city ?? null,
          state: region?.state ?? null,
          countryCode: region?.countryCode ?? null,
          category: 'region',
          limit: 30,
        })
        .then((feed) => ({
          items: feed.items,
          regionKey: feed.regionKey,
          regionLabel: feed.regionLabel,
          provider: feed.provider,
          fetchedAt: feed.fetchedAt,
        }))
        .catch(() => undefined)
    : undefined;

  return <App initialNewsData={initialNewsData} />;
}