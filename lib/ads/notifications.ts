import { prisma } from '@/lib/prisma';

export type AdNotificationType =
  | 'CAMPAIGN_SUBMITTED'
  | 'CAMPAIGN_APPROVED'
  | 'CAMPAIGN_REJECTED'
  | 'PAYMENT_CONFIRMED'
  | 'PAYMENT_FAILED'
  | 'PAYMENT_REFUNDED'
  | 'CAMPAIGN_ENDING'
  | 'CAMPAIGN_ENDED'
  | 'NEW_MESSAGE';

const MESSAGES: Record<AdNotificationType, (name: string, extra?: string) => { title: string; body: string }> = {
  CAMPAIGN_SUBMITTED: (name) => ({ title: 'Campanha em análise', body: `“${name}” foi enviada e está com a nossa equipe. Avisamos aqui quando houver resposta.` }),
  CAMPAIGN_APPROVED: (name) => ({ title: 'Campanha aprovada', body: `“${name}” foi aprovada e já está no ar.` }),
  CAMPAIGN_REJECTED: (name, reason) => ({ title: 'Campanha recusada', body: `“${name}” não foi aprovada.${reason ? ` Motivo: ${reason}` : ''} Você pode corrigir e reenviar.` }),
  PAYMENT_CONFIRMED: (name) => ({ title: 'Pagamento confirmado', body: `Recebemos o pagamento de “${name}”. A campanha segue para análise.` }),
  PAYMENT_FAILED: (name) => ({ title: 'Pagamento não concluído', body: `O pagamento de “${name}” não foi concluído. Tente novamente para enviar a campanha.` }),
  PAYMENT_REFUNDED: (name) => ({ title: 'Pagamento reembolsado', body: `O pagamento de “${name}” foi reembolsado e a campanha foi pausada.` }),
  CAMPAIGN_ENDING: (name, days) => ({ title: 'Campanha termina em breve', body: `“${name}” termina em ${days}. Para continuar anunciando, crie uma nova campanha.` }),
  CAMPAIGN_ENDED: (name) => ({ title: 'Campanha encerrada', body: `“${name}” chegou ao fim da vigência. Crie uma nova campanha para continuar anunciando.` }),
  NEW_MESSAGE: (name, preview) => ({ title: `Nova mensagem de ${name}`, body: preview ?? 'Você recebeu uma mensagem sobre o seu negócio.' }),
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

const ENDING_SOON_DAYS = 3;

/**
 * Alertas de vigência: campanhas que terminam em até 3 dias e as que já terminaram.
 * Roda quando o painel consulta os alertas e só cria cada aviso uma vez por campanha.
 */
export async function syncCampaignLifecycleAlerts(adAccountId: string) {
  try {
    const now = new Date();
    const horizon = new Date(now.getTime() + ENDING_SOON_DAYS * 24 * 60 * 60 * 1000);
    const banners = await prisma.banner.findMany({
      where: { adAccountId, archivedAt: null, moderationStatus: 'APPROVED', endsAt: { not: null, lte: horizon } },
      select: { id: true, headline: true, name: true, endsAt: true },
      take: 50,
    });
    for (const banner of banners) {
      if (!banner.endsAt) continue;
      const ended = banner.endsAt.getTime() < now.getTime();
      const type: AdNotificationType = ended ? 'CAMPAIGN_ENDED' : 'CAMPAIGN_ENDING';
      const href = `/ads/overview?campaign=${banner.id}`;
      const exists = await prisma.adNotification.findFirst({ where: { adAccountId, type, href }, select: { id: true } });
      if (exists) continue;
      const days = Math.max(1, Math.ceil((banner.endsAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));
      const message = MESSAGES[type](banner.headline || banner.name || 'Campanha', `${days} dia${days === 1 ? '' : 's'}`);
      await prisma.adNotification.create({ data: { adAccountId, type, title: message.title, body: message.body, href } });
    }
  } catch (error) {
    console.error('Failed to sync campaign lifecycle alerts:', error);
  }
}

/** Alerta de mensagem nova para o negócio (só quando quem escreveu é o visitante, não o responsável). */
export async function notifyBusinessMessage(conversationId: string, senderId: string, preview: string) {
  try {
    const conversation = await prisma.marketplaceConversation.findUnique({
      where: { id: conversationId },
      select: { businessId: true, sellerId: true, buyer: { select: { name: true } }, business: { select: { adAccount: { select: { id: true } } } } },
    });
    const adAccountId = conversation?.business?.adAccount?.id;
    if (!conversation?.businessId || !adAccountId || senderId === conversation.sellerId) return;
    const href = `/ads/inbox?conversation=${conversationId}`;
    const message = MESSAGES.NEW_MESSAGE(conversation.buyer.name || 'um cliente', preview.slice(0, 120));
    // Uma única mensagem não lida por conversa: novas mensagens só atualizam o aviso.
    const unread = await prisma.adNotification.findFirst({ where: { adAccountId, type: 'NEW_MESSAGE', href, readAt: null }, select: { id: true } });
    if (unread) {
      await prisma.adNotification.update({ where: { id: unread.id }, data: { title: message.title, body: message.body, createdAt: new Date() } });
    } else {
      await prisma.adNotification.create({ data: { adAccountId, type: 'NEW_MESSAGE', title: message.title, body: message.body, href } });
    }
  } catch (error) {
    console.error('Failed to create business message alert:', error);
  }
}
