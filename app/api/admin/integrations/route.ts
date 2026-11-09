import { NextResponse } from 'next/server';
import { requireRootSession } from '@/lib/root-admin';
import { getIntegrationStates } from '@/lib/integrations';

export const runtime = 'nodejs';

/** Estado das integrações externas (apenas administradores; só nomes de variáveis, nunca valores). */
export async function GET() {
  const { response } = await requireRootSession();
  if (response) return response;
  return NextResponse.json({ integrations: getIntegrationStates() });
}
