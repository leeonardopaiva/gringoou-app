import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAdminSession } from '@/lib/require-admin';

export const runtime = 'nodejs';

/** Concessão da permissão "Gerenciar UTM": somente administradores. */
export async function GET() {
  const { response } = await requireAdminSession();
  if (response) return response;
  const users = await prisma.user.findMany({
    where: { canManageUtm: true },
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: 'asc' },
  });
  return NextResponse.json({ managers: users });
}

const grantSchema = z.object({ email: z.string().trim().email('Informe um e-mail válido.') });

export async function POST(request: Request) {
  const { response } = await requireAdminSession();
  if (response) return response;
  const parsed = grantSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }, { status: 400 });
  const user = await prisma.user.findFirst({ where: { email: { equals: parsed.data.email, mode: 'insensitive' } }, select: { id: true } });
  if (!user) return NextResponse.json({ error: 'Nenhum usuário encontrado com esse e-mail.' }, { status: 404 });
  await prisma.user.update({ where: { id: user.id }, data: { canManageUtm: true } });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const { response } = await requireAdminSession();
  if (response) return response;
  const userId = new URL(request.url).searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'Usuário inválido.' }, { status: 400 });
  await prisma.user.update({ where: { id: userId }, data: { canManageUtm: false } });
  return NextResponse.json({ ok: true });
}
