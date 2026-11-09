import { AdCampaignStatus, AdModerationStatus } from '@prisma/client';
import { NextResponse } from 'next/server';
import { canManageAdBilling } from '@/lib/ads/account';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Remove a campanha do painel (arquivar). O histórico financeiro e os relatórios são mantidos.
 * Só o proprietário da conta, e nunca enquanto a campanha está em análise ou no ar.
 */
export async function POST(_request: Request, context: RouteContext) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: 'Entre na sua conta para continuar.' }, { status: 401 });
  const { id } = await context.params;

  const banner = await prisma.banner.findFirst({
    where: { id, archivedAt: null, adAccount: { users: { some: { userId: session.user.id } } } },
    select: {
      id: true,
      moderationStatus: true,
      campaignStatus: true,
      isActive: true,
      endsAt: true,
      adAccount: { select: { users: { where: { userId: session.user.id }, select: { role: true }, take: 1 } } },
    },
  });
  const role = banner?.adAccount?.users[0]?.role;
  if (!banner || !role) return NextResponse.json({ error: 'Campanha não encontrada.' }, { status: 404 });
  if (!canManageAdBilling(role)) return NextResponse.json({ error: 'Apenas o proprietário da conta pode remover campanhas.' }, { status: 403 });

  const running =
    banner.moderationStatus === AdModerationStatus.APPROVED &&
    banner.campaignStatus === AdCampaignStatus.ACTIVE &&
    banner.isActive &&
    (!banner.endsAt || banner.endsAt > new Date());
  if (banner.moderationStatus === AdModerationStatus.PENDING_REVIEW) {
    return NextResponse.json({ error: 'Esta campanha está em análise. Aguarde a resposta da equipe para removê-la.' }, { status: 409 });
  }
  if (running) {
    return NextResponse.json({ error: 'Esta campanha está no ar. Pause a campanha antes de removê-la.' }, { status: 409 });
  }

  await prisma.banner.update({ where: { id: banner.id }, data: { archivedAt: new Date(), isActive: false } });
  return NextResponse.json({ ok: true });
}
