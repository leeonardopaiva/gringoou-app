import 'server-only';
import { createHmac } from 'node:crypto';
import { APPROX_AREA_MAX_OFFSET, APPROX_AREA_MIN_OFFSET, APPROX_AREA_RADIUS_METERS } from './map-area';

const METERS_PER_DEGREE_LAT = 111_320;
const round5 = (value: number) => Math.round(value * 1e5) / 1e5;

/**
 * Centro exibido do círculo de "área aproximada" de um anúncio.
 *
 * O ponto real fica dentro do círculo, mas nunca no centro: o centro é deslocado entre 25% e 60%
 * do raio, numa direção sorteada de forma DETERMINÍSTICA (HMAC do id do anúncio com o segredo do
 * servidor). Assim o resultado é estável entre cargas e sessões, e quem lê o código não consegue
 * desfazer o deslocamento sem o segredo. Só esta função enxerga a coordenada exata; ela nunca é
 * enviada ao cliente (nem ao Mapbox). O dado salvo no banco não é alterado.
 */
export function approximateAreaCenter(
  listingId: string,
  latitude: number | null | undefined,
  longitude: number | null | undefined,
  radiusMeters: number = APPROX_AREA_RADIUS_METERS,
): { latitude: number; longitude: number } | null {
  if (typeof latitude !== 'number' || typeof longitude !== 'number' || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  const digest = createHmac('sha256', process.env.NEXTAUTH_SECRET || 'gringoou-approximate-area')
    .update(`marketplace-area:${listingId}`)
    .digest();
  const unitAngle = digest.readUInt32BE(0) / 0xffffffff;
  const unitDistance = digest.readUInt32BE(4) / 0xffffffff;

  const angle = unitAngle * 2 * Math.PI;
  const distance = radiusMeters * (APPROX_AREA_MIN_OFFSET + (APPROX_AREA_MAX_OFFSET - APPROX_AREA_MIN_OFFSET) * unitDistance);
  const metersPerDegreeLng = METERS_PER_DEGREE_LAT * Math.max(Math.cos((latitude * Math.PI) / 180), 0.01);

  return {
    latitude: round5(latitude + (distance * Math.sin(angle)) / METERS_PER_DEGREE_LAT),
    longitude: round5(longitude + (distance * Math.cos(angle)) / metersPerDegreeLng),
  };
}
