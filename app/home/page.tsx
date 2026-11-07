import App from '../../App';
import { getCachedServerAuthSession } from '@/lib/server/auth-session';
import { getHomeInitialData } from '@/lib/server/home-data';

export default async function AuthenticatedHomePage() {
  const session = await getCachedServerAuthSession();
  const initialHomeData = session?.user?.id
    ? await getHomeInitialData(session.user.regionKey)
    : undefined;

  return <App initialHomeData={initialHomeData} />;
}
