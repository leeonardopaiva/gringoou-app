import { getToken } from 'next-auth/jwt';
import { NextResponse, type NextRequest } from 'next/server';
import {
  PRE_LAUNCH_COOKIE_NAME,
  isPreLaunchGateEnabled,
  verifyPreLaunchToken,
} from '@/lib/pre-launch-gate';
import { buildRateLimitHeaders, consumeRateLimit } from '@/lib/rate-limit';
import {
  GEO_BYPASS_COOKIE_NAME,
  getRequestIp,
  isCountryBlocked,
  isCountryBlockedByList,
  isGeoBlockEnabled,
  isGeoBypassIp,
  isGeoExemptPath,
  isGeoRestrictionEnabled,
  verifyGeoBypassToken,
} from '@/lib/geo-access';

const CANONICAL_HOST = 'gringoou.com';
// Hosts redirected to the canonical domain. Keeping the OAuth flow on a single
// host is required: the `state` cookie is set on the host that starts the
// sign-in, so a www/non-www mismatch makes the callback fail with
// "State cookie was missing".
const REDIRECT_HOSTS = new Set(['emigrei.com', 'www.emigrei.com', 'www.gringoou.com']);
const PUBLIC_ASSET_PREFIXES = [
  '/_next/',
  '/assets/',
  '/favicon',
  '/robots.txt',
  '/sitemap.xml',
  '/icon',
  '/apple-icon',
  '/manifest.webmanifest',
  '/api/health',
];
const PUBLIC_AUTH_PATHS = [
  '/api/auth',
  '/login',
  '/landing',
  // Página pública de uma notícia (link compartilhado); a lista /news continua exigindo login.
  '/news/',
  '/access-blocked',
  '/maintenance',
  '/styleguide',
  '/ads/login',
  '/ads/register',
  '/api/ads/auth/register',
  '/api/dev/email-preview',
  '/api/dev/magic-link',
  '/api/dev/email-preview',
  '/api/dev/magic-link',
  // Pre-launch access gate: the gate page and its validation endpoint must stay
  // reachable without authentication (and without the gate cookie itself).
  '/pre-launch',
  '/api/pre-launch',
  // Waiting list signup from the landing page must work for anonymous visitors.
  '/api/waitlist',
];

// Paths that stay reachable while the pre-launch gate is active. Everything
// else (including /login) requires a valid gate cookie first. Technical routes
// required by NextAuth/OAuth, static assets and error pages are always exempt
// so the gate can never break the sign-in flow or cause a redirect loop.
const PRE_LAUNCH_PUBLIC_PATHS = [
  '/landing',
  '/pre-launch',
  '/api/pre-launch',
  '/api/auth',
  '/api/webhooks/stripe',
  '/api/health',
  '/maintenance',
  '/access-blocked',
  '/styleguide',
  '/api/dev/',
  '/api/waitlist',
  ...PUBLIC_ASSET_PREFIXES,
];

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
// Webhooks são assinados e chegam em rajadas legítimas; não limitamos por IP.
const RATE_LIMIT_EXEMPT_PATHS = ['/api/webhooks/'];

const tooManyRequests = (resetAt: number) =>
  NextResponse.json(
    { error: 'Muitas requisicoes. Aguarde um instante e tente novamente.' },
    {
      status: 429,
      headers: {
        'Retry-After': String(Math.max(1, Math.ceil((resetAt - Date.now()) / 1000))),
        ...buildRateLimitHeaders({ allowed: false, remaining: 0, resetAt }),
      },
    },
  );

/**
 * Teto global de escritas na API (rede de segurança para rotas sem limite próprio) e
 * proteção contra força bruta no login. Limites específicos por rota continuam valendo por cima.
 */
const applyEdgeRateLimit = async (request: NextRequest, userId?: string | null) => {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith('/api/') || SAFE_METHODS.has(request.method)) return null;
  if (RATE_LIMIT_EXEMPT_PATHS.some((prefix) => pathname.startsWith(prefix))) return null;

  const ip = getRequestIp(request);

  if (
    pathname.startsWith('/api/auth/callback/credentials') ||
    pathname.startsWith('/api/auth/signin/')
  ) {
    const result = await consumeRateLimit({ scope: 'edge:auth', key: `ip:${ip}`, max: 15, windowMs: 10 * 60 * 1000 });
    return result.allowed ? null : tooManyRequests(result.resetAt);
  }

  const result = await consumeRateLimit({
    scope: userId ? 'edge:write:user' : 'edge:write:ip',
    key: userId ? `user:${userId}` : `ip:${ip}`,
    max: userId ? 120 : 30,
    windowMs: 60 * 1000,
  });
  return result.allowed ? null : tooManyRequests(result.resetAt);
};

const isTruthyEnv = (value?: string | null) =>
  Boolean(value && ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase()));

const isPublicPath = (pathname: string) =>
  pathname === '/' ||
  pathname === '/api/webhooks/stripe' ||
  PUBLIC_ASSET_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
  PUBLIC_AUTH_PATHS.some((prefix) => pathname.startsWith(prefix));

const isPreLaunchPublicPath = (pathname: string) =>
  pathname === '/' || PRE_LAUNCH_PUBLIC_PATHS.some((prefix) => pathname.startsWith(prefix));

