import { AdReviewConfirmation } from '@/components/ads/AdReviewConfirmation';
import { requireAdAccountPage } from '@/lib/ads/account';
import { syncCampaignPayment } from '@/lib/ads/payment-confirmation';
import { prisma } from '@/lib/prisma';

type PageProps = {
  searchParams?: Promise<{
    campaign?: string;
  }>;
};

export default async function AdReviewPage({ searchParams }: PageProps) {
  const { membership } = await requireAdAccountPage();

  const params = await searchParams;
  const campaignId = params?.campaign;
  const owned = campaignId
    ? await prisma.banner.findFirst({ where: { id: campaignId, adAccountId: membership.adAccountId }, select: { id: true, payments: { where: { provider: 'COURTESY' }, select: { id: true }, take: 1 } } })
    : null;
  // Consulta o Stripe direto: não depende do webhook ter chegado. Só pagamento confirmado avança.
  const payment = owned && !owned.payments.length ? await syncCampaignPayment(owned.id) : null;

  const campaign = params?.campaign
    ? await prisma.banner.findFirst({
        where: { id: params.campaign, adAccountId: membership.adAccountId },
        select: { headline: true, name: true, paymentStatus: true, payments: { where: { provider: 'COURTESY' }, select: { id: true }, take: 1 } },
      })
    : null;

  return (
    <AdReviewConfirmation
      headline={campaign?.headline || campaign?.name || null}
      kind={campaign?.payments.length ? 'courtesy' : payment === 'failed' ? 'failed' : campaign?.paymentStatus === 'PAID' || payment === 'paid' ? 'paid' : 'processing'}
    />
  );
}
