import { NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { getAdPlanCatalog } from '@/lib/ads/plans';

export const runtime = 'nodejs';

/** Pacotes de anúncios ativos, com os valores vigentes (usados pelo fluxo de promover). */
export async function GET() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const plans = (await getAdPlanCatalog()).filter((plan) => plan.isActive);
  return NextResponse.json({ plans }, { headers: { 'Cache-Control': 'no-store' } });
}
