import { redirect } from 'next/navigation';
import { AdAccountOnboardingForm } from '@/components/ads/AdAccountOnboardingForm';
import { MAX_AD_ACCOUNTS_PER_USER } from '@/lib/ads/account';
import { getAdvertisableBusinesses } from '@/lib/ads/businesses';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export default async function NewAdAccountPage() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) redirect('/ads/login');

  const currentCount = await prisma.adAccountUser.count({ where: { userId: session.user.id } });
  if (currentCount >= MAX_AD_ACCOUNTS_PER_USER) redirect('/ads/settings?accountLimit=1');

  const businesses = await getAdvertisableBusinesses(session.user.id);
  return <AdAccountOnboardingForm mode="additional" currentCount={currentCount} maxAccounts={MAX_AD_ACCOUNTS_PER_USER} businesses={businesses} />;
}
