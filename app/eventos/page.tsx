import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import App from '../../App';
import { getCachedServerAuthSession } from '@/lib/server/auth-session';
import { eventsUseCases } from '@/lib/server/events-usecases';
import type { EventsInitialData } from '@/lib/content-contracts';

export const metadata: Metadata = {
  title: 'Eventos — Gringoou',
  description:
    'Descubra eventos da comunidade brasileira no exterior. Feiras, encontros, torneios, workshops e muito mais perto de você.',
};

export default async function EventsRoute() {
  const session = await getCachedServerAuthSession();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const isAdmin = session?.user?.role === 'ADMIN';

  const initialEventsData: EventsInitialData | undefined = session?.user?.regionKey
    ? await eventsUseCases
        .listEvents({
          viewerId: session.user.id,
          isAdmin,
          regionKey: session.user.regionKey,
        })
        .then((page) => ({ events: page.events, scope: page.scope, regionKey: session.user.regionKey! }))
        .catch(() => undefined)
    : undefined;

  return <App initialEventsData={initialEventsData} />;
}