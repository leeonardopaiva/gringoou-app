'use client';

import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/cn';

export type ImageCropperHandle = {
  /** Gera a imagem recortada exatamente como está enquadrada. */
  crop: () => Promise<Blob>;
};

type ImageCropperProps = {
  /** Endereço local (blob:) da imagem escolhida. */
  src: string;
  /** Proporção largura/altura da área de recorte (ex.: 1 para avatar, 16/9 para notícias). */
  aspect: number;
  /** Mostra a moldura circular sobre a área (avatar). O arquivo gerado continua quadrado. */
  round?: boolean;
  /** Largura em pixels da imagem gerada. */
  outputWidth?: number;
  className?: string;
};

const MAX_ZOOM = 3;

/**
 * Recorte com enquadramento manual no padrão Facebook/LinkedIn: arraste para posicionar,
 * use o controle (ou a roda do mouse / pinça) para ampliar. Não depende de bibliotecas externas.
 */
export const ImageCropper = forwardRef<ImageCropperHandle, ImageCropperProps>(({ src, aspect, round = false, outputWidth = 1600, className }, ref) => {
  const frameRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<{ distance: number; zoom: number } | null>(null);
  const [frame, setFrame] = useState({ w: 0, h: 0 });
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const baseScale = natural && frame.w ? Math.max(frame.w / natural.w, frame.h / natural.h) : 1;
  const scale = baseScale * zoom;

  const clamp = useCallback(
    (x: number, y: number, nextScale: number) => {
      if (!natural) return { x: 0, y: 0 };
      const w = natural.w * nextScale;
      const h = natural.h * nextScale;
      return { x: Math.min(0, Math.max(frame.w - w, x)), y: Math.min(0, Math.max(frame.h - h, y)) };
    },
    [natural, frame.w, frame.h],
  );

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const measure = () => setFrame({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Nova imagem: reinicia o enquadramento centralizado.
  useEffect(() => {
    setNatural(null);
    setZoom(1);
  }, [src]);

  useEffect(() => {
    if (!natural || !frame.w) return;
    const s = Math.max(frame.w / natural.w, frame.h / natural.h) * zoom;
    setOffset((current) => {
      const first = current.x === 0 && current.y === 0;
      const x = first ? (frame.w - natural.w * s) / 2 : current.x;
      const y = first ? (frame.h - natural.h * s) / 2 : current.y;
      return clamp(x, y, s);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [natural, frame.w, frame.h]);

  const applyZoom = useCallback(
    (nextZoom: number) => {
      if (!natural) return;
      const z = Math.min(MAX_ZOOM, Math.max(1, nextZoom));
      const nextScale = baseScale * z;
      // Mantém o centro do enquadramento fixo ao ampliar.
      const cx = (frame.w / 2 - offset.x) / scale;
      const cy = (frame.h / 2 - offset.y) / scale;
      setZoom(z);
      setOffset(clamp(frame.w / 2 - cx * nextScale, frame.h / 2 - cy * nextScale, nextScale));
    },
    [natural, baseScale, frame.w, frame.h, offset.x, offset.y, scale, clamp],
  );

  const onPointerDown = (event: React.PointerEvent) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointersRef.current.size === 2) {
      const [a, b] = [...pointersRef.current.values()];
      pinchRef.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), zoom };
      dragRef.current = null;
    } else {
      dragRef.current = { x: event.clientX, y: event.clientY, ox: offset.x, oy: offset.y };
    }
  };

  const onPointerMove = (event: React.PointerEvent) => {
    if (!pointersRef.current.has(event.pointerId)) return;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointersRef.current.size === 2 && pinchRef.current) {
      const [a, b] = [...pointersRef.current.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      applyZoom(pinchRef.current.zoom * (distance / pinchRef.current.distance));
      return;
    }
    const drag = dragRef.current;
    if (!drag) return;
    setOffset(clamp(drag.ox + event.clientX - drag.x, drag.oy + event.clientY - drag.y, scale));
  };

  const onPointerUp = (event: React.PointerEvent) => {
    pointersRef.current.delete(event.pointerId);
    pinchRef.current = null;
    const remaining = [...pointersRef.current.values()][0];
    dragRef.current = remaining ? { x: remaining.x, y: remaining.y, ox: offset.x, oy: offset.y } : null;
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    const step = 12;
    const moves: Record<string, [number, number]> = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    setOffset(clamp(offset.x + move[0], offset.y + move[1], scale));
  };

  useImperativeHandle(
    ref,
    () => ({
      crop: () =>
        new Promise<Blob>((resolve, reject) => {
          const img = imgRef.current;
          if (!img || !natural || !frame.w) {
            reject(new Error('A imagem ainda não foi carregada.'));
            return;
          }
          // Não amplia além da resolução real da região recortada.
          const outW = Math.max(1, Math.min(outputWidth, Math.round(frame.w / scale)));
          const outH = Math.round(outW / aspect);
          const canvas = document.createElement('canvas');
          canvas.width = outW;
          canvas.height = outH;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Não foi possível processar a imagem.'));
            return;
          }
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, outW, outH);
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, -offset.x / scale, -offset.y / scale, frame.w / scale, frame.h / scale, 0, 0, outW, outH);
          canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Não foi possível processar a imagem.'))), 'image/jpeg', 0.92);
        }),
    }),
    [natural, frame.w, scale, offset.x, offset.y, outputWidth, aspect],
  );

  return (
    <div className={cn('space-y-3', className)}>
      <div
        ref={frameRef}
        tabIndex={0}
        role="group"
        aria-label="Posicione a imagem: arraste para mover"
        style={{ aspectRatio: String(aspect) }}
        className="relative w-full cursor-grab touch-none select-none overflow-hidden bg-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-brand-300 active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
        onWheel={(event) => applyZoom(zoom - event.deltaY * 0.0015)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={src}
          alt=""
          draggable={false}
          onLoad={(event) => setNatural({ w: event.currentTarget.naturalWidth, h: event.currentTarget.naturalHeight })}
          style={natural ? { width: natural.w * scale, height: natural.h * scale, transform: `translate(${offset.x}px, ${offset.y}px)` } : { visibility: 'hidden' }}
          className="pointer-events-none absolute left-0 top-0 max-w-none"
        />
        {round ? (
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 rounded-full shadow-[0_0_0_999px_rgba(0,0,0,0.5)]" />
            <div className="absolute inset-0 rounded-full border-2 border-white/80" />
          </div>
        ) : (
          <div className="pointer-events-none absolute inset-0 border border-white/30" />
        )}
      </div>
      <div className="flex items-center gap-3 px-1">
        <button type="button" onClick={() => applyZoom(zoom - 0.2)} aria-label="Diminuir zoom" className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100">
          <Minus size={16} />
        </button>
        <input
          type="range"
          min={1}
          max={MAX_ZOOM}
          step={0.01}
          value={zoom}
          onChange={(event) => applyZoom(Number(event.target.value))}
          aria-label="Zoom"
          className="h-1.5 flex-1 cursor-pointer accent-brand-500"
        />
        <button type="button" onClick={() => applyZoom(zoom + 0.2)} aria-label="Aumentar zoom" className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100">
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
});

ImageCropper.displayName = 'ImageCropper';

export default ImageCropper;
