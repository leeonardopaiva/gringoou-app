'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
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
  const carouselRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (items.length <= 1) return;

    const interval = window.setInterval(() => {
      const carousel = carouselRef.current;
      if (!carousel) return;

      const nextIndex = (activeIndex + 1) % items.length;
      const nextCard = carousel.children.item(nextIndex) as HTMLElement | null;
      if (!nextCard) return;

      carousel.scrollTo({ left: nextCard.offsetLeft - carousel.offsetLeft, behavior: 'smooth' });
      setActiveIndex(nextIndex);
    }, 3000);

    return () => window.clearInterval(interval);
  }, [activeIndex, items.length]);

  return (
  <section className={cn('space-y-3', className)} aria-labelledby="trends-title">
    <div className="flex items-center justify-between gap-4">
      <h2 id="trends-title" className="text-body-sm font-bold text-foreground">Trends</h2>
      <span className="text-caption font-semibold text-muted-foreground">Deslize para explorar</span>
    </div>
    <div
      ref={carouselRef}
      onScroll={(event) => {
        const carousel = event.currentTarget;
        const cards = Array.from(carousel.children) as HTMLElement[];
        if (cards.length === 0) return;
        const nearestIndex = cards.reduce((nearest, card, index) =>
          Math.abs(card.offsetLeft - carousel.offsetLeft - carousel.scrollLeft) <
          Math.abs(cards[nearest].offsetLeft - carousel.offsetLeft - carousel.scrollLeft)
            ? index
            : nearest, 0);
        setActiveIndex(nearestIndex);
      }}
      className="scrollbar-hide -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 md:-mx-6 md:px-6"
    >
      {items.map(({ href, category, title, description, icon: Icon, imageUrl }) => (
        <Link
          key={href}
          href={href}
          className="group relative flex min-h-52 w-full flex-none snap-center items-end overflow-hidden rounded-card border border-brand-100 bg-brand-100 p-5 transition hover:border-brand-200"
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
    </div>
  </section>
  );
};
