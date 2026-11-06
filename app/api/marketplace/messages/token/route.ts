import { NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { generateAblyClientToken } from '@/lib/ably';

export async function GET() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = await generateAblyClientToken(session.user.id);

  if (!token) {
    return NextResponse.json({ error: 'Ably não configurado.' }, { status: 501 });
  }

  return NextResponse.json({ token });
}