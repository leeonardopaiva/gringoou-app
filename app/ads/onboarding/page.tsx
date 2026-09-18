import { redirect } from 'next/navigation';
import { AdAccountOnboardingForm } from '@/components/ads/AdAccountOnboardingForm';
import { getAdAccountMembership } from '@/lib/ads/account';
import { getAdvertisableBusinesses } from '@/lib/ads/businesses';
import { getServerAuthSession } from '@/lib/auth';

type PageProps = { searchParams?: Promise<{ businessId?: string }> };

export default async function AdsOnboardingPage({ searchParams }: PageProps) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) redirect('/ads/login');
  const params = await searchParams;
  const businesses = await getAdvertisableBusinesses(session.user.id);
  const requestedBusiness = params?.businessId
    ? businesses.find((business) => business.id === params.businessId)
    : null;

  if (requestedBusiness?.linkedAdAccountId) {
    redirect(`/ads/promover/${requestedBusiness.id}`);
  }

  if (!params?.businessId && await getAdAccountMembership(session.user.id)) redirect('/ads/overview');

  return (
    <AdAccountOnboardingForm
      businesses={businesses}
      initialBusinessId={requestedBusiness?.id}
    />
  );
}
