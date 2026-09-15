import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { findRegionByKey } from '@/lib/region-store';
import { requireAdminSession } from '@/lib/require-admin';
import { validateUsernameValue } from '@/lib/username';
import { adminUserSchema } from '@/lib/validators';
import { deleteUserSafely, getUserDeletionImpact } from '@/lib/user-deletion';

type RouteContext = {
  params: Promise<{
    userId: string;
  }>;
};

const deleteUserSchema = z.object({
  confirmation: z.string().trim().min(1),
  transferToUserId: z.string().cuid().optional(),
  deleteOwnedContent: z.boolean().default(false),
});

export async function GET(_request: Request, context: RouteContext) {
  const { response } = await requireAdminSession();
  if (response) return response;
  const { userId } = await context.params;
  const [impact, transferCandidates] = await Promise.all([
    getUserDeletionImpact(userId),
    prisma.user.findMany({
      where: { id: { not: userId } },
      orderBy: [{ name: 'asc' }, { email: 'asc' }],
      take: 200,
      select: { id: true, name: true, username: true, email: true },
    }),
  ]);
  return impact
    ? NextResponse.json({ impact, transferCandidates })
    : NextResponse.json({ error: 'Usuario nao encontrado.' }, { status: 404 });
}

export async function PUT(request: Request, context: RouteContext) {
  const { session, response } = await requireAdminSession();

  if (response) {
    return response;
  }

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = adminUserSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Dados invalidos do usuario.' },
      { status: 400 },
    );
  }

  const { userId } = await context.params;
  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
    },
  });

  if (!targetUser) {
    return NextResponse.json({ error: 'Usuario nao encontrado.' }, { status: 404 });
  }

  if (userId === session.user.id && parsed.data.role !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Voce nao pode remover sua propria permissao de administrador.' },
      { status: 400 },
    );
  }

  if (targetUser.role === 'ADMIN' && parsed.data.role !== 'ADMIN') {
    const adminCount = await prisma.user.count({
      where: {
        role: 'ADMIN',
      },
    });

    if (adminCount <= 1) {
      return NextResponse.json(
        { error: 'Nao e permitido rebaixar o ultimo administrador da plataforma.' },
        { status: 400 },
      );
    }
  }

  const region = await findRegionByKey(parsed.data.regionKey);

  if (!region) {
    return NextResponse.json({ error: 'Regiao invalida.' }, { status: 400 });
  }

  const usernameValidation = validateUsernameValue(parsed.data.username);

  if (usernameValidation.error) {
    return NextResponse.json({ error: usernameValidation.error }, { status: 400 });
  }

  const existingUser = await prisma.user.findFirst({
    where: {
      username: usernameValidation.normalized,
      NOT: {
        id: userId,
      },
    },
    select: {
      id: true,
    },
  });

  if (existingUser) {
    return NextResponse.json({ error: 'Esse nome publico ja esta em uso.' }, { status: 409 });
  }

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        name: parsed.data.name,
        username: usernameValidation.normalized,
        email: parsed.data.email,
        phone: parsed.data.phone,
        image: parsed.data.image ?? null,
        role: parsed.data.role,
        locationLabel: region.label,
        regionKey: region.key,
        onboardingCompleted: parsed.data.onboardingCompleted,
      },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        phone: true,
        role: true,
        locationLabel: true,
        regionKey: true,
        onboardingCompleted: true,
        image: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ user });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      return NextResponse.json({ error: 'Usuario nao encontrado.' }, { status: 404 });
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return NextResponse.json(
        { error: 'Email ou nome publico ja esta em uso.' },
        { status: 409 },
      );
    }

    throw error;
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const { session, response } = await requireAdminSession();

  if (response) {
    return response;
  }

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { userId } = await context.params;

  if (userId === session.user.id) {
    return NextResponse.json(
      { error: 'Voce nao pode excluir a propria conta de administrador.' },
      { status: 400 },
    );
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
    },
  });

  if (!targetUser) {
    return NextResponse.json({ error: 'Usuario nao encontrado.' }, { status: 404 });
  }

  if (targetUser.role === 'ADMIN') {
    const adminCount = await prisma.user.count({
      where: {
        role: 'ADMIN',
      },
    });

    if (adminCount <= 1) {
      return NextResponse.json(
        { error: 'Nao e permitido excluir o ultimo administrador da plataforma.' },
        { status: 400 },
      );
    }
  }

  const parsed = deleteUserSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Revise a confirmacao e as opcoes de exclusao.' }, { status: 400 });
  }

  const impact = await getUserDeletionImpact(userId);
  if (!impact) return NextResponse.json({ error: 'Usuario nao encontrado.' }, { status: 404 });
  if (parsed.data.confirmation !== impact.confirmationValue) {
    return NextResponse.json({ error: 'A confirmacao digitada nao corresponde ao usuario.' }, { status: 400 });
  }

  try {
    const deletion = await deleteUserSafely({
      userId,
      transferToUserId: parsed.data.transferToUserId,
      deleteOwnedContent: parsed.data.deleteOwnedContent,
    });
    console.info('Admin user deletion completed', {
      actorUserId: session.user.id,
      deletedUserId: userId,
      transferToUserId: parsed.data.transferToUserId ?? null,
      transferredResources: deletion.transferredResources,
      anonymizedRecords: deletion.anonymizedRecords,
    });

    return NextResponse.json({ success: true, deletion });
  } catch (error) {
    if (error instanceof Error) {
      const errors: Record<string, { message: string; status: number }> = {
        USER_NOT_FOUND: { message: 'Usuario nao encontrado.', status: 404 },
        INVALID_TRANSFER_TARGET: { message: 'Selecione outro usuario para receber os dados.', status: 400 },
        TRANSFER_TARGET_NOT_FOUND: { message: 'O usuario selecionado para transferencia nao existe.', status: 400 },
        TRANSFER_ACCOUNT_LIMIT: { message: 'O usuario selecionado ultrapassaria o limite de contas Ads. Escolha outro responsavel.', status: 409 },
        AD_ACCOUNT_TRANSFER_REQUIRED: { message: 'A conta Ads ficaria sem responsavel. Selecione um usuario para transferencia.', status: 409 },
        DATA_LOSS_ACKNOWLEDGEMENT_REQUIRED: { message: 'Confirme que os conteudos vinculados podem ser excluidos.', status: 409 },
      };
      const mapped = errors[error.message];
      if (mapped) return NextResponse.json({ error: mapped.message }, { status: mapped.status });
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      return NextResponse.json({ error: 'Usuario nao encontrado.' }, { status: 404 });
    }

    throw error;
  }
}
