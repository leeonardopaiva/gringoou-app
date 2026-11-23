import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerAuthSession } from '@/lib/auth';
import { normalizeAuthEmail } from '@/lib/password-auth';
import { prisma } from '@/lib/prisma';

const userSettingsSchema = z.object({
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().email(),
  marketingEmailsOptOut: z.boolean(),
  preferredLanguage: z.enum(['pt-BR', 'en-US', 'es']),
});

export async function PATCH(request: Request) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  const parsed = userSettingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }, { status: 400 });
  try {
    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: `${parsed.data.firstName} ${parsed.data.lastName}`.trim(),
        email: normalizeAuthEmail(parsed.data.email),
        marketingEmailsOptOut: parsed.data.marketingEmailsOptOut,
        preferredLanguage: parsed.data.preferredLanguage,
      },
      select: { id: true, name: true, email: true, marketingEmailsOptOut: true, preferredLanguage: true },
    });
    return NextResponse.json({ user });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return NextResponse.json({ error: 'Este email já está em uso.' }, { status: 409 });
    throw error;
  }
}
