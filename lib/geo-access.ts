// Country-based access control. Runs in the Edge middleware, so it relies only on
// Web Crypto and plain string handling (no node:crypto, no Prisma).

export const GEO_BYPASS_COOKIE_NAME = 'gringoou_geo_bypass';
const GEO_BYPASS_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

// European countries (EU, UK, EFTA and microstates).
export const EUROPE_COUNTRIES = [
  'AD', 'AT', 'BE', 'BG', 'CH', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI', 'FR', 'GB', 'GR',
  'HR', 'HU', 'IE', 'IS', 'IT', 'LI', 'LT', 'LU', 'LV', 'MC', 'MT', 'NL', 'NO', 'PL', 'PT',
  'RO', 'SE', 'SI', 'SK', 'SM', 'VA',
];

// Other European countries and territories (Balkans, Eastern Europe, Turkey, Crown
// Dependencies, Gibraltar, Faroe Islands).
export const EUROPE_EXTRA_COUNTRIES = [
  'AL', 'BA', 'FO', 'GG', 'GI', 'IM', 'JE', 'MD', 'ME', 'MK', 'RS', 'TR', 'UA', 'XK',
];

// US territories that use US phone numbers.
export const US_TERRITORY_COUNTRIES = ['PR', 'VI'];

export const DEFAULT_ALLOWED_COUNTRIES = [
  'US',
  'CA',
  ...US_TERRITORY_COUNTRIES,
  ...EUROPE_COUNTRIES,
  ...EUROPE_EXTRA_COUNTRIES,
];

const splitList = (value?: string) =>
  (value ?? '')
    .split(',')
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);

const isTruthy = (value?: string) => ['1', 'true', 'yes', 'on'].includes((value ?? '').trim().toLowerCase());

// Off by default. Enable in production only after the exemptions are in place.
export const isGeoBlockEnabled = () => isTruthy(process.env.GEO_BLOCK_ENABLED);

// Private Beta: bloqueio por lista de países (blocklist), ex.: América do Sul.
export const isGeoRestrictionEnabled = () => isTruthy(process.env.GEO_RESTRICTION_ENABLED);

export const getBlockedCountries = () => splitList(process.env.GEO_BLOCKED_COUNTRIES);

export const isCountryBlockedByList = (country: string | null) =>
  Boolean(country) && getBlockedCountries().includes(country!.trim().toUpperCase());

export const getAllowedAccessCountries = () => {
  const configured = splitList(process.env.GEO_ALLOWED_COUNTRIES);
  return configured.length > 0 ? configured : DEFAULT_ALLOWED_COUNTRIES;
};

// Vercel sets x-vercel-ip-country. Without the header (local development, or a host
// that does not provide it) the request is not blocked.
export const isCountryBlocked = (country: string | null) =>
  Boolean(country) && !getAllowedAccessCountries().includes(country!.trim().toUpperCase());

export const getRequestIp = (request: Request) => {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || null;
  }
  return request.headers.get('x-real-ip')?.trim() || null;
};

// Fixed IPs that are never blocked, from GEO_BYPASS_IPS.
export const isGeoBypassIp = (ip: string | null) => {
  if (!ip) {
    return false;
  }
  return splitList(process.env.GEO_BYPASS_IPS).includes(ip.toUpperCase());
};

// Paths that must stay reachable from any country: sign-in, payment webhooks,
// health checks, the bypass route itself and static assets.
const GEO_EXEMPT_PREFIXES = [
  '/_next/',
  '/assets/',
  '/favicon',
  '/icon',
  '/apple-icon',
  '/robots.txt',
  '/sitemap.xml',
  '/manifest.webmanifest',
  '/api/auth',
  '/api/webhooks/stripe',
  '/api/health',
  '/api/geo-bypass',
  // "Avise-me" da página de região indisponível: precisa funcionar de países bloqueados.
  '/api/waitlist',
  '/access-blocked',
  '/region-unavailable',
  '/maintenance',
];

export const isGeoExemptPath = (pathname: string) =>
  GEO_EXEMPT_PREFIXES.some((prefix) => pathname.startsWith(prefix));

const encoder = new TextEncoder();

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
    encoder.encode(process.env.NEXTAUTH_SECRET?.trim() ?? ''),
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

// Signed, expiring token stored in an httpOnly cookie. Lets the developer keep
// access from any IP after visiting the bypass URL once.
export const createGeoBypassToken = async () => {
  const expiresAt = Date.now() + GEO_BYPASS_TTL_SECONDS * 1000;
  const signature = await signPayload(`geo-bypass:${expiresAt}`);
  return `${expiresAt}.${signature}`;
};

export const verifyGeoBypassToken = async (token?: string | null) => {
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

  const expectedSignature = await signPayload(`geo-bypass:${expiresAt}`);

  return constantTimeEqual(signature, expectedSignature);
};

export const GEO_BYPASS_COOKIE_MAX_AGE_SECONDS = GEO_BYPASS_TTL_SECONDS;

// Same rule as the middleware, for API routes the middleware leaves open (e.g. /api/auth/register),
// so a blocked country cannot create accounts by calling the endpoint directly.
export const isRequestGeoBlocked = async (request: Request) => {
  if (!isGeoBlockEnabled() && !isGeoRestrictionEnabled()) return false;

  const country = request.headers.get('x-vercel-ip-country');
  const blocked = isGeoBlockEnabled() ? isCountryBlocked(country) : isCountryBlockedByList(country);
  if (!blocked) return false;
  if (isGeoBypassIp(getRequestIp(request))) return false;

  const prefix = `${GEO_BYPASS_COOKIE_NAME}=`;
  const cookie = request.headers
    .get('cookie')
    ?.split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith(prefix))
    ?.slice(prefix.length);

  return !(await verifyGeoBypassToken(cookie));
};

// Compares the access key from the URL in constant time.
export const isValidGeoBypassKey = (candidate: string) => {
  const expected = process.env.GEO_BYPASS_KEY?.trim() ?? '';
  return expected.length > 0 && constantTimeEqual(candidate.trim(), expected);
};
