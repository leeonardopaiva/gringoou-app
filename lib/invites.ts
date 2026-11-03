import 'server-only';

import { createHash, randomBytes } from 'node:crypto';
import { InviteStatus, Prisma, WaitlistStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { isOperationalFeatureEnabled } from '@/lib/operational-flags';

/**
 * Sistema de convites do Private Beta.
 *
 * Segurança:
 * - Códigos gerados com `randomBytes` (criptograficamente seguros).
 * - Apenas o hash SHA-256 do código é persistido; o texto puro nunca é salvo.
 * - Consumo atômico via transação com `updateMany` condicional para evitar
 *   estouro de limite em requisições concorrentes.
 * - Códigos/hashes nunca são expostos em logs.
 */

export const INVITE_CODE_LENGTH = 12;

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem caracteres ambíguos

export const isInviteOnlyRegistration = () =>
  isOperationalFeatureEnabled('privateBeta') && isOperationalFeatureEnabled('inviteOnlyRegistration');

export const generateInviteCode = (): string => {
  const bytes = randomBytes(INVITE_CODE_LENGTH);
  let code = '';
  for (let index = 0; index < INVITE_CODE_LENGTH; index += 1) {
    code += CODE_ALPHABET[bytes[index] % CODE_ALPHABET.length];
  }
  return code;
};

export const hashInviteCode = (code: string): string =>
  createHash('sha256').update(code.trim().toUpperCase()).digest('hex');

export type InviteValidationResult =
  | { ok: true; inviteId: string }
  | { ok: false; error: string };

/**
 * Valida um código sem consumi-lo. Usado para feedback imediato no cadastro.
 */
export async function validateInvite(
  code: string,
  email?: string | null,
): Promise<InviteValidationResult> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) {
    return { ok: false, error: 'Informe o codigo do convite.' };
  }

  const invite = await prisma.invite.findUnique({
    where: { codeHash: hashInviteCode(normalized) },
    select: {
      id: true,
      status: true,
      email: true,
      usageLimit: true,
      usedCount: true,
      expiresAt: true,
    },
  });

  if (!invite) {
    return { ok: false, error: 'Codigo de convite invalido.' };
  }

  if (invite.status === InviteStatus.REVOKED) {
    return { ok: false, error: 'Este convite foi revogado.' };
  }

  if (invite.status === InviteStatus.USED) {
    return { ok: false, error: 'Este convite ja foi utilizado.' };
  }

  if (invite.expiresAt && invite.expiresAt < new Date()) {
    return { ok: false, error: 'Este convite expirou.' };
  }

  if (invite.usedCount >= invite.usageLimit) {
    return { ok: false, error: 'Este convite atingiu o limite de usos.' };
  }

  if (invite.email && email && invite.email.toLowerCase() !== email.toLowerCase()) {
    return { ok: false, error: 'Este convite esta vinculado a outro email.' };
  }

  return { ok: true, inviteId: invite.id };
}

/**
 * Consome um convite de forma atômica dentro de uma transação fornecida.
 * Retorna false se o convite não puder ser consumido.
 */
export async function consumeInviteInTx(
  tx: Prisma.TransactionClient,
  code: string,
  email: string,
  userId: string,
): Promise<{ ok: boolean; error?: string }> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) {
    return { ok: false, error: 'Informe o codigo do convite.' };
  }

  const codeHash = hashInviteCode(normalized);

  const invite = await tx.invite.findUnique({
    where: { codeHash },
    select: {
      id: true,
      status: true,
      email: true,
      usageLimit: true,
      usedCount: true,
      expiresAt: true,
    },
  });

  if (!invite) return { ok: false, error: 'Codigo de convite invalido.' };
  if (invite.status === InviteStatus.REVOKED) return { ok: false, error: 'Este convite foi revogado.' };
  if (invite.status === InviteStatus.USED) return { ok: false, error: 'Este convite ja foi utilizado.' };
  if (invite.expiresAt && invite.expiresAt < new Date()) return { ok: false, error: 'Este convite expirou.' };
  if (invite.usedCount >= invite.usageLimit) return { ok: false, error: 'Este convite atingiu o limite de usos.' };
  if (invite.email && invite.email.toLowerCase() !== email.toLowerCase()) {
    return { ok: false, error: 'Este convite esta vinculado a outro email.' };
  }

  // Consumo atômico: só incrementa se ainda houver cota disponível.
  const updated = await tx.invite.updateMany({
    where: {
      id: invite.id,
      status: InviteStatus.ACTIVE,
      usedCount: { lt: invite.usageLimit },
      OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
    },
    data: { usedCount: { increment: 1 } },
  });

  if (updated.count === 0) {
    return { ok: false, error: 'Este convite nao pode ser utilizado agora.' };
  }

  await tx.inviteUsage.create({ data: { inviteId: invite.id, userId } });

  // Marca como USED quando atinge o limite.
  const after = await tx.invite.findUnique({ where: { id: invite.id }, select: { usedCount: true, usageLimit: true } });
  if (after && after.usedCount >= after.usageLimit) {
    await tx.invite.update({ where: { id: invite.id }, data: { status: InviteStatus.USED } });
  }

  // Atualiza a entrada da lista de espera, se houver.
  const inviteWithEntry = await tx.invite.findUnique({
    where: { id: invite.id },
    select: { waitlistEntryId: true },
  });
  if (inviteWithEntry?.waitlistEntryId) {
    await tx.waitlistEntry.update({
      where: { id: inviteWithEntry.waitlistEntryId },
      data: { status: WaitlistStatus.ACTIVE },
    });
  }

  return { ok: true };
}

