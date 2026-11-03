import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { buildRateLimitHeaders, consumeRateLimit, getRateLimitKey } from '@/lib/rate-limit';
import { validateUsernameValue } from '@/lib/username';
import { updateProfileSchema } from '@/lib/validators';
import { getProfileData } from '@/lib/server/profile';

export async function GET() {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = await getProfileData(session.user.id);
  if (!data) {
    return NextResponse.json({ error: 'Usuario nao encontrado.' }, { status: 404 });
  }
  return NextResponse.json(data);
}

export async function PUT(request: Request) {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rateLimit = await consumeRateLimit({
    scope: 'profile:update',
    key: getRateLimitKey(request, session.user.id),
    max: 8,
    windowMs: 10 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Muitas atualizacoes em pouco tempo. Tente novamente em alguns minutos.' },
      { status: 429, headers: buildRateLimitHeaders(rateLimit) },
    );
  }

  const body = await request.json();
  const parsed = updateProfileSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Dados invalidos do perfil.' },
      { status: 400 },
    );
  }

  const usernameValidation = validateUsernameValue(parsed.data.username);

  if (usernameValidation.error) {
    return NextResponse.json({ error: usernameValidation.error }, { status: 400 });
  }

  const existingUser = await prisma.user.findFirst({
    where: {
      username: usernameValidation.normalized,
      NOT: {
        id: session.user.id,
      },
    },
    select: {
      id: true,
    },
  });

  if (existingUser) {
    return NextResponse.json({ error: 'Esse nome publico ja esta em uso.' }, { status: 409 });
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      email: true,
      phone: true,
    },
  });

  // A phone typed here is not verified. Changing it drops the confirmation, so
  // only the SMS flow can mark a number as verified.
  const phoneChanged = (parsed.data.phone ?? null) !== (currentUser?.phone ?? null);

  const currentEmail = currentUser?.email?.trim().toLowerCase() || '';
  const requestedEmail = parsed.data.email?.trim().toLowerCase() || '';

  if (requestedEmail !== currentEmail) {
    return NextResponse.json(
      { error: 'A troca de email exige verificacao e ficou bloqueada nesta versao.' },
      { status: 400 },
    );
  }

  try {
    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: parsed.data.name,
        username: usernameValidation.normalized,
        phone: parsed.data.phone,
        phoneVerifiedAt: phoneChanged ? null : undefined,
        bio: parsed.data.bio ?? null,
        coverImageUrl: parsed.data.coverImageUrl ?? null,
        interests: parsed.data.interests,
        galleryUrls: parsed.data.galleryUrls,
        gender: parsed.data.gender,
        age: parsed.data.age,
        timeAbroad: parsed.data.timeAbroad,
        birthCity: parsed.data.birthCity,
      },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        phone: true,
        bio: true,
        coverImageUrl: true,
        interests: true,
        galleryUrls: true,
        gender: true,
        age: true,
        timeAbroad: true,
        birthCity: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ user });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return NextResponse.json(
        { error: 'Email ou nome publico ja esta em uso.' },
        { status: 409 },
      );
    }

    throw error;
  }
}

