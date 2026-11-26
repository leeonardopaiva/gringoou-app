import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAdminSession } from '@/lib/require-admin';
import { deleteUserSafely, getUserDeletionImpact } from '@/lib/user-deletion';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_PER_REQUEST = 50;

const bulkSchema = z.object({
  userIds: z.array(z.string().cuid()).min(1).max(MAX_PER_REQUEST),
  transferToUserId: z.string().cuid().optional(),
  deleteOwnedContent: z.boolean().default(false),
  /** Texto digitado pelo admin: "EXCLUIR <quantidade>". */
  confirmation: z.string().trim().optional(),
  /** Só analisa o impacto, sem excluir nada. */
  dryRun: z.boolean().optional(),
});

const ERRORS: Record<string, string> = {
  USER_NOT_FOUND: 'Usuário não encontrado.',
  INVALID_TRANSFER_TARGET: 'O responsável pela transferência não pode ser um dos excluídos.',
  TRANSFER_TARGET_NOT_FOUND: 'O usuário escolhido para receber os dados não existe.',
  TRANSFER_ACCOUNT_LIMIT: 'O responsável escolhido ultrapassaria o limite de contas Ads.',
  AD_ACCOUNT_TRANSFER_REQUIRED: 'Tem conta Ads que ficaria sem responsável: escolha quem vai receber.',
  DATA_LOSS_ACKNOWLEDGEMENT_REQUIRED: 'Confirme que os conteúdos vinculados podem ser excluídos.',
};

/**
 * Exclusão de vários usuários de uma vez, com a mesma proteção da exclusão individual
 * (lib/user-deletion.ts): cada usuário é excluído em sua própria transação e o resultado vem por
 * pessoa, então uma falha não desfaz as outras. Os dados vinculados podem ser transferidos para
 * um único responsável.
 */
export async function POST(request: Request) {
  const { session, response } = await requireAdminSession();
  if (response) return response;
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Sua sessão expirou. Entre novamente para continuar.' }, { status: 401 });
  }

  const parsed = bulkSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: `Selecione de 1 a ${MAX_PER_REQUEST} usuários e revise as opções.` }, { status: 400 });
  }
  const input = parsed.data;
  const ids = Array.from(new Set(input.userIds));

  if (ids.includes(session.user.id)) {
    return NextResponse.json({ error: 'Você não pode excluir a própria conta. Tire você da seleção.' }, { status: 400 });
  }
  if (input.transferToUserId && ids.includes(input.transferToUserId)) {
    return NextResponse.json({ error: 'Quem recebe os dados não pode estar entre os usuários excluídos.' }, { status: 400 });
  }

  const users = await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, username: true, email: true, role: true } });
  if (users.length === 0) return NextResponse.json({ error: 'Nenhum dos usuários selecionados foi encontrado.' }, { status: 404 });

  // Nunca deixa a plataforma sem administrador.
  const adminsLeft = await prisma.user.count({ where: { role: 'ADMIN', id: { notIn: ids } } });
  if (adminsLeft < 1) {
    return NextResponse.json({ error: 'A seleção removeria todos os administradores. Mantenha pelo menos um.' }, { status: 400 });
  }

  const label = (user: { name: string | null; username: string | null; email: string | null; id: string }) => user.name || user.email || user.username || user.id;

  if (input.dryRun) {
    const impacts = await Promise.all(
      users.map(async (user) => {
        const impact = await getUserDeletionImpact(user.id);
        const records = impact ? Object.values(impact.counts).reduce((total, count) => total + count, 0) : 0;
        return { id: user.id, label: label(user), email: user.email, role: user.role, records, requiresAdAccountTransfer: Boolean(impact?.requiresAdAccountTransfer) };
      }),
    );
    const transferCandidates = await prisma.user.findMany({
      where: { id: { notIn: ids } },
      orderBy: [{ name: 'asc' }, { email: 'asc' }],
      take: 200,
      select: { id: true, name: true, username: true, email: true },
    });
    return NextResponse.json({ impacts, transferCandidates });
  }

  if (input.confirmation !== `EXCLUIR ${users.length}`) {
    return NextResponse.json({ error: `Digite EXCLUIR ${users.length} para confirmar.` }, { status: 400 });
  }

  const results: Array<{ id: string; label: string; ok: boolean; error?: string }> = [];
  for (const user of users) {
    try {
      await deleteUserSafely({ userId: user.id, transferToUserId: input.transferToUserId, deleteOwnedContent: input.deleteOwnedContent });
      results.push({ id: user.id, label: label(user), ok: true });
    } catch (error) {
      const code = error instanceof Error ? error.message : '';
      if (!ERRORS[code]) console.error('Bulk user deletion failed', { userId: user.id, error });
      results.push({ id: user.id, label: label(user), ok: false, error: ERRORS[code] ?? 'Não foi possível excluir este usuário.' });
    }
  }

  console.info('Admin bulk user deletion completed', {
    actorUserId: session.user.id,
    requested: ids.length,
    deleted: results.filter((item) => item.ok).length,
    failed: results.filter((item) => !item.ok).length,
    transferToUserId: input.transferToUserId ?? null,
  });

  return NextResponse.json({ results, deleted: results.filter((item) => item.ok).length, failed: results.filter((item) => !item.ok).length });
}
