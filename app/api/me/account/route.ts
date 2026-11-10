import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerAuthSession } from '@/lib/auth';
import { buildRateLimitHeaders, consumeRateLimit, getRateLimitKey } from '@/lib/rate-limit';
import { deleteUserSafely, getUserDeletionImpact } from '@/lib/user-deletion';

export const runtime = 'nodejs';

const deleteSchema = z.object({
  /** O usuário precisa digitar o @username (ou e-mail, se não tiver username) para confirmar. */
  confirmation: z.string().trim().min(1).max(200),
});

const normalize = (value: string) => value.trim().replace(/^@/, '').toLowerCase();

/** Exclusão da própria conta (LGPD, art. 18, VI). Conteúdo próprio é removido; registros financeiros e de auditoria ficam anonimizados. */
export async function DELETE(request: Request) {
  const session = await getServerAuthSession();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rateLimit = await consumeRateLimit({
    scope: 'me:delete-account',
    key: getRateLimitKey(request, userId),
    max: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Muitas tentativas. Tente novamente mais tarde.' },
      { status: 429, headers: buildRateLimitHeaders(rateLimit) },
    );
  }

  const parsed = deleteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Digite seu nome de usuario para confirmar.' }, { status: 400 });
  }

  const impact = await getUserDeletionImpact(userId);
  if (!impact) return NextResponse.json({ error: 'Usuario nao encontrado.' }, { status: 404 });

  // Administradores são removidos por outro administrador (evita ficar sem ninguém no comando).
  if (impact.user.role === 'ADMIN') {
    return NextResponse.json(
      { error: 'Contas de administrador devem ser removidas por outro administrador.' },
      { status: 403 },
    );
  }

  if (normalize(parsed.data.confirmation) !== normalize(impact.confirmationValue)) {
    return NextResponse.json({ error: 'A confirmacao digitada nao corresponde a sua conta.' }, { status: 400 });
  }

  // Conta de anúncios que ficaria sem responsável: o usuário precisa transferir antes.
  if (impact.requiresAdAccountTransfer) {
    return NextResponse.json(
      { error: 'Voce e o unico responsavel por uma conta de anuncios. Transfira ou encerre a conta de anuncios antes de excluir seu perfil.' },
      { status: 409 },
    );
  }

  try {
    const deletion = await deleteUserSafely({ userId, deleteOwnedContent: true });
    console.info('Self account deletion completed', { deletedUserId: userId, anonymizedRecords: deletion.anonymizedRecords });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ error: 'Usuario nao encontrado.' }, { status: 404 });
    }
    if (error instanceof Error && error.message === 'AD_ACCOUNT_TRANSFER_REQUIRED') {
      return NextResponse.json({ error: 'Transfira sua conta de anuncios antes de excluir o perfil.' }, { status: 409 });
    }
    throw error;
  }
}
