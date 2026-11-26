import 'server-only';

import { prisma } from '@/lib/prisma';
import { getAccessCountry } from '@/lib/phone-verification';
import { findRegionByKey } from '@/lib/region-store';

/**
 * Regra de país: o usuário só escolhe regiões do próprio país. Outro país só é liberado quando a
 * geolocalização do acesso atual (cabeçalho da Vercel) mostra que ele está lá agora.
 *
 * "Próprio país" = país do telefone confirmado. Contas antigas sem telefone confirmado usam o país
 * da região em que já estão, para ninguém ficar travado.
 * Administradores e moderadores não têm essa restrição.
 */
export const REGION_COUNTRY_BLOCKED_MESSAGE =
  'Você só pode escolher regiões do seu país. Para ver outro país, é preciso estar nele.';

export async function canUseRegionCountry({
  userId,
  role,
  request,
  regionCountryCode,
}: {
  userId: string;
  role?: string | null;
  request: Request;
  regionCountryCode?: string | null;
}) {
  if (role === 'ADMIN' || role === 'MODERATOR') return true;

  const target = (regionCountryCode || 'US').toUpperCase();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { phoneCountry: true, regionKey: true },
  });

  const allowed = new Set<string>();
  if (user?.phoneCountry) allowed.add(user.phoneCountry.toUpperCase());

  // Estar fisicamente no país (geolocalização do acesso) também libera.
  const accessCountry = getAccessCountry(request);
  if (accessCountry) allowed.add(accessCountry);

  // Sem telefone confirmado, vale o país da região atual (contas antigas).
  if (!user?.phoneCountry && user?.regionKey) {
    const current = await findRegionByKey(user.regionKey);
    if (current?.countryCode) allowed.add(current.countryCode.toUpperCase());
  }

  // Sem nenhum sinal (ex.: ambiente local, conta nova sem telefone), não há como decidir: libera.
  if (allowed.size === 0) return true;

  return allowed.has(target);
}
