import { NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';

/**
 * Administrador raiz (desenvolvimento/dono do produto): definido apenas pela variável de ambiente
 * ROOT_ADMIN_EMAILS (um ou mais e-mails separados por vírgula). Os demais administradores usam o painel
 * normal e não enxergam Integrações, Planos e Cupons.
 */
const rootEmails = () =>
  (process.env.ROOT_ADMIN_EMAILS || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

export function isRootAdminEmail(email?: string | null) {
  return Boolean(email && rootEmails().includes(email.trim().toLowerCase()));
}

/** Para rotas de API: exige sessão válida com e-mail raiz; devolve a resposta de erro pronta. */
export async function requireRootSession() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) return { session: null, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  if (!isRootAdminEmail(session.user.email)) return { session: null, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  return { session, response: null };
}
