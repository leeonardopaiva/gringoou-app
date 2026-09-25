'use client';

import React from 'react';
import { cn } from '../../lib/cn';
import { handleAvatarError } from '../../lib/avatar';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type AvatarStatus = 'online' | 'ausente' | 'offline';

const sizeClasses: Record<AvatarSize, string> = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-14 w-14 text-sm',
  lg: 'h-14 w-14 text-base',
  xl: 'h-20 w-20 text-xl',
};

const statusColor: Record<AvatarStatus, string> = {
  online: 'bg-emerald-500',
  ausente: 'bg-amber-400',
  offline: 'bg-slate-300',
};

const getInitials = (name: string) =>
  name
    .split(' ')
    .map((part) => part.trim()[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

export interface AvatarProps {
  src?: string | null;
  name: string;
  size?: AvatarSize;
  status?: AvatarStatus;
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ src, name, size = 'md', status, className }) => (
  <span className={cn('relative inline-flex shrink-0', sizeClasses[size], className)}>
    {src ? (
      <img
        src={src}
        alt={name}
        onError={handleAvatarError}
        className={cn('h-full w-full rounded-full object-cover ring-2 ring-white', sizeClasses[size])}
      />
    ) : (
      <span
        className={cn(
          'flex h-full w-full items-center justify-center rounded-full bg-brand-100 font-bold text-brand-500 ring-2 ring-white',
          sizeClasses[size],
        )}
      >
        {getInitials(name) || '?'}
      </span>
    )}
    {status && (
      <span
        className={cn(
          'absolute bottom-0 right-0 rounded-full ring-2 ring-white',
          statusColor[status],
          size === 'xs' || size === 'sm' ? 'h-2 w-2' : 'h-3 w-3',
        )}
      />
    )}
  </span>
);

export interface AvatarGroupProps {
  avatars: Array<{ src?: string | null; name: string }>;
  max?: number;
  size?: AvatarSize;
  className?: string;
  /** Total member count when it exceeds `avatars.length` (e.g. only preview avatars are available). */
  totalCount?: number;
}

export const AvatarGroup: React.FC<AvatarGroupProps> = ({ avatars, max = 4, size = 'sm', className, totalCount }) => {
  const visible = avatars.slice(0, max);
  const overflow = (totalCount ?? avatars.length) - visible.length;

  return (
    <span className={cn('flex items-center -space-x-2', className)}>
      {visible.map((avatar, index) => (
        <Avatar key={`${avatar.name}-${index}`} src={avatar.src} name={avatar.name} size={size} />
      ))}
      {overflow > 0 && (
        <span
          className={cn(
            'flex items-center justify-center rounded-full bg-slate-200 font-bold text-slate-600 ring-2 ring-white',
            sizeClasses[size],
          )}
        >
          +{overflow}
        </span>
      )}
    </span>
  );
};
