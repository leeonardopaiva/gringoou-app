import { NextResponse } from 'next/server';
import { isPhoneVerificationEnabled } from '@/lib/phone-verification';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { findReferrerByUsername } from '@/lib/referrals';
import { findRegionByKey } from '@/lib/region-store';
import { validateUsernameValue } from '@/lib/username';
import { onboardingSchema } from '@/lib/validators';

export async function POST(request: Request) {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = onboardingSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid profile data' },
      { status: 400 },
    );
  }

  const region = await findRegionByKey(parsed.data.regionKey, { activeOnly: true });

  if (!region) {
    return NextResponse.json({ error: 'Invalid region' }, { status: 400 });
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
      referredById: true,
      phoneVerifiedAt: true,
    },
  });

  // The profile can only be completed after the phone is confirmed by SMS,
  // when phone verification is enabled.
  if (isPhoneVerificationEnabled() && !currentUser?.phoneVerifiedAt) {
    return NextResponse.json(
      { error: 'Confirme seu telefone por SMS antes de concluir o cadastro.' },
      { status: 403 },
    );
  }

  const referrer =
    !currentUser?.referredById && parsed.data.referralUsername
      ? await findReferrerByUsername(parsed.data.referralUsername, session.user.id)
      : null;

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: parsed.data.name,
      username: usernameValidation.normalized,
      // The phone is owned by the SMS confirmation flow, so the typed value is not saved here.
      locationLabel: region.label,
      regionKey: region.key,
      gender: parsed.data.gender,
      age: parsed.data.age,
      timeAbroad: parsed.data.timeAbroad,
      birthCity: parsed.data.birthCity,
      onboardingCompleted: true,
      referredById: currentUser?.referredById || referrer?.id || undefined,
    },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      role: true,
      phone: true,
      locationLabel: true,
      regionKey: true,
      onboardingCompleted: true,
      gender: true,
      age: true,
      timeAbroad: true,
      birthCity: true,
    },
  });

  return NextResponse.json({ user });
}
