import React from 'react';
import { cn } from '@/lib/cn';

export type ContentColumnSize = 'compact' | 'feed' | 'reading' | 'standard' | 'wide';

export interface ContentColumnProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: ContentColumnSize;
}

const widths: Record<ContentColumnSize, string> = {
  compact: 'max-w-[620px]',
  feed: 'max-w-[600px]',
  reading: 'max-w-[720px]',
  standard: 'max-w-[1120px]',
  wide: 'max-w-[1600px]',
};

export const ContentColumn = React.forwardRef<HTMLDivElement, ContentColumnProps>(
  ({ size = 'feed', className, ...props }, ref) => (
    <div ref={ref} className={cn('mx-auto w-full', widths[size], className)} {...props} />
  ),
);

ContentColumn.displayName = 'ContentColumn';
