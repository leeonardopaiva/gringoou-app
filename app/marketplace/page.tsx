import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import App from '../../App';
import { getCachedServerAuthSession } from '@/lib/server/auth-session';
import { marketplaceUseCases } from '@/lib/server/marketplace-usecases';
import type { MarketplaceInitialData } from '@/lib/content-contracts';

export const metadata: Metadata = {
  title: 'Marketplace — Gringoou',
  description:
    'Compre, venda e doe itens com a comunidade brasileira no exterior. Anuncios perto de voce.',
};

export default async function MarketplaceRoute() {
  const session = await getCachedServerAuthSession();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const isAdmin = session?.user?.role === 'ADMIN';

  const initialMarketplaceData: MarketplaceInitialData | undefined = session?.user?.regionKey
    ? await marketplaceUseCases
        .listMarketplace({
          viewerId: session.user.id,
          isAdmin,
          regionKey: session.user.regionKey,
          page: 1,
        })
        .then((page) => ({
          items: page.items,
          scope: page.scope,
          regionKey: session.user.regionKey!,
          total: page.total,
        }))
        .catch(() => undefined)
    : undefined;

  return <App initialMarketplaceData={initialMarketplaceData} />;
}