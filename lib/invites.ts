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
    return { ok: false, error: 'Informe o código do convite.' };
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
    return { ok: false, error: 'Código de convite inválido.' };
  }

  if (invite.status === InviteStatus.REVOKED) {
    return { ok: false, error: 'Este convite foi revogado.' };
  }

  if (invite.status === InviteStatus.USED) {
    return { ok: false, error: 'Este convite já foi utilizado.' };
  }

  if (invite.expiresAt && invite.expiresAt < new Date()) {
    return { ok: false, error: 'Este convite expirou.' };
  }

  if (invite.usedCount >= invite.usageLimit) {
    return { ok: false, error: 'Este convite atingiu o limite de usos.' };
  }

  if (invite.email && email && invite.email.toLowerCase() !== email.toLowerCase()) {
    return { ok: false, error: 'Este convite está vinculado a outro email.' };
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
    return { ok: false, error: 'Informe o código do convite.' };
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

  if (!invite) return { ok: false, error: 'Código de convite inválido.' };
  if (invite.status === InviteStatus.REVOKED) return { ok: false, error: 'Este convite foi revogado.' };
  if (invite.status === InviteStatus.USED) return { ok: false, error: 'Este convite já foi utilizado.' };
  if (invite.expiresAt && invite.expiresAt < new Date()) return { ok: false, error: 'Este convite expirou.' };
  if (invite.usedCount >= invite.usageLimit) return { ok: false, error: 'Este convite atingiu o limite de usos.' };
  if (invite.email && invite.email.toLowerCase() !== email.toLowerCase()) {
    return { ok: false, error: 'Este convite está vinculado a outro email.' };
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
    return { ok: false, error: 'Este convite não pode ser utilizado agora.' };
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
    return { ok: false, error: 'Não foi possível validar o convite agora.' };
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

const buildInviteWhere = (filters: { search?: string | null; status?: InviteStatus | null }) => ({
  ...(filters.status ? { status: filters.status } : {}),
  ...(filters.search
    ? { email: { contains: filters.search.toLowerCase(), mode: 'insensitive' as const } }
    : {}),
});

export async function listInvites(filters: InviteListFilters) {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, filters.pageSize ?? 20));

  const where = buildInviteWhere(filters);

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

  const numbers = await sequenceNumbers('Invite', invites.map((invite) => invite.id));

  return {
    invites: invites.map((invite) => ({ ...invite, number: numbers.get(invite.id) ?? null })),
    total,
    page,
    pageSize,
  };
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
  /** Nome do país como gravado na lista; "__none__" filtra quem não informou. */
  country?: string | null;
  page?: number;
  pageSize?: number;
};

const buildWaitlistWhere = (filters: { search?: string | null; status?: WaitlistStatus | null; country?: string | null }) => ({
  ...(filters.status ? { status: filters.status } : {}),
  ...(filters.country ? { country: filters.country === '__none__' ? null : filters.country } : {}),
  ...(filters.search
    ? {
        OR: [
          { email: { contains: filters.search.toLowerCase(), mode: 'insensitive' as const } },
          { name: { contains: filters.search, mode: 'insensitive' as const } },
        ],
      }
    : {}),
});

export async function listWaitlistEntries(filters: WaitlistListFilters) {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, filters.pageSize ?? 20));

  const where = buildWaitlistWhere(filters);

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

  const numbers = await sequenceNumbers('WaitlistEntry', entries.map((entry) => entry.id));
  const countries = await listWaitlistCountries();

  return {
    entries: entries.map((entry) => ({ ...entry, number: numbers.get(entry.id) ?? null })),
    total,
    page,
    pageSize,
    countries,
    // Total da lista inteira, para comparar com o total dos filtros atuais.
    overallTotal: countries.reduce((sum, item) => sum + item.count, 0),
  };
}
/**
 * Número sequencial estável de cada registro (1 = o mais antigo), independente de filtros e
 * páginas. Serve como código de referência nas tabelas e no CSV, já que o código do convite
 * em si só existe como hash.
 */
