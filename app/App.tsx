'use client';

import { useSession } from 'next-auth/react';
import MarketplaceChat from '@/views/MarketplaceChat';
import type { User } from '@/types';

export default function App() {
  const { data: session } = useSession();
  if (!session?.user) return null;
  return <MarketplaceChat user={session.user as unknown as User} />;
}