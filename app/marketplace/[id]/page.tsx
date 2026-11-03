import type { Metadata } from 'next';
import { redirect, notFound } from 'next/navigation';
import App from '../../../App';
import { getCachedServerAuthSession } from '@/lib/server/auth-session';
import { marketplaceUseCases } from '@/lib/server/marketplace-usecases';

export const metadata: Metadata = {
  title: 'Anuncio — Gringoou',
};

export default async function MarketplaceDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getCachedServerAuthSession();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const isAdmin = session?.user?.role === 'ADMIN';

  const itemExists = id
    ? await marketplaceUseCases
        .getMarketplace({ id, viewerId: session.user.id, isAdmin })
        .then((item) => item !== null)
        .catch(() => false)
    : false;

  if (!itemExists && id) {
    notFound();
  }

  return <App />;
}