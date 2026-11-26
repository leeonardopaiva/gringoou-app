import 'server-only';

import { InviteStatus, WaitlistStatus, type Prisma } from '@prisma/client';
import { sendAccessGrantedEmail } from '@/lib/access-email';
import { createInvite, revokeInvite } from '@/lib/invites';
import { prisma } from '@/lib/prisma';

/**
 * Liberação de acesso em lote para a lista de espera.
 *
 * Para cada pessoa: reserva a entrada (evita e-mail duplicado se o admin clicar duas vezes), cria
 * um convite de uso único preso ao e-mail dela e envia o e-mail com o link. Se o envio falhar, o
 * convite é revogado e a pessoa volta para "aguardando", pronta para o próximo lote. O código do
 * convite só existe em texto puro neste momento (o banco guarda só o hash), por isso o reenvio
 * sempre gera um convite novo e revoga o anterior.
 */

export const RELEASE_MAX_PER_CALL = 50;
const INVITE_VALID_DAYS = 30;
const CONCURRENCY = 5;
const RESEND_MIN_INTERVAL_MS = 30 * 1000;

export type ReleaseInput = {
  adminId: string;
  /** Quantas pessoas liberar nesta chamada (1 a RELEASE_MAX_PER_CALL). */
  limit: number;
  /** Nome do país como gravado na lista; "__none__" = sem país informado. */
  country?: string | null;
  /** Pessoas específicas (inclui reenvio para quem já foi convidado). Ignora o filtro de país. */
  entryIds?: string[];
  /** Só conta quantas seriam liberadas, sem criar convite nem enviar e-mail. */
  dryRun?: boolean;
};

export type ReleaseResult = {
  /** Total de pessoas elegíveis (antes do limite da chamada). */
  eligible: number;
  sent: number;
  failed: number;
  skipped: number;
  /** Aguardando depois desta chamada (para o admin saber se há mais lotes). */
  remainingPending: number;
  failures: Array<{ email: string; error: string }>;
};

const buildWhere = (input: Pick<ReleaseInput, 'country' | 'entryIds'>): Prisma.WaitlistEntryWhereInput => {
  if (input.entryIds?.length) {
    return { id: { in: input.entryIds }, status: { in: [WaitlistStatus.PENDING, WaitlistStatus.INVITED] } };
  }
  return {
    status: WaitlistStatus.PENDING,
    ...(input.country ? { country: input.country === '__none__' ? null : input.country } : {}),
  };
};

const shortError = (error: unknown) => (error instanceof Error ? error.message : String(error)).slice(0, 200);

type Entry = { id: string; email: string; name: string | null; status: WaitlistStatus };

async function releaseOne(entry: Entry, adminId: string): Promise<'sent' | 'skipped' | { error: string }> {
  const wasPending = entry.status === WaitlistStatus.PENDING;

  // Reserva atômica: se outra chamada já pegou esta pessoa, não envia de novo.
  const claimed = await prisma.waitlistEntry.updateMany({
    where: wasPending
      ? { id: entry.id, status: WaitlistStatus.PENDING }
      : { id: entry.id, status: WaitlistStatus.INVITED, updatedAt: { lt: new Date(Date.now() - RESEND_MIN_INTERVAL_MS) } },
    data: wasPending ? { status: WaitlistStatus.INVITED, invitedAt: new Date(), accessEmailError: null } : { accessEmailError: null },
  });
  if (claimed.count === 0) return 'skipped';

  // Reenvio: o convite anterior (cujo código não dá para recuperar) deixa de valer.
  if (!wasPending) {
    await prisma.invite.updateMany({
      where: { waitlistEntryId: entry.id, status: InviteStatus.ACTIVE },
      data: { status: InviteStatus.REVOKED, revokedAt: new Date(), revokedById: adminId },
    });
  }

  let inviteId: string | null = null;
  try {
    const expiresAt = new Date(Date.now() + INVITE_VALID_DAYS * 24 * 60 * 60 * 1000);
    const invite = await createInvite({ email: entry.email, usageLimit: 1, expiresAt, waitlistEntryId: entry.id, createdById: adminId });
    inviteId = invite.id;

    await sendAccessGrantedEmail({ to: entry.email, name: entry.name, code: invite.code, expiresAt });

    await prisma.waitlistEntry.update({ where: { id: entry.id }, data: { accessEmailSentAt: new Date(), accessEmailError: null } });
    return 'sent';
  } catch (error) {
    const message = shortError(error);
    console.error('[waitlist-release] falha ao liberar acesso', { entryId: entry.id, message });
    if (inviteId) await revokeInvite(inviteId, adminId).catch(() => undefined);
    await prisma.waitlistEntry
      .update({
        where: { id: entry.id },
        data: {
          accessEmailError: message,
          // Quem nunca recebeu volta para a fila; quem já tinha convite anterior continua "convidado".
          ...(wasPending ? { status: WaitlistStatus.PENDING, invitedAt: null } : {}),
        },
      })
      .catch(() => undefined);
    return { error: message };
  }
}

export async function releaseWaitlistAccess(input: ReleaseInput): Promise<ReleaseResult> {
  const where = buildWhere(input);
  const limit = Math.max(1, Math.min(RELEASE_MAX_PER_CALL, Math.floor(input.limit)));
  const eligible = await prisma.waitlistEntry.count({ where });

  const countPending = () => prisma.waitlistEntry.count({ where: { status: WaitlistStatus.PENDING } });

  if (input.dryRun) {
    return { eligible, sent: 0, failed: 0, skipped: 0, remainingPending: await countPending(), failures: [] };
  }

  const entries = await prisma.waitlistEntry.findMany({
    where,
    orderBy: { createdAt: 'asc' },
    take: limit,
    select: { id: true, email: true, name: true, status: true },
  });

  const result: ReleaseResult = { eligible, sent: 0, failed: 0, skipped: 0, remainingPending: 0, failures: [] };

  for (let index = 0; index < entries.length; index += CONCURRENCY) {
    const chunk = entries.slice(index, index + CONCURRENCY);
    const outcomes = await Promise.all(chunk.map((entry) => releaseOne(entry, input.adminId)));
    outcomes.forEach((outcome, position) => {
      if (outcome === 'sent') result.sent += 1;
      else if (outcome === 'skipped') result.skipped += 1;
      else {
        result.failed += 1;
        if (result.failures.length < 10) result.failures.push({ email: chunk[position].email, error: outcome.error });
      }
    });
  }

  result.remainingPending = await countPending();
  return result;
}
