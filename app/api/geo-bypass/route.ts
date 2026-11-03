import { NextResponse } from 'next/server';
import {
  GEO_BYPASS_COOKIE_MAX_AGE_SECONDS,
  GEO_BYPASS_COOKIE_NAME,
  createGeoBypassToken,
  isValidGeoBypassKey,
} from '@/lib/geo-access';

export const runtime = 'nodejs';

// Visiting /api/geo-bypass?key=... once on a device keeps it allowed for 30 days,
// whatever its IP. Wrong or missing keys get a plain 404, so the route stays hidden.
export async function GET(request: Request) {
  const key = new URL(request.url).searchParams.get('key') ?? '';

  if (!isValidGeoBypassKey(key)) {
    return new NextResponse('Not found', { status: 404 });
  }

  const token = await createGeoBypassToken();
  const response = NextResponse.redirect(new URL('/', request.url));

  response.cookies.set({
    name: GEO_BYPASS_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: GEO_BYPASS_COOKIE_MAX_AGE_SECONDS,
  });

  return response;
}
