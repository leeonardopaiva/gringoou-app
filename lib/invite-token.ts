import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Token de convite de curta duração, assinado com HMAC-SHA256.
 *
 * Preserva a validação do convite entre o início do login (Google OAuth ou
 * magic link por e-mail) e o callback, sem expor o código em query params.
 * O token é armazenado em cookie httpOnly e expira em poucos minutos.
 */

export const INVITE_COOKIE_NAME = 'gringoou_invite';
export const INVITE_TOKEN_TTL_MS = 10 * 60 * 1000; // 10 minutos

const getSecret = () => process.env.NEXTAUTH_SECRET?.trim() ?? '';

const toBase64Url = (value: string) =>
  Buffer.from(value, 'utf8').toString('base64url');

const fromBase64Url = (value: string) =>
  Buffer.from(value, 'base64url').toString('utf8');

export function createInviteToken(code: string, email: string): string {
  const payload = `${code.trim().toUpperCase()}|${email.trim().toLowerCase()}|${Date.now()}`;
  const signature = createHmac('sha256', getSecret()).update(payload).digest('base64url');
  return `${toBase64Url(payload)}.${signature}`;
}

export type InviteTokenPayload = { code: string; email: string } | null;

export function verifyInviteToken(token?: string | null): InviteTokenPayload {
  if (!token) return null;

  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) return null;

  const expected = createHmac('sha256', getSecret()).update(encodedPayload).digest('base64url');
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== signatureBuffer.length || !timingSafeEqual(expectedBuffer, signatureBuffer)) {
    return null;
  }

  let payload: string;
  try {
    payload = fromBase64Url(encodedPayload);
  } catch {
    return null;
  }

  const [code, email, issuedAt] = payload.split('|');
  if (!code || !email || !issuedAt) return null;

  const issued = Number(issuedAt);
  if (!Number.isFinite(issued) || Date.now() - issued > INVITE_TOKEN_TTL_MS) {
    return null;
  }

  return { code, email };
}