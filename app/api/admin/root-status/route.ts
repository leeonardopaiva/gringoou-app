import { NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { isRootAdminEmail } from '@/lib/root-admin';

export const runtime = 'nodejs';

/** Diz se a sessão atual é de administrador raiz (e-mail em ROOT_ADMIN_EMAILS). */
export async function GET() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) return NextResponse.json({ root: false }, { status: 401 });
  return NextResponse.json({ root: isRootAdminEmail(session.user.email) });
}
