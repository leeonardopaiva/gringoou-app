'use client';

import React from 'react';
import { cn } from '@/lib/cn';

export interface ApproximateAreaMapProps {
  latitude: number;
  longitude: number;
  /** Raio do círculo que indica a área aproximada. */
  radiusMeters?: number;
  /** Nível de zoom dos blocos do mapa (14 ≈ bairro). */
  zoom?: number;
  /** Descrição para leitores de tela (ex.: "Área aproximada de Orlando, FL"). */
  label: string;
  className?: string;
}

const TILE = 256;
// 5 colunas x 3 linhas cobrem qualquer contêiner até ~1000px de largura e ~250px de altura.
const OFFSETS_X = [-2, -1, 0, 1, 2];
const OFFSETS_Y = [-1, 0, 1];

/**
 * Mapa limpo de "área aproximada": blocos do OpenStreetMap + círculo semitransparente.
 * Sem pino, sem zoom, sem interação. A atribuição exigida pela licença (ODbL) fica como
 * um link pequeno no canto. Não usa iframe nem biblioteca de mapas.
 */
export const ApproximateAreaMap: React.FC<ApproximateAreaMapProps> = ({
  latitude,
  longitude,
  radiusMeters = 800,
  zoom = 14,
  label,
  className,
}) => {
  const n = 2 ** zoom;
  const latRad = (latitude * Math.PI) / 180;
  const x = ((longitude + 180) / 360) * n;
  const y = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;
  const centerX = Math.floor(x);
  const centerY = Math.floor(y);
  const fracX = x - centerX;
  const fracY = y - centerY;

  const metersPerPixel = (156543.03392 * Math.cos(latRad)) / n;
  const radiusPx = Math.round(radiusMeters / metersPerPixel);

  return (
    <div
      role="img"
      aria-label={label}
      className={cn('relative h-44 w-full select-none overflow-hidden rounded-xl bg-slate-100 sm:h-48', className)}
    >
      <div className="pointer-events-none absolute left-1/2 top-1/2" aria-hidden>
        {OFFSETS_Y.flatMap((dy) =>
          OFFSETS_X.map((dx) => {
            const tileY = centerY + dy;
            if (tileY < 0 || tileY >= n) return null;
            const tileX = (((centerX + dx) % n) + n) % n;
            return (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={`${dx}:${dy}`}
                src={`https://tile.openstreetmap.org/${zoom}/${tileX}/${tileY}.png`}
                alt=""
                width={TILE}
                height={TILE}
                loading="lazy"
                draggable={false}
                className="absolute max-w-none saturate-[0.65]"
                style={{ left: (dx - fracX) * TILE, top: (dy - fracY) * TILE, width: TILE, height: TILE }}
              />
            );
          }),
        )}
      </div>
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-brand-500/60 bg-brand-500/20"
        style={{ width: radiusPx * 2, height: radiusPx * 2 }}
        aria-hidden
      />
      <a
        href="https://www.openstreetmap.org/copyright"
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-0 right-0 rounded-tl-md bg-white/80 px-1.5 py-0.5 text-[10px] leading-none text-slate-500 transition hover:text-slate-800"
      >
        © OpenStreetMap
      </a>
    </div>
  );
};

export default ApproximateAreaMap;
