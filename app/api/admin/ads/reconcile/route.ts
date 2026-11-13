import { AdModerationStatus, AdPaymentStatus } from '@prisma/client';
import { NextResponse } from 'next/server';
import { syncCampaignPaymentDetailed, type PaymentSyncResult } from '@/lib/ads/payment-confirmation';
import { prisma } from '@/lib/prisma';
import { requireAdminSession } from '@/lib/require-admin';

/**
 * Admin: reconcilia com o Stripe as campanhas que ficaram em rascunho com pagamento iniciado
 * (ex.: webhook que não chegou). Só pagamento `succeeded` no Stripe avança para a fila de revisão.
 */
export async function POST() {
  const { response } = await requireAdminSession();
  if (response) return response;

  const stuck = await prisma.banner.findMany({
    where: {
      adAccountId: { not: null },
      moderationStatus: AdModerationStatus.DRAFT,
      paymentStatus: AdPaymentStatus.PENDING,
      payments: { some: { provider: 'STRIPE' } },
    },
    orderBy: { updatedAt: 'desc' },
    take: 50,
    select: { id: true, headline: true, name: true },
  });

  const results: Array<PaymentSyncResult & { id: string; headline: string }> = [];
  for (const campaign of stuck) {
    const result = await syncCampaignPaymentDetailed(campaign.id);
    results.push({ id: campaign.id, headline: campaign.headline || campaign.name, ...result });
  }

  return NextResponse.json({
    checked: results.length,
    moved: results.filter((item) => item.state === 'paid').length,
    results,
  });
}
