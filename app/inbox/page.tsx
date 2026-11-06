import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCachedServerAuthSession } from '@/lib/server/auth-session';
import { InboxClient } from './InboxClient';
import type { User } from '@/types';

export const metadata: Metadata = {
  title: 'Caixa de Entrada — Gringoou',
  description: 'Gerencie suas conversas do Marketplace e mensagens diretas.',
};

export default async function InboxPage() {
  const session = await getCachedServerAuthSession();

  if (!session?.user?.id) {
    redirect('/login');
  }

  // Cast session user to our User type
  const user: User = {
    id: session.user.id,
    name: session.user.name || 'Usuário',
    username: (session.user as any).username || null,
    role: (session.user as any).role || 'USER',
    avatar: session.user.image || '',
    coverImageUrl: (session.user as any).coverImageUrl || null,
    bio: (session.user as any).bio || null,
    interests: (session.user as any).interests || [],
    galleryUrls: (session.user as any).galleryUrls || [],
    location: (session.user as any).location || '',
    regionKey: (session.user as any).regionKey || null,
    email: session.user.email || null,
    phone: (session.user as any).phone || null,
    birthCity: (session.user as any).birthCity || null,
    recruiterVerified: (session.user as any).recruiterVerified || false,
  };

  return <InboxClient user={user} />;
}