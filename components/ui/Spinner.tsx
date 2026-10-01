import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn';

const sizeMap = { xs: 14, sm: 18, md: 24, lg: 32 } as const;

export const Spinner: React.FC<{ size?: keyof typeof sizeMap; className?: string }> = ({
  size = 'md',
  className,
}) => <Loader2 size={sizeMap[size]} className={cn('animate-spin text-brand-500', className)} />;
