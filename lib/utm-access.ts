import { UserRole } from '@prisma/client';
import { NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * Quem gerencia UTM: administradores (sempre) e usuários com a permissão `canManageUtm`
 * (ex.: agência/gestor de marketing), concedida por um administrador.
 */
export async function requireUtmManager() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return { userId: null, isAdmin: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true, canManageUtm: true } });
  const isAdmin = user?.role === UserRole.ADMIN;
  if (!isAdmin && !user?.canManageUtm) {
    return { userId: null, isAdmin: false, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { userId: session.user.id, isAdmin, response: null };
}
