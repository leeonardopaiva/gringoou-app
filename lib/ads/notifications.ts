import { prisma } from '@/lib/prisma';

export type AdNotificationType =
  | 'CAMPAIGN_SUBMITTED'
  | 'CAMPAIGN_APPROVED'
  | 'CAMPAIGN_REJECTED'
  | 'PAYMENT_CONFIRMED'
  | 'PAYMENT_FAILED'
  | 'PAYMENT_REFUNDED';

const MESSAGES: Record<AdNotificationType, (name: string, extra?: string) => { title: string; body: string }> = {
  CAMPAIGN_SUBMITTED: (name) => ({ title: 'Campanha em análise', body: `“${name}” foi enviada e está com a nossa equipe. Avisamos aqui quando houver resposta.` }),
  CAMPAIGN_APPROVED: (name) => ({ title: 'Campanha aprovada', body: `“${name}” foi aprovada e já está no ar.` }),
  CAMPAIGN_REJECTED: (name, reason) => ({ title: 'Campanha recusada', body: `“${name}” não foi aprovada.${reason ? ` Motivo: ${reason}` : ''} Você pode corrigir e reenviar.` }),
  PAYMENT_CONFIRMED: (name) => ({ title: 'Pagamento confirmado', body: `Recebemos o pagamento de “${name}”. A campanha segue para análise.` }),
  PAYMENT_FAILED: (name) => ({ title: 'Pagamento não concluído', body: `O pagamento de “${name}” não foi concluído. Tente novamente para enviar a campanha.` }),
  PAYMENT_REFUNDED: (name) => ({ title: 'Pagamento reembolsado', body: `O pagamento de “${name}” foi reembolsado e a campanha foi pausada.` }),
};

/** Cria um alerta no painel do negócio a partir de uma campanha. Nunca deve quebrar o fluxo principal. */
export async function notifyCampaignEvent(bannerId: string, type: AdNotificationType, extra?: string) {
  try {
    const banner = await prisma.banner.findUnique({ where: { id: bannerId }, select: { adAccountId: true, headline: true, name: true } });
    if (!banner?.adAccountId) return;
    const message = MESSAGES[type](banner.headline || banner.name || 'Campanha', extra);
    await prisma.adNotification.create({
      data: { adAccountId: banner.adAccountId, type, title: message.title, body: message.body, href: '/ads/overview' },
    });
  } catch (error) {
    console.error('Failed to create ad notification:', error);
  }
}
