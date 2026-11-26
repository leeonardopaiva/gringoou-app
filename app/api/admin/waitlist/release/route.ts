import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isDevAuthEnabled } from '@/lib/dev-magic-links';
import { isEmailServerConfigured } from '@/lib/email-auth';
import { consumeRateLimit } from '@/lib/rate-limit';
import { requireAdminSession } from '@/lib/require-admin';
import { RELEASE_MAX_PER_CALL, releaseWaitlistAccess } from '@/lib/waitlist-release';

export const runtime = 'nodejs';
export const maxDuration = 60;

const releaseSchema = z.object({
  limit: z.coerce.number().int().min(1).max(RELEASE_MAX_PER_CALL).default(RELEASE_MAX_PER_CALL),
  country: z.string().trim().max(60).optional().nullable(),
  entryIds: z.array(z.string().trim().min(1)).max(RELEASE_MAX_PER_CALL).optional(),
  dryRun: z.boolean().optional(),
});

/**
 * Libera o acesso de quem está na lista de espera e envia o e-mail com o convite.
 * Cada chamada processa no máximo RELEASE_MAX_PER_CALL pessoas; o painel repete até acabar o lote.
 */
export async function POST(request: Request) {
  const { session, response } = await requireAdminSession();
  if (response || !session) return response;

  const parsed = releaseSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 });
  }
  const input = parsed.data;

  if (!input.dryRun) {
    if (!isEmailServerConfigured && !isDevAuthEnabled) {
      return NextResponse.json({ error: 'O envio de e-mail não está configurado neste ambiente.' }, { status: 503 });
    }

    // Each call can send dozens of e-mails: caps abuse of a compromised admin session.
    const limit = await consumeRateLimit({
      scope: 'admin:waitlist-release',
      key: `admin:${session.user.id}`,
      max: 200,
      windowMs: 60 * 60 * 1000,
    });
    if (!limit.allowed) {
      return NextResponse.json({ error: 'Muitos envios em pouco tempo. Aguarde alguns minutos.' }, { status: 429 });
    }
  }

  const result = await releaseWaitlistAccess({
    adminId: session.user.id,
    limit: input.limit,
    country: input.country,
    entryIds: input.entryIds,
    dryRun: input.dryRun,
  });

  return NextResponse.json(result);
}
