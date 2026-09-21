import { UserRole } from '@prisma/client';
import { NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { getStoredUserRole } from '@/lib/admin';

export async function requireModerationSession() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) return { session: null, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  const role = await getStoredUserRole(session.user.id);
  if (role !== UserRole.ADMIN && role !== UserRole.MODERATOR) return { session: null, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  return { session: { ...session, user: { ...session.user, role } }, response: null };
}
