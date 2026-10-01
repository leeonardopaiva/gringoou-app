import React from 'react';
import { cn } from '../../lib/cn';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padded?: boolean;
}

const CardRoot: React.FC<CardProps> = ({ padded = true, className, children, ...rest }) => (
  <div
    className={cn('overflow-hidden rounded-card bg-white shadow-sm', padded && 'p-5', className)}
    {...rest}
  >
    {children}
  </div>
);

const Media: React.FC<{ src?: string; alt?: string; badge?: React.ReactNode; className?: string; children?: React.ReactNode }> = ({
  src,
  alt = '',
  badge,
  className,
  children,
}) => (
  <div className={cn('relative -m-5 mb-4 aspect-[4/3] w-[calc(100%+2.5rem)] overflow-hidden bg-brand-100', className)}>
    {src ? <img src={src} alt={alt} className="h-full w-full object-cover" /> : children}
    {badge && <div className="absolute left-3 top-3">{badge}</div>}
  </div>
);

const Header: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...rest }) => (
  <div className={cn('mb-1 flex items-start justify-between gap-2', className)} {...rest} />
);

const Title: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({ className, ...rest }) => (
  <h3 className={cn('text-h3 font-bold text-text', className)} {...rest} />
);

const Description: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({ className, ...rest }) => (
  <p className={cn('text-body-sm text-slate-500', className)} {...rest} />
);

const Footer: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...rest }) => (
  <div className={cn('mt-4 flex items-center justify-between gap-3', className)} {...rest} />
);

export interface CardStatProps {
  label: string;
  value: string;
  icon?: React.ReactNode;
  delta?: React.ReactNode;
  caption?: string;
  progress?: number;
}

const Stat: React.FC<CardStatProps> = ({ label, value, icon, delta, caption, progress }) => (
  <div>
    <div className="mb-3 flex items-center justify-between">
      <span className="text-body-sm font-semibold text-slate-500">{label}</span>
      {icon && <span className="text-brand-500">{icon}</span>}
    </div>
    <div className="mb-1 flex items-center gap-2">
      <span className="text-h1 font-extrabold text-text">{value}</span>
      {delta}
    </div>
    {caption && <p className="mb-3 text-caption text-slate-400">{caption}</p>}
    {typeof progress === 'number' && (
      <div className="h-2 w-full overflow-hidden rounded-full bg-brand-100">
        <div
          className="h-full rounded-full bg-brand-500"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    )}
  </div>
);

export interface CardProfileProps {
  avatar: React.ReactNode;
  name: string;
  role?: string;
  badge?: React.ReactNode;
  action?: React.ReactNode;
}

const Profile: React.FC<CardProfileProps> = ({ avatar, name, role, badge, action }) => (
  <div className="flex items-center gap-3">
    {avatar}
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2">
        <span className="truncate text-body font-bold text-text">{name}</span>
        {badge}
      </div>
      {role && <span className="truncate text-body-sm text-slate-500">{role}</span>}
    </div>
    {action}
  </div>
);

export const Card = Object.assign(CardRoot, { Media, Header, Title, Description, Footer, Stat, Profile });
