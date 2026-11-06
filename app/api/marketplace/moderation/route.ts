import { NextResponse } from 'next/server';
import { requireModerationSession } from '@/lib/require-moderation';
import { marketplaceUseCases } from '@/lib/server/marketplace-usecases';
import type { MarketplaceStatus } from '@/domain/marketplace/entities/marketplace.entity';

const ALLOWED: MarketplaceStatus[] = ['PENDING_REVIEW', 'REJECTED', 'ACTIVE', 'REMOVED'];

/** Fila de moderação — apenas MODERATOR/ADMIN (validado no servidor). */
export async function GET(request: Request) {
  const { response } = await requireModerationSession();
  if (response) return response;

  const { searchParams } = new URL(request.url);
  const status = (searchParams.get('status') ?? 'PENDING_REVIEW') as MarketplaceStatus;
  if (!ALLOWED.includes(status)) {
    return NextResponse.json({ error: 'Status inválido.' }, { status: 400 });
  }

  const page = Number(searchParams.get('page') ?? '1');
  const result = await marketplaceUseCases.listModeration({
    statuses: [status],
    page: Number.isFinite(page) ? page : 1,
  });

  return NextResponse.json(result);
}
