'use client';

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, useAnimationControls, type PanInfo } from 'framer-motion';
import { ArrowRight, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

export type TrendItem = {
  href: string;
  category: string;
  title: string;
  description: string;
  icon: LucideIcon;
  imageUrl?: string | null;
};

export const TrendsCarousel: React.FC<{ items: TrendItem[]; className?: string }> = ({ items, className }) => {
  const count = items.length;
  const [activeIndex, setActiveIndex] = useState(0);
  const activeIndexRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [cardWidth, setCardWidth] = useState(0);
  const [constraints, setConstraints] = useState({ left: 0, right: 0 });
  const [paused, setPaused] = useState(false);
  const controls = useAnimationControls();

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  useLayoutEffect(() => {
    const measure = () => {
      const first = containerRef.current?.firstElementChild as HTMLElement | null;
      const width = first?.offsetWidth ?? 0;
      setCardWidth((current) => (current === width ? current : width));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const slideTo = useCallback(
    (index: number, animated = true) => {
      if (count <= 1) return;
      const normalized = ((index % count) + count) % count;
      setActiveIndex(normalized);
      void controls.start({
        x: -normalized * cardWidth,
        transition: animated ? { type: 'tween', ease: 'easeInOut', duration: 0.55 } : { duration: 0.001 },
      });
    },
    [cardWidth, controls, count],
  );

  // Reajusta a posição quando a largura muda (resize/orientação).
  useEffect(() => {
    if (cardWidth > 0) {
      void controls.start({ x: -activeIndexRef.current * cardWidth, transition: { duration: 0.001 } });
    }
  }, [cardWidth, controls]);

  useEffect(() => {
    setConstraints({ left: -Math.max(0, (count - 1) * cardWidth), right: 0 });
  }, [cardWidth, count]);

  useEffect(() => {
    if (count <= 1 || cardWidth === 0 || paused) return;
    const timer = window.setInterval(() => slideTo(activeIndexRef.current + 1), 3500);
    return () => window.clearInterval(timer);
  }, [cardWidth, count, paused, slideTo]);

  const handleDragEnd = (_event: unknown, info: PanInfo) => {
    if (count <= 1 || cardWidth === 0) return;
    const delta = Math.round(-info.offset.x / cardWidth);
    const velocityBoost = info.velocity.x < -200 ? 1 : info.velocity.x > 200 ? -1 : 0;
    slideTo(activeIndexRef.current + delta + velocityBoost);
  };

  if (count === 0) return null;

  return (
    <section className={cn('space-y-3', className)} aria-labelledby="trends-title">
      <div className="flex items-center justify-between gap-4">
        <h2 id="trends-title" className="text-body-sm font-bold text-foreground">Trends</h2>
        <span className="text-caption font-semibold text-muted-foreground">Deslize para explorar</span>
      </div>

      <div
        className="overflow-hidden"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
      >
        <motion.div
          ref={containerRef}
          drag={count > 1 ? 'x' : false}
          dragConstraints={constraints}
          dragElastic={0.12}
          animate={controls}
          onDragStart={() => setPaused(true)}
          onDragEnd={(event, info) => {
            setPaused(false);
            handleDragEnd(event, info);
          }}
          className="flex"
        >
          {items.map(({ href, category, title, description, icon: Icon, imageUrl }) => (
            <Link
              key={href}
              href={href}
              className="group relative flex min-h-52 w-full flex-none items-end overflow-hidden rounded-card border border-brand-100 bg-brand-100 p-5 transition hover:border-brand-200"
            >
              {imageUrl ? <img src={imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-20" /> : null}
              <div className="relative flex w-full items-end justify-between gap-4">
                <div>
                  <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-surface px-3 py-1.5 text-caption font-semibold text-brand-500 shadow-xs">
                    <Icon size={14} aria-hidden="true" /> {category}
                  </span>
                  <h3 className="line-clamp-2 text-h3 font-semibold text-foreground">{title}</h3>
                  <p className="mt-1 text-body-sm text-muted-foreground">{description}</p>
                </div>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white transition group-hover:translate-x-0.5">
                  <ArrowRight size={18} aria-hidden="true" />
                </span>
              </div>
            </Link>
          ))}
        </motion.div>
      </div>

      {count > 1 ? (
        <div className="flex items-center justify-center gap-1.5">
          {items.map((item, index) => (
            <button
              key={item.href}
              type="button"
              onClick={() => slideTo(index)}
              aria-label={`Ir para ${item.category}`}
              aria-current={index === activeIndex ? 'true' : undefined}
              className={cn(
                'h-1.5 rounded-full transition-all duration-300',
                index === activeIndex ? 'theme-bg w-5' : 'w-1.5 bg-slate-300 hover:bg-slate-400',
              )}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
};
