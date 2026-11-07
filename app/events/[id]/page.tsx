import type { Metadata } from 'next';
import { redirect, notFound } from 'next/navigation';
import App from '../../../App';
import { getCachedServerAuthSession } from '@/lib/server/auth-session';
import { eventsUseCases } from '@/lib/server/events-usecases';

export const metadata: Metadata = {
  title: 'Evento — Gringoou',
};

export default async function EventDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: eventId } = await params;
  const session = await getCachedServerAuthSession();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const isAdmin = session?.user?.role === 'ADMIN';

  // A verificação de existência do evento continua server-side para 404 rápido
  const eventExists = eventId
    ? await eventsUseCases
        .getEvent({
          idOrSlug: eventId,
          viewerId: session.user.id,
          isAdmin,
        })
        .then((event) => event !== null)
        .catch(() => false)
    : false;

  if (!eventExists && eventId) {
    notFound();
  }

  // Delega ao App o layout completo (header, sidebar) + renderização via BusinessWorkspace
  return <App />;
}