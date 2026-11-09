/**
 * Dados de teste do mapa do Marketplace (somente banco LOCAL, idempotente, sem reset).
 *
 * - Os 3 anúncios ativos mais recentes recebem coordenadas (cidade da região de cada um).
 * - O 4º anúncio ativo fica SEM coordenadas, para testar o caso "sem mapa".
 * Pode rodar quantas vezes quiser: só grava quando o valor é diferente.
 *
 * Uso: node --env-file=.env scripts/set-marketplace-test-coords.mjs
 */
import { PrismaClient } from '@prisma/client';

const url = process.env.DATABASE_URL ?? '';
let host = '';
try {
  host = new URL(url).hostname;
} catch {
  /* url inválida */
}
if (host !== 'localhost' && host !== '127.0.0.1') {
  console.error(`[coords] RECUSADO: DATABASE_URL aponta para "${host || 'desconhecido'}", não para localhost.`);
  process.exit(1);
}

const CITY_COORDS = [
  { match: 'orlando', latitude: 28.5383, longitude: -81.3792 },
  { match: 'miami', latitude: 25.7617, longitude: -80.1918 },
  { match: 'boston', latitude: 42.3601, longitude: -71.0589 },
];
const FALLBACK = CITY_COORDS[0];

const prisma = new PrismaClient();

async function main() {
  const items = await prisma.marketplaceItem.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
    take: 4,
    select: { id: true, title: true, regionKey: true, latitude: true, longitude: true },
  });

  for (const [index, item] of items.entries()) {
    const wanted = index < 3
      ? (CITY_COORDS.find((city) => String(item.regionKey).toLowerCase().includes(city.match)) ?? FALLBACK)
      : null;
    const latitude = wanted ? Number((wanted.latitude + index * 0.004).toFixed(4)) : null;
    const longitude = wanted ? Number((wanted.longitude - index * 0.004).toFixed(4)) : null;
    if (item.latitude === latitude && item.longitude === longitude) {
      console.log(`[coords] ok       ${item.id} (${item.title})`);
      continue;
    }
    await prisma.marketplaceItem.update({ where: { id: item.id }, data: { latitude, longitude } });
    console.log(`[coords] atualizado ${item.id} (${item.title}) -> ${latitude === null ? 'sem coordenadas' : `${latitude}, ${longitude}`}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
