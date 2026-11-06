'use client';

import { useSession } from 'next-auth/react';
import MarketplaceChat from '@/views/MarketplaceChat';
import { FloatingChatV2 } from '@/components/marketplace/FloatingChatV2';
import type { User } from '@/types';

export default function App() {
  const { data: session } = useSession();
  if (!session?.user) return null;
  return (
    <>
      <MarketplaceChat user={session.user as unknown as User} />
      <FloatingChatV2 user={session.user as unknown as User} />
    </>
  );
}