const shouldApplyPreLaunchGate = (pathname: string) => !isPreLaunchPublicPath(pathname);

const buildPreLaunchResponse = (request: NextRequest) => {
  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Acesso restrito.' }, { status: 403 });
  }

  const url = request.nextUrl.clone();
  url.pathname = '/pre-launch';
  url.search = '';

  const next = `${pathname}${request.nextUrl.search}`;
  if (next && next !== '/pre-launch') {
    url.searchParams.set('next', next);
  }

  return NextResponse.redirect(url, 307);
};

const buildMaintenanceResponse = (request: NextRequest) => {
  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith('/api/')) {
    return NextResponse.json(
      { error: 'A plataforma esta temporariamente em manutencao.' },
      { status: 503 },
    );
  }

  const url = request.nextUrl.clone();
  url.pathname = '/maintenance';
  url.search = '';
  return NextResponse.redirect(url, 307);
};

const buildAccessBlockedResponse = (request: NextRequest) => {
  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith('/api/')) {
    return NextResponse.json(
      { error: 'Seu acesso nao esta liberado.' },
      { status: 403 },
    );
  }

  const url = request.nextUrl.clone();
  url.pathname = '/access-blocked';
  url.search = '';
  return NextResponse.redirect(url, 307);
};

const buildDeletedAccountResponse = (request: NextRequest) => {
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Esta conta foi excluida.' }, { status: 401 });
  }
  const url = request.nextUrl.clone();
  url.pathname = '/login';
  url.search = '';
  const response = NextResponse.redirect(url, 307);
  response.cookies.delete('next-auth.session-token');
  response.cookies.delete('__Secure-next-auth.session-token');
  return response;
};

export async function middleware(request: NextRequest) {
  if (process.env.NODE_ENV === 'production' && request.nextUrl.pathname.startsWith('/api/dev/')) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Country check first, so blocked visitors never reach sign-in or the gate.
  // The developer is exempt by fixed IP or by the bypass cookie. The Founder
  // (authenticated ADMIN) is exempt so maintenance from blocked regions works.
  const geoEnabled = isGeoBlockEnabled() || isGeoRestrictionEnabled();
  if (geoEnabled && !isGeoExemptPath(request.nextUrl.pathname)) {
    const country = request.headers.get('x-vercel-ip-country');
    const isExempt =
      isGeoBypassIp(getRequestIp(request)) ||
      (await verifyGeoBypassToken(request.cookies.get(GEO_BYPASS_COOKIE_NAME)?.value));

    let isFounder = false;
    if (!isExempt) {
      const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
      isFounder = token?.role === 'ADMIN';
    }

    const blocked = isGeoBlockEnabled() ? isCountryBlocked(country) : isCountryBlockedByList(country);

    if (!isExempt && !isFounder && blocked) {
      return new NextResponse(
        '<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Gringoou</title><body style="font-family:sans-serif;padding:32px;color:#0f2b63"><h1>Gringoou ainda nao esta disponivel na sua regiao.</h1><p>Estamos liberando a plataforma aos poucos. Volte em breve.</p></body></html>',
        { status: 403, headers: { 'content-type': 'text/html; charset=utf-8' } },
      );
    }
  }

  const host = request.headers.get('host')?.split(':')[0].toLowerCase();

  if (!host || !REDIRECT_HOSTS.has(host)) {
    if (isPreLaunchGateEnabled() && shouldApplyPreLaunchGate(request.nextUrl.pathname)) {
      const preLaunchToken = request.cookies.get(PRE_LAUNCH_COOKIE_NAME)?.value;
      const hasPreLaunchAccess = await verifyPreLaunchToken(preLaunchToken);

      if (!hasPreLaunchAccess) {
        return buildPreLaunchResponse(request);
      }
    }

    if (isPublicPath(request.nextUrl.pathname)) {
      const limited = await applyEdgeRateLimit(request);
      if (limited) return limited;
    }

    if (!isPublicPath(request.nextUrl.pathname)) {
      const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
      const isApiRequest = request.nextUrl.pathname.startsWith('/api/');
      const maintenanceEnabled = isTruthyEnv(process.env.MAINTENANCE_MODE);
      const isAdmin = token?.role === 'ADMIN';
      const isOAuthCallback = request.nextUrl.searchParams.get('authGrace') === '1';

      if (token?.accountDeleted) {
        return buildDeletedAccountResponse(request);
      }

      if (!token) {
        if (isApiRequest) {
          return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 });
        }

        if (isOAuthCallback) {
          const response = NextResponse.next();
          response.headers.set('x-middleware-cache', 'no-store');
          return response;
        }

        const url = request.nextUrl.clone();
        url.pathname = request.nextUrl.pathname.startsWith('/ads') ? '/ads/login' : '/login';
        url.search = '';
        return NextResponse.redirect(url, 307);
      }

      if (maintenanceEnabled && !isAdmin) {
        if (isApiRequest) {
          return NextResponse.json(
            {
              error: 'A plataforma esta temporariamente em manutencao.',
            },
            { status: 503 },
          );
        }

        return buildMaintenanceResponse(request);
      }

      const limited = await applyEdgeRateLimit(request, String(token.sub || token.id || ''));
      if (limited) return limited;
    }

    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.hostname = CANONICAL_HOST;
  url.protocol = 'https:';

  return NextResponse.redirect(url, 308);
}
