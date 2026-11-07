import 'server-only';

import { prisma } from '@/lib/prisma';

/** Existe bloqueio entre as duas pessoas, em qualquer direção? */
export async function isBlockedBetween(userA: string, userB: string): Promise<boolean> {
  const count = await prisma.userBlock.count({
    where: {
      OR: [
        { blockerId: userA, blockedId: userB },
        { blockerId: userB, blockedId: userA },
      ],
    },
  });
  return count > 0;
}

/** Quem a pessoa já bloqueou (para marcar conversas na Inbox). */
export async function listBlockedIds(blockerId: string): Promise<Set<string>> {
  const rows = await prisma.userBlock.findMany({ where: { blockerId }, select: { blockedId: true } });
  return new Set(rows.map((row) => row.blockedId));
}
