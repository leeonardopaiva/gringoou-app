import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireModerationSession } from '@/lib/require-moderation';
import { marketplaceUseCases } from '@/lib/server/marketplace-usecases';
import { marketplaceErrorResponse } from '@/lib/server/marketplace-errors';

type RouteContext = { params: Promise<{ id: string }> };

const moderateSchema = z.object({
  decision: z.enum(['APPROVE', 'REJECT', 'REMOVE']),
  reason: z.string().trim().max(1000).nullish(),
});

/** Aprovar, rejeitar ou remover anúncio — apenas MODERATOR/ADMIN, nunca o próprio anúncio. */
export async function POST(request: Request, { params }: RouteContext) {
  const { session, response } = await requireModerationSession();
  if (response || !session) return response!;

  const parsed = moderateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 });
  }

  const { id } = await params;

  try {
    await marketplaceUseCases.moderateMarketplace({
      id,
      moderatorId: session.user.id,
      decision: parsed.data.decision,
      reason: parsed.data.reason ?? null,
    });
  } catch (error) {
    return marketplaceErrorResponse(error);
  }

  return NextResponse.json({ message: 'Decisão registrada.' });
}
