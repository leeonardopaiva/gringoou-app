import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import App from '../../../../App';
import { getCachedServerAuthSession } from '@/lib/server/auth-session';

export const metadata: Metadata = {
  title: 'Editar anúncio — Gringoou',
};

// A autorização real (dono/admin) é validada na API de edição e na view.
export default async function MarketplaceEditRoute() {
  const session = await getCachedServerAuthSession();
  if (!session?.user?.id) redirect('/login');
  return <App />;
}
