import 'server-only';

import { prisma } from '@/lib/prisma';

/** As duas pessoas são amigas (solicitação aceita em qualquer direção)? */
export async function areFriends(userA: string, userB: string): Promise<boolean> {
  const count = await prisma.friendRequest.count({
    where: {
      status: 'ACCEPTED',
      OR: [
        { requesterId: userA, recipientId: userB },
        { requesterId: userB, recipientId: userA },
      ],
    },
  });
  return count > 0;
}

export type DirectAccess = 'ALLOW' | 'REQUEST' | 'DENY';

/**
 * Pode `senderId` iniciar uma conversa direta com a pessoa `recipient`?
 *  - ALLOW: entra direto na caixa de entrada;
 *  - REQUEST: vira solicitação (aparece nos Alertas para aceitar, excluir ou bloquear);
 *  - DENY: a pessoa não recebe mensagens.
 * Contato por negócio ou evento (`context`) sempre é permitido: é o canal de atendimento.
 */
export async function resolveDirectAccess(
  senderId: string,
  recipient: { id: string; messagePolicy: 'EVERYONE' | 'FRIENDS' | 'NOBODY' },
  context?: { type?: unknown; id?: unknown } | null,
): Promise<DirectAccess> {
  if (context && typeof context.id === 'string' && context.id) {
    if (context.type === 'business') {
      const business = await prisma.business.findUnique({ where: { id: context.id }, select: { createdById: true } });
      if (business?.createdById === recipient.id) return 'ALLOW';
    }
    if (context.type === 'event') {
      const event = await prisma.event.findUnique({ where: { id: context.id }, select: { createdById: true } });
      if (event?.createdById === recipient.id) return 'ALLOW';
    }
  }

  if (recipient.messagePolicy === 'EVERYONE') return 'ALLOW';
  if (recipient.messagePolicy === 'NOBODY') return 'DENY';
  return (await areFriends(senderId, recipient.id)) ? 'ALLOW' : 'REQUEST';
}

/** Faz a conversa voltar à lista de quem a tinha excluído ou arquivado (chegou mensagem nova). */
export async function reviveConversationFor(conversationId: string, userId: string) {
  await prisma.conversationState.updateMany({
    where: { conversationId, userId },
    data: { deletedAt: null, archivedAt: null },
  });
}
