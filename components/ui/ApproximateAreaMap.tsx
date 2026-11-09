'use client';

import React, { useEffect, useRef, useState } from 'react';
import 'mapbox-gl/dist/mapbox-gl.css';
import { cn } from '@/lib/cn';
import { APPROX_AREA_RADIUS_METERS } from '@/lib/map-area';

export interface ApproximateAreaMapProps {
  /** Centro APROXIMADO do círculo (já deslocado no servidor; nunca a coordenada exata). */
  latitude: number;
  longitude: number;
  /** Descrição para leitores de tela (ex.: "Área aproximada: Orlando, FL"). */
  label: string;
  /** Título do bloco; o título e o mapa somem juntos se o mapa não puder ser exibido. */
  title?: string;
  className?: string;
}

// Somente token PÚBLICO (pk.), lido de variável NEXT_PUBLIC_. Sem token, nada é renderizado.
const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim() ?? '';
const CIRCLE_STEPS = 64;
const BRAND = '#0086ff';

// Estilo Standard (tema monochrome, 2D, sem rótulos). Se o monochrome ficar pesado, trocar `theme` por 'faded'.
const BASEMAP_CONFIG = {
  theme: 'monochrome',
  lightPreset: 'day',
  show3dObjects: false,
  showPlaceLabels: false,
  showRoadLabels: false,
  showPointOfInterestLabels: false,
  showTransitLabels: false,
} as const;

const circleRing = (latitude: number, longitude: number, radiusMeters: number): Array<[number, number]> => {
  const metersPerDegreeLat = 111_320;
  const metersPerDegreeLng = metersPerDegreeLat * Math.cos((latitude * Math.PI) / 180);
  const ring: Array<[number, number]> = [];
  for (let step = 0; step <= CIRCLE_STEPS; step += 1) {
    const angle = (step / CIRCLE_STEPS) * 2 * Math.PI;
    ring.push([longitude + (radiusMeters * Math.cos(angle)) / metersPerDegreeLng, latitude + (radiusMeters * Math.sin(angle)) / metersPerDegreeLat]);
  }
  return ring;
};

/**
 * Mapa limpo de "área aproximada" (Mapbox GL JS, estilo Standard monochrome, plano e sem rótulos).
 * Círculo de ~800 m como camada GeoJSON (preenchimento semitransparente + contorno fino). Sem pino, sem
 * controles de zoom e sem nenhuma interação.
 *
 * - O mapbox-gl só é baixado (import dinâmico) quando o bloco entra na tela; páginas sem mapa não o carregam.
 * - Só usa token público (`pk.`) de NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN; sem token, não renderiza nada.
 * - Em erro de carregamento, o bloco inteiro (título + mapa) desaparece, sem deixar espaço vazio.
 * - O logotipo e a atribuição (© Mapbox © OpenStreetMap) do Mapbox ficam no canto, em formato compacto.
 */
export const ApproximateAreaMap: React.FC<ApproximateAreaMapProps> = ({ latitude, longitude, label, title, className }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const enabled = TOKEN.startsWith('pk.');

  // Carrega só quando o bloco chega perto da área visível.
  useEffect(() => {
    const node = containerRef.current;
    if (!enabled || !node || visible) return;
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled, visible]);

  useEffect(() => {
    if (!enabled || !visible || !containerRef.current) return;
    let cancelled = false;
    let map: import('mapbox-gl').Map | null = null;

    (async () => {
      try {
        const mapboxgl = (await import('mapbox-gl')).default;
        if (cancelled || !containerRef.current) return;
        mapboxgl.accessToken = TOKEN;

        const ring = circleRing(latitude, longitude, APPROX_AREA_RADIUS_METERS);
        const lngs = ring.map(([lng]) => lng);
        const lats = ring.map(([, lat]) => lat);

        map = new mapboxgl.Map({
          container: containerRef.current,
          style: 'mapbox://styles/mapbox/standard',
          center: [longitude, latitude],
          bounds: [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
          fitBoundsOptions: { padding: 28, maxZoom: 16 },
          interactive: false,
          pitch: 0,
          bearing: 0,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          config: { basemap: BASEMAP_CONFIG } as any,
        });

        map.on('style.load', () => {
          if (!map) return;
          map.addSource('approximate-area', {
            type: 'geojson',
            data: { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [ring] } },
          });
          // `slot` posiciona as camadas customizadas dentro do estilo Standard.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          map.addLayer({ id: 'approximate-area-fill', type: 'fill', source: 'approximate-area', slot: 'middle', paint: { 'fill-color': BRAND, 'fill-opacity': 0.2 } } as any);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          map.addLayer({ id: 'approximate-area-line', type: 'line', source: 'approximate-area', slot: 'middle', paint: { 'line-color': BRAND, 'line-opacity': 0.7, 'line-width': 1.5 } } as any);
        });
        map.on('load', () => {
          if (!cancelled) setReady(true);
        });
        map.on('error', () => {
          // Erro antes do primeiro carregamento (token inválido, sem rede, WebGL indisponível): some o bloco.
          if (!cancelled && !map?.loaded()) setFailed(true);
        });
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [enabled, visible, latitude, longitude]);

  if (!enabled || failed) return null;

  return (
    <div className={cn('mt-4 border-t border-slate-100 pt-4', className)}>
      {title ? <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{title}</p> : null}
      <div
        role="img"
        aria-label={label}
        className={cn('relative mt-2 aspect-[2/1] w-full overflow-hidden rounded-xl bg-slate-100 transition-opacity duration-300', ready ? 'opacity-100' : 'opacity-90')}
      >
        <div ref={containerRef} className="absolute inset-0" />
      </div>
    </div>
  );
};

export default ApproximateAreaMap;
