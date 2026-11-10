import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Readiness: confirma que o banco responde. Use em monitor externo (UptimeRobot, Better Stack).
 * Não expõe detalhes do erro; o motivo real vai para o log/Sentry.
 */
export async function GET() {
  const startedAt = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json(
      { status: 'ok', database: 'ok', latencyMs: Date.now() - startedAt },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    console.error('Readiness check failed', error);
    return NextResponse.json(
      { status: 'degraded', database: 'unavailable' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
