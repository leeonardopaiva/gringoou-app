import { NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { getAllowedRegionCountries } from '@/lib/region-country-access';
import { listRegions } from '@/lib/region-store';

export const runtime = 'nodejs';

/**
 * Regiões ativas. Quem está logado só recebe as dos países permitidos a ele (país do telefone
 * confirmado e país da geolocalização do acesso); admins e moderadores recebem todas.
 */
export async function GET(request: Request) {
  const [regions, session] = await Promise.all([listRegions({ activeOnly: true }), getServerAuthSession()]);

  if (!session?.user?.id) {
    return NextResponse.json({ regions });
  }

  const allowed = await getAllowedRegionCountries({ userId: session.user.id, role: session.user.role, request });
  const visible = allowed ? regions.filter((region) => allowed.includes((region.countryCode || 'US').toUpperCase())) : regions;

  return NextResponse.json({ regions: visible }, { headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' } });
}