async function sequenceNumbers(table: 'WaitlistEntry' | 'Invite', ids: string[]): Promise<Map<string, number>> {
  if (ids.length === 0) return new Map();

  const rows = await prisma.$queryRaw<Array<{ id: string; rn: bigint }>>(
    Prisma.sql`
      SELECT id, rn FROM (
        SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt" ASC, id ASC) AS rn
        FROM ${Prisma.raw(`"${table}"`)}
      ) numbered
      WHERE id IN (${Prisma.join(ids)})
    `,
  );

  return new Map(rows.map((row) => [row.id, Number(row.rn)]));
}

/** Países presentes na lista de interesse, com a quantidade de pessoas em cada um. */
export async function listWaitlistCountries() {
  const groups = await prisma.waitlistEntry.groupBy({
    by: ['country'],
    _count: { _all: true },
    orderBy: { _count: { country: 'desc' } },
  });

  return groups.map((group) => ({ country: group.country, count: group._count._all }));
}

const CSV_SEPARATOR = ';';

// Células que começam com estes caracteres viram fórmulas no Excel/Sheets; o apóstrofo impede.
const csvCell = (value: string | number | null | undefined) => {
  const text = value === null || value === undefined ? '' : String(value);
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return /[";\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

const toCsv = (header: string[], rows: Array<Array<string | number | null | undefined>>) =>
  // BOM para o Excel abrir em UTF-8 (acentos) e ponto e vírgula, o separador padrão no Brasil.
  `\uFEFF${[header, ...rows].map((row) => row.map(csvCell).join(CSV_SEPARATOR)).join('\r\n')}\r\n`;

const csvDate = (value: Date | null) => (value ? value.toISOString() : '');

export async function exportWaitlistCsv(filters: {
  search?: string | null;
  status?: WaitlistStatus | null;
  country?: string | null;
}) {
  const where = buildWaitlistWhere(filters);
  const entries = await prisma.waitlistEntry.findMany({
    where,
    orderBy: { createdAt: 'asc' },
    select: { id: true, email: true, name: true, country: true, status: true, invitedAt: true, createdAt: true },
  });
  const numbers = await sequenceNumbers('WaitlistEntry', entries.map((entry) => entry.id));

  return {
    total: entries.length,
    csv: toCsv(
      ['Nº', 'Nome', 'E-mail', 'País', 'Status', 'Convidado em', 'Cadastrado em'],
      entries.map((entry) => [
        numbers.get(entry.id) ?? '',
        entry.name,
        entry.email,
        entry.country,
        entry.status,
        csvDate(entry.invitedAt),
        csvDate(entry.createdAt),
      ]),
    ),
  };
}

export async function exportInvitesCsv(filters: { search?: string | null; status?: InviteStatus | null }) {
  const invites = await prisma.invite.findMany({
    where: buildInviteWhere(filters),
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      status: true,
      email: true,
      usageLimit: true,
      usedCount: true,
      expiresAt: true,
      createdAt: true,
      waitlistEntry: { select: { email: true, name: true, country: true } },
    },
  });
  const numbers = await sequenceNumbers('Invite', invites.map((invite) => invite.id));

  return {
    total: invites.length,
    csv: toCsv(
      ['Nº', 'E-mail do convite', 'Status', 'Usos', 'Limite de usos', 'Lista de interesse (nome)', 'Lista de interesse (e-mail)', 'País', 'Criado em', 'Expira em'],
      invites.map((invite) => [
        numbers.get(invite.id) ?? '',
        invite.email,
        invite.status,
        invite.usedCount,
        invite.usageLimit,
        invite.waitlistEntry?.name,
        invite.waitlistEntry?.email,
        invite.waitlistEntry?.country,
        csvDate(invite.createdAt),
        csvDate(invite.expiresAt),
      ]),
    ),
  };
}
