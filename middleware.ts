import { getToken } from 'next-auth/jwt';
import { NextResponse, type NextRequest } from 'next/server';

const CANONICAL_HOST = 'gringoou.com';
const REDIRECT_HOSTS = new Set(['emigrei.com', 'www.emigrei.com']);
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
];

const isTruthyEnv = (value?: string | null) =>
  Boolean(value && ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase()));

const isPublicPath = (pathname: string) =>
  pathname === '/' ||
  pathname === '/api/webhooks/stripe' ||
  PUBLIC_ASSET_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
  PUBLIC_AUTH_PATHS.some((prefix) => pathname.startsWith(prefix));

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

  const host = request.headers.get('host')?.split(':')[0].toLowerCase();

  if (!host || !REDIRECT_HOSTS.has(host)) {
    if (!isPublicPath(request.nextUrl.pathname)) {
      const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
      const isApiRequest = request.nextUrl.pathname.startsWith('/api/');
      const maintenanceEnabled = isTruthyEnv(process.env.MAINTENANCE_MODE);
      const isAdmin = token?.role === 'ADMIN';

      if (token?.accountDeleted) {
        return buildDeletedAccountResponse(request);
      }

      if (!token) {
        if (isApiRequest) {
          return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 });
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
    }

    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.hostname = CANONICAL_HOST;
  url.protocol = 'https:';

  return NextResponse.redirect(url, 308);
}