/**
 * Consome um convite de forma atômica. Retorna false se o convite não puder
 * ser consumido (inválido, expirado, revogado ou limite atingido).
 */
export async function consumeInvite(
  code: string,
  email: string,
  userId: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    return await prisma.$transaction((tx) => consumeInviteInTx(tx, code, email, userId));
  } catch (error) {
    console.error('[invites] consumeInvite failed:', error);
    return { ok: false, error: 'Nao foi possivel validar o convite agora.' };
  }
}

export type CreateInviteInput = {
  email?: string | null;
  usageLimit?: number;
  expiresAt?: Date | null;
  waitlistEntryId?: string | null;
  createdById: string;
};

export type CreatedInvite = {
  id: string;
  code: string;
  email: string | null;
  usageLimit: number;
  expiresAt: Date | null;
  waitlistEntryId: string | null;
};

/**
 * Cria um convite e retorna o código em texto puro UMA única vez.
 */
export async function createInvite(input: CreateInviteInput): Promise<CreatedInvite> {
  const code = generateInviteCode();
  const usageLimit = Math.max(1, Math.min(100, input.usageLimit ?? 1));

  const invite = await prisma.invite.create({
    data: {
      codeHash: hashInviteCode(code),
      email: input.email?.trim().toLowerCase() || null,
      usageLimit,
      expiresAt: input.expiresAt ?? null,
      waitlistEntryId: input.waitlistEntryId ?? null,
      createdById: input.createdById,
    },
    select: {
      id: true,
      email: true,
      usageLimit: true,
      expiresAt: true,
      waitlistEntryId: true,
    },
  });

  if (input.waitlistEntryId) {
    await prisma.waitlistEntry.update({
      where: { id: input.waitlistEntryId },
      data: { status: WaitlistStatus.INVITED, invitedAt: new Date() },
    });
  }

  return { ...invite, code };
}

export async function revokeInvite(id: string, adminId: string): Promise<boolean> {
  const result = await prisma.invite.updateMany({
    where: { id, status: InviteStatus.ACTIVE },
    data: { status: InviteStatus.REVOKED, revokedAt: new Date(), revokedById: adminId },
  });
  return result.count > 0;
}

export type InviteListFilters = {
  search?: string | null;
  status?: InviteStatus | null;
  page?: number;
  pageSize?: number;
};

export async function listInvites(filters: InviteListFilters) {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, filters.pageSize ?? 20));

  const where = {
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.search
      ? { email: { contains: filters.search.toLowerCase(), mode: 'insensitive' as const } }
      : {}),
  };

  const [invites, total] = await Promise.all([
    prisma.invite.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        status: true,
        email: true,
        usageLimit: true,
        usedCount: true,
        expiresAt: true,
        revokedAt: true,
        createdAt: true,
        createdBy: { select: { id: true, name: true, email: true } },
        waitlistEntry: { select: { id: true, email: true, name: true, status: true } },
        _count: { select: { usages: true } },
      },
    }),
    prisma.invite.count({ where }),
  ]);

  return { invites, total, page, pageSize };
}

export async function getInvite(id: string) {
  return prisma.invite.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      email: true,
      usageLimit: true,
      usedCount: true,
      expiresAt: true,
      revokedAt: true,
      createdAt: true,
      createdBy: { select: { id: true, name: true, email: true } },
      revokedBy: { select: { id: true, name: true, email: true } },
      waitlistEntry: { select: { id: true, email: true, name: true, status: true } },
      usages: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          createdAt: true,
          user: { select: { id: true, name: true, email: true, username: true } },
        },
      },
    },
  });
}

export type WaitlistListFilters = {
  search?: string | null;
  status?: WaitlistStatus | null;
  page?: number;
  pageSize?: number;
};

export async function listWaitlistEntries(filters: WaitlistListFilters) {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, filters.pageSize ?? 20));

  const where = {
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.search
      ? {
          OR: [
            { email: { contains: filters.search.toLowerCase(), mode: 'insensitive' as const } },
            { name: { contains: filters.search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const [entries, total] = await Promise.all([
    prisma.waitlistEntry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        email: true,
        name: true,
        country: true,
        status: true,
        invitedAt: true,
        createdAt: true,
        invites: {
          select: { id: true, status: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    }),
    prisma.waitlistEntry.count({ where }),
  ]);

  return { entries, total, page, pageSize };
}