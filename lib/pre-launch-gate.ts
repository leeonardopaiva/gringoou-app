// Temporary pre-launch access gate.
//
// This is an *access* layer, independent from NextAuth (which handles
// *authentication*). It only decides whether a visitor is allowed to reach the
// pre-launch environment at all.
//
// Everything here is intentionally edge-safe: it relies solely on Web Crypto
// (`crypto.subtle`) and `btoa`, both available in the Edge middleware runtime
// and in Node.js route handlers. Do NOT import `node:crypto` or `server-only`
// here, otherwise the middleware bundle breaks.

export const PRE_LAUNCH_COOKIE_NAME = 'gringoou_prelaunch';
export const PRE_LAUNCH_COOKIE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days

const encoder = new TextEncoder();

const isTruthy = (value?: string | null) =>
  Boolean(value && ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase()));

const getAccessCode = () => process.env.PRE_LAUNCH_ACCESS_CODE?.trim() ?? '';

const getSigningSecret = () => process.env.NEXTAUTH_SECRET?.trim() ?? '';

// The gate is only active when explicitly enabled AND a code is configured.
// This keeps local development (and any environment that forgets to set the
// code) from being locked out by accident.
export const isPreLaunchGateEnabled = () =>
  isTruthy(process.env.PRE_LAUNCH_GATE_ENABLED) && getAccessCode().length > 0;

const toBase64Url = (bytes: Uint8Array) => {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const signPayload = async (payload: string) => {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(getSigningSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return toBase64Url(new Uint8Array(signature));
};

const constantTimeEqual = (a: string, b: string) => {
  if (a.length !== b.length) {
    return false;
  }

  let mismatch = 0;
  for (let index = 0; index < a.length; index += 1) {
    mismatch |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }

  return mismatch === 0;
};

// Server-side only comparison. The expected code never leaves the server.
export const isValidPreLaunchCode = (candidate: string) => {
  const expected = getAccessCode();

  if (!expected) {
    return false;
  }

  return constantTimeEqual(candidate.trim(), expected);
};

// Signed, expiring authorization token stored in an httpOnly cookie. The raw
// access code is never persisted anywhere.
export const createPreLaunchToken = async (
  ttlMs: number = PRE_LAUNCH_COOKIE_MAX_AGE_SECONDS * 1000,
) => {
  const expiresAt = Date.now() + ttlMs;
  const signature = await signPayload(`prelaunch:${expiresAt}`);
  return `${expiresAt}.${signature}`;
};

export const verifyPreLaunchToken = async (token?: string | null) => {
  if (!token) {
    return false;
  }

  const [expiresAtRaw, signature] = token.split('.');

  if (!expiresAtRaw || !signature) {
    return false;
  }

  const expiresAt = Number(expiresAtRaw);

  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    return false;
  }

  const expectedSignature = await signPayload(`prelaunch:${expiresAt}`);

  return constantTimeEqual(signature, expectedSignature);
};
