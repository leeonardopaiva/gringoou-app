'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';

type RootProps = React.HTMLAttributes<HTMLElement> & {
  variant?: 'community' | 'business' | 'sponsored';
};

type HeaderProps = React.HTMLAttributes<HTMLDivElement> & {
  avatarUrl: string;
  avatarAlt: string;
  title: string;
  subtitle?: React.ReactNode;
  href?: string;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  onAvatarError?: React.ReactEventHandler<HTMLImageElement>;
};

type MediaProps = React.HTMLAttributes<HTMLDivElement> & {
  src: string;
  alt: string;
  aspect?: 'landscape' | 'square';
};

type ContentProps = React.HTMLAttributes<HTMLDivElement> & {
  text?: string;
  clampAt?: number;
};

const Root = React.forwardRef<HTMLElement, RootProps>(
  ({ variant = 'community', className, ...props }, ref) => (
    <article
      ref={ref}
      data-variant={variant}
      className={cn(
        'overflow-hidden rounded-card border border-slate-200/80 bg-surface shadow-sm',
        variant === 'sponsored' && 'border-brand-100',
        className,
      )}
      {...props}
    />
  ),
);
Root.displayName = 'FeedCard.Root';

const Header: React.FC<HeaderProps> = ({
  avatarUrl,
  avatarAlt,
  title,
  subtitle,
  href,
  badge,
  action,
  onAvatarError,
  className,
  ...props
}) => {
  const identity = (
    <div className="flex min-w-0 items-center gap-3">
      <img
        src={avatarUrl}
        alt={avatarAlt}
        loading="lazy"
        decoding="async"
        onError={onAvatarError}
        className="h-10 w-10 shrink-0 rounded-full border border-slate-100 object-cover"
      />
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="truncate text-sm font-bold text-foreground">{title}</h3>
          {badge}
        </div>
        {subtitle ? <div className="mt-0.5 truncate text-[11px] text-muted-foreground">{subtitle}</div> : null}
      </div>
    </div>
  );

  return (
    <div className={cn('flex items-center justify-between gap-3 px-5 pb-3 pt-4', className)} {...props}>
      {href ? <Link href={href} className="min-w-0 transition hover:opacity-80">{identity}</Link> : identity}
      {action}
    </div>
  );
};

const Content: React.FC<ContentProps> = ({ text, clampAt = 280, children, className, ...props }) => {
  const [expanded, setExpanded] = React.useState(false);
  const shouldClamp = Boolean(text && text.length > clampAt);
  const visibleText = shouldClamp && !expanded ? `${text!.slice(0, clampAt).trimEnd()}...` : text;

  return (
    <div className={cn('px-5 pb-4', className)} {...props}>
      {text ? <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{visibleText}</p> : children}
      {shouldClamp ? (
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-brand-600 hover:text-brand-700"
          aria-expanded={expanded}
        >
          {expanded ? 'Ver menos' : 'Ver mais'}
          <ChevronDown size={13} className={cn('transition-transform', expanded && 'rotate-180')} />
        </button>
      ) : null}
    </div>
  );
};

const Media: React.FC<MediaProps> = ({ src, alt, aspect = 'landscape', className, ...props }) => (
  <div className={cn('w-full overflow-hidden bg-bg', aspect === 'square' ? 'aspect-square' : 'aspect-[4/3]', className)} {...props}>
    <img src={src} alt={alt} loading="lazy" decoding="async" className="h-full w-full object-cover transition-opacity duration-300" />
  </div>
);

const Headline: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({ className, ...props }) => (
  <h4 className={cn('px-5 pt-4 text-base font-bold leading-snug text-foreground', className)} {...props} />
);

const CTA: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ className, ...props }) => (
  <button
    type="button"
    className={cn(
      'inline-flex min-h-10 w-full items-center justify-center rounded-full bg-brand-500 px-5 text-sm font-bold text-white transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 disabled:opacity-60',
      className,
    )}
    {...props}
  />
);

const Footer: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div className={cn('border-t border-slate-100 px-5 py-3', className)} {...props} />
);

const SponsoredBadge: React.FC = () => (
  <span className="inline-flex shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-brand-700">
    Patrocinado
  </span>
);

export const FeedCard = Object.assign(Root, { Root, Header, Content, Media, Headline, CTA, Footer, SponsoredBadge });
