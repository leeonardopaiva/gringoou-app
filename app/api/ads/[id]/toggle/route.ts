import { AdCampaignStatus, AdModerationStatus, AdPaymentStatus } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { canManageAdCampaign, getPromotionEligibilityError } from '@/lib/ads/account';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type RouteContext = { params: Promise<{ id: string }> };
const toggleSchema = z.object({ isActive: z.boolean() });

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 });
  const parsed = toggleSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Estado invalido.' }, { status: 400 });
  const { id } = await context.params;

  const banner = await prisma.banner.findFirst({
    where: { id, adAccount: { users: { some: { userId: session.user.id } } } },
    select: {
      id: true,
      paymentStatus: true,
      moderationStatus: true,
      startsAt: true,
      endsAt: true,
      adAccount: {
        select: {
          businessId: true,
          business: { select: { status: true } },
          users: { where: { userId: session.user.id }, select: { role: true }, take: 1 },
        },
      },
    },
  });
  const role = banner?.adAccount?.users[0]?.role;
  if (!banner || !role || !canManageAdCampaign(role)) return NextResponse.json({ error: 'Apenas administradores da conta podem ativar ou pausar campanhas.' }, { status: 403 });
  if (parsed.data.isActive && banner.adAccount) {
    const eligibilityError = getPromotionEligibilityError(banner.adAccount);
    if (eligibilityError) return NextResponse.json(eligibilityError, { status: 409 });
  }

  const now = new Date();
  if (parsed.data.isActive && (
    banner.paymentStatus !== AdPaymentStatus.PAID ||
    banner.moderationStatus !== AdModerationStatus.APPROVED ||
    (banner.startsAt && banner.startsAt > now) ||
    (banner.endsAt && banner.endsAt < now)
  )) {
    return NextResponse.json({ error: 'Apenas campanhas pagas, aprovadas e dentro da vigencia podem ser ativadas.' }, { status: 409 });
  }

  const updated = await prisma.banner.update({
    where: { id: banner.id },
    data: { isActive: parsed.data.isActive, campaignStatus: parsed.data.isActive ? AdCampaignStatus.ACTIVE : AdCampaignStatus.PAUSED },
    select: { id: true, isActive: true, campaignStatus: true },
  });
  return NextResponse.json({ banner: updated });
}
