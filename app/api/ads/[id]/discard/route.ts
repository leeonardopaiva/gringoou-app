import { AdModerationStatus, AdPaymentStatus } from '@prisma/client';
import { NextResponse } from 'next/server';
import { canEditAdDraft } from '@/lib/ads/account';
import { getStripe } from '@/lib/ads/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Descarta um rascunho: ele sai do painel e deixa de ser restaurado ao abrir o assistente.
 * Só vale para rascunho que nunca foi pago. Pagamento iniciado e não concluído é cancelado no Stripe
 * e o crédito de cupom reservado volta para a conta. O registro é arquivado (histórico preservado).
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
      adAccount: { select: { users: { where: { userId: session.user.id }, select: { role: true }, take: 1 } } },
      payments: { select: { id: true, status: true, provider: true, providerPaymentId: true } },
    },
  });
  const role = banner?.adAccount?.users[0]?.role;
  if (!banner || !role) return NextResponse.json({ error: 'Rascunho não encontrado.' }, { status: 404 });
  if (!canEditAdDraft(role)) return NextResponse.json({ error: 'Sem permissão para descartar rascunhos nesta conta.' }, { status: 403 });
  if (banner.moderationStatus !== AdModerationStatus.DRAFT || banner.payments.some((payment) => payment.status === AdPaymentStatus.PAID)) {
    return NextResponse.json({ error: 'Esta campanha já foi enviada e não pode ser descartada como rascunho.' }, { status: 409 });
  }

  const pending = banner.payments.filter((payment) => payment.status === AdPaymentStatus.PENDING && payment.provider === 'STRIPE' && payment.providerPaymentId);
  for (const payment of pending) {
    try {
      const stripe = getStripe();
      const intent = await stripe.paymentIntents.retrieve(payment.providerPaymentId as string);
      if (intent.status === 'processing' || intent.status === 'succeeded') {
        return NextResponse.json({ error: 'Seu pagamento está sendo processado. Aguarde a confirmação antes de descartar.' }, { status: 409 });
      }
      if (intent.status !== 'canceled') await stripe.paymentIntents.cancel(intent.id).catch(() => undefined);
    } catch (error) {
      console.error('Failed to cancel pending payment while discarding draft:', error);
      return NextResponse.json({ error: 'Não foi possível cancelar o pagamento pendente agora. Tente novamente em instantes.' }, { status: 503 });
    }
  }

  await prisma.$transaction([
    prisma.adPayment.updateMany({ where: { bannerId: banner.id, status: AdPaymentStatus.PENDING }, data: { status: AdPaymentStatus.FAILED } }),
    prisma.adCouponRedemption.deleteMany({ where: { bannerId: banner.id } }),
    prisma.banner.update({ where: { id: banner.id }, data: { archivedAt: new Date(), isActive: false } }),
  ]);

  return NextResponse.json({ ok: true });
}
