import App from '../../App';
import { getCachedServerAuthSession } from '@/lib/server/auth-session';
import { getEventsPage } from '@/lib/server/events';

export default async function EventsPage() {
  const session = await getCachedServerAuthSession();

  if (!session?.user?.id) {
    return <App />;
  }

  const initialEventsData = session?.user?.regionKey
    ? await getEventsPage({ session, regionKey: session.user.regionKey })
        .then((page) => ({ ...page, regionKey: session.user.regionKey! }))
        .catch(() => undefined)
    : undefined;

  return <App initialEventsData={initialEventsData} />;
}