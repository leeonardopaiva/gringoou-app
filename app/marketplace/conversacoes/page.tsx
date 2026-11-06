import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import App from '../../../App';
import { getCachedServerAuthSession } from '@/lib/server/auth-session';

export const metadata: Metadata = {
  title: 'Conversas do Marketplace — Gringoou',
};

export default async function MarketplaceConversationsRoute() {
  const session = await getCachedServerAuthSession();

  if (!session?.user?.id) {
    redirect('/login');
  }

  return <App />;
}