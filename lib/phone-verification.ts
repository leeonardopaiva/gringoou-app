import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import twilio from 'twilio';
import { DEFAULT_ALLOWED_COUNTRIES } from '@/lib/geo-access';
import { normalizeInternationalPhone } from '@/lib/phone';
import { prisma } from '@/lib/prisma';

// Server-only: Twilio credentials and the code hashing secret never reach the client.
// Phone numbers are sent to Twilio in E.164 format (+ followed by up to 15 digits).
const E164_PATTERN = /^\+[1-9]\d{7,14}$/;
const CODE_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export const toE164Phone = (value: string) => {
  const normalized = normalizeInternationalPhone(value);
  return E164_PATTERN.test(normalized) ? normalized : null;
};

export const getPhoneCountry = (phoneE164: string) =>
  parsePhoneNumberFromString(phoneE164)?.country ?? null;

// Only numbers from these countries are accepted. Defaults to US, Canada and Europe.
const getAllowedCountries = () =>
  process.env.PHONE_ALLOWED_COUNTRIES
    ? process.env.PHONE_ALLOWED_COUNTRIES.split(',').map((value) => value.trim().toUpperCase()).filter(Boolean)
    : DEFAULT_ALLOWED_COUNTRIES;

// Numbers exempt from the block, for the developer's own testing.
const getBypassNumbers = () =>
  (process.env.PHONE_BYPASS_NUMBERS ?? '')
    .split(',')
    .map((value) => toE164Phone(value))
    .filter((value): value is string => Boolean(value));

// True when the number cannot be used to create or confirm an account. Numbers
// with an unknown country are refused too.
export const isPhoneBlocked = (phoneE164: string) => {
  if (getBypassNumbers().includes(phoneE164)) {
    return false;
  }

  const country = getPhoneCountry(phoneE164);

  return !country || !getAllowedCountries().includes(country);
};

// Message to show when the number is refused, or null when it is accepted. Tells an
// invalid number apart from a country that is not open yet.
export const getPhoneBlockMessage = (phoneE164: string) => {
  if (!isPhoneBlocked(phoneE164)) {
    return null;
  }

  return getPhoneCountry(phoneE164)
    ? 'O Gringoou ainda não está disponível para números deste país.'
    : 'Número de telefone inválido. Confira o número e o código do país.';
};

// Country the request came from, provided by Vercel's edge. Null outside Vercel.
export const getAccessCountry = (request: Request) =>
  request.headers.get('x-vercel-ip-country')?.trim().toUpperCase() || null;

// Local-only mode: the code is printed in the server terminal instead of sent by
// SMS. Never active in production, so it cannot replace a real delivery there.
const isDevSmsMode = process.env.NODE_ENV !== 'production' && process.env.PHONE_SMS_DEV_MODE === 'true';

// Phone verification is opt-in. Off by default (Twilio not integrated yet).
export const isPhoneVerificationEnabled = () => process.env.PHONE_VERIFICATION_ENABLED === 'true';

// Twilio Verify (recommended): Twilio generates, sends and checks the code, so no sender
// number or A2P registration is needed. Without a Verify service the app falls back to
// plain SMS from TWILIO_FROM_NUMBER, with the code checked locally.
const getVerifyServiceSid = () => process.env.TWILIO_VERIFY_SERVICE_SID?.trim() || null;

export const isPhoneVerificationConfigured = Boolean(
  isPhoneVerificationEnabled() &&
    process.env.NEXTAUTH_SECRET &&
    (isDevSmsMode ||
      (process.env.TWILIO_ACCOUNT_SID &&
        process.env.TWILIO_AUTH_TOKEN &&
        (process.env.TWILIO_VERIFY_SERVICE_SID || process.env.TWILIO_FROM_NUMBER))),
);

let cachedClient: ReturnType<typeof twilio> | null = null;

const getTwilioClient = () => {
  if (!isPhoneVerificationConfigured) {
    throw new Error('PHONE_VERIFICATION_NOT_CONFIGURED');
  }

  if (!cachedClient) {
    cachedClient = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);
  }

  return cachedClient;
};

// The code is bound to the phone number, so a code sent to one number cannot be
// reused against another.
const hashCode = (phoneE164: string, code: string) =>
  createHmac('sha256', process.env.NEXTAUTH_SECRET!).update(`${phoneE164}:${code}`).digest('hex');

// Creates a 6-digit code, invalidates older pending codes for this user and
// number, and sends the new one by SMS.
export const sendPhoneVerificationCode = async ({
  userId,
  phoneE164,
}: {
  userId: string;
  phoneE164: string;
}) => {
  const verifyServiceSid = isDevSmsMode ? null : getVerifyServiceSid();

  if (verifyServiceSid) {
    await getTwilioClient().verify.v2.services(verifyServiceSid).verifications.create({ to: phoneE164, channel: 'sms' });
    return;
  }

  const code = randomInt(0, 1_000_000).toString().padStart(6, '0');

  await prisma.$transaction([
    prisma.phoneVerificationCode.updateMany({
      where: { userId, phone: phoneE164, usedAt: null },
      data: { usedAt: new Date() },
    }),
    prisma.phoneVerificationCode.create({
      data: {
        userId,
        phone: phoneE164,
        codeHash: hashCode(phoneE164, code),
        expiresAt: new Date(Date.now() + CODE_TTL_MS),
      },
    }),
  ]);

  if (isDevSmsMode) {
    console.log(`[phone-verification] código de teste para ${phoneE164}: ${code}`);
    return;
  }

  await getTwilioClient().messages.create({
    to: phoneE164,
    from: process.env.TWILIO_FROM_NUMBER!,
    body: `Seu código Gringoou e ${code}. Ele expira em 5 minutos. Não compartilhe este código.`,
  });
};

// Returns true only for the latest pending code that matches. Each code allows
// a limited number of attempts and is consumed once approved.
export const checkPhoneVerificationCode = async ({
  userId,
  phoneE164,
  code,
}: {
  userId: string;
  phoneE164: string;
  code: string;
}) => {
  const verifyServiceSid = isDevSmsMode ? null : getVerifyServiceSid();

  if (verifyServiceSid) {
    try {
      const check = await getTwilioClient().verify.v2.services(verifyServiceSid).verificationChecks.create({ to: phoneE164, code });
      return check.status === 'approved';
    } catch (error) {
      // 20404: no pending verification (expired, already approved or max attempts reached).
      if (typeof error === 'object' && error !== null && 'status' in error && error.status === 404) return false;
      throw error;
    }
  }

  const record = await prisma.phoneVerificationCode.findFirst({
    where: { userId, phone: phoneE164, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
    select: { id: true, codeHash: true, attempts: true },
  });

  if (!record || record.attempts >= MAX_ATTEMPTS) {
    return false;
  }

  await prisma.phoneVerificationCode.update({
    where: { id: record.id },
    data: { attempts: { increment: 1 } },
  });

  const expected = Buffer.from(record.codeHash, 'hex');
  const actual = Buffer.from(hashCode(phoneE164, code), 'hex');
  const approved = expected.length === actual.length && timingSafeEqual(expected, actual);

  if (approved) {
    await prisma.phoneVerificationCode.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });
  }

  return approved;
};
