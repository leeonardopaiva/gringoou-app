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
    // Return a more graceful error that the client can handle
    return NextResponse.json({ error: 'Realtime não disponível', token: null }, { status: 503 });
  }

  return NextResponse.json({ token });
}