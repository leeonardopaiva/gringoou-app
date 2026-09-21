import App from '../../App';
import { getCachedServerAuthSession } from '@/lib/server/auth-session';
import { getCommunityPostsPage } from '@/lib/server/community-posts';
import type { CommunityInitialData } from '@/lib/content-contracts';
import type { BusinessesInitialData, EventsInitialData, ProfileInitialData } from '@/lib/content-contracts';
import { getBusinessesPage } from '@/lib/server/businesses';
import { getEventsPage } from '@/lib/server/events';
import { getProfileData } from '@/lib/server/profile';
import { redirect } from 'next/navigation';

export default async function CatchAllPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const [{ slug }, session] = await Promise.all([params, getCachedServerAuthSession()]);

  if (slug[0] === 'profissional' && slug[1]) {
    redirect(`/perfil/${encodeURIComponent(slug[1])}`);
  }
  let initialCommunityData: CommunityInitialData | undefined;
  let initialBusinessesData: BusinessesInitialData | undefined;
  let initialEventsData: EventsInitialData | undefined;
  let initialProfileData: ProfileInitialData | undefined;

  if (slug[0] === 'community' && session?.user?.regionKey) {
    try {
      const page = await getCommunityPostsPage({
        session,
        regionKey: session.user.regionKey,
        limit: 5,
        offset: 0,
      });
      initialCommunityData = { ...page, regionKey: session.user.regionKey };
    } catch (error) {
      console.error('Failed to load initial Community feed on the server:', error);
    }
  }

  if (slug.length === 1 && slug[0] === 'profile' && session?.user?.id) {
    try {
      initialProfileData = (await getProfileData(session.user.id)) ?? undefined;
    } catch (error) {
      console.error('Failed to load initial Profile on the server:', error);
    }
  }

  if (slug.length === 1 && slug[0] === 'negocios' && session?.user?.regionKey) {
    try {
      const page = await getBusinessesPage({ session, regionKey: session.user.regionKey });
      initialBusinessesData = { ...page, regionKey: session.user.regionKey };
    } catch (error) {
      console.error('Failed to load initial Businesses on the server:', error);
    }
  }

  if (slug.length === 1 && (slug[0] === 'eventos' || slug[0] === 'marketplace') && session?.user?.regionKey) {
    try {
      const page = await getEventsPage({ session, regionKey: session.user.regionKey });
      initialEventsData = { ...page, regionKey: session.user.regionKey };
    } catch (error) {
      console.error('Failed to load initial Events on the server:', error);
    }
  }

  return (
    <App
      initialCommunityData={initialCommunityData}
      initialBusinessesData={initialBusinessesData}
      initialEventsData={initialEventsData}
      initialProfileData={initialProfileData}
    />
  );
}
