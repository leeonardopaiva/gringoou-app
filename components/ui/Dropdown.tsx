'use client';

import React, { useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/cn';

export interface DropdownItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

export interface DropdownSection {
  heading?: string;
  items: DropdownItem[];
}

export interface DropdownProps {
  trigger: React.ReactNode;
  sections: DropdownSection[];
  align?: 'left' | 'right';
  className?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({ trigger, sections, align = 'right', className }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className={cn('relative inline-block', className)}>
      <button type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        {trigger}
      </button>
      {open && (
        <div
          className={cn(
            'absolute z-[130] mt-2 w-56 overflow-hidden rounded-2xl border border-border bg-surface p-1.5 shadow-lg',
            align === 'right' ? 'right-0' : 'left-0',
          )}
          role="menu"
        >
          {sections.map((section, sectionIndex) => (
            <div key={section.heading ?? sectionIndex} className={sectionIndex > 0 ? 'border-t border-slate-100 pt-1' : undefined}>
              {section.heading && (
                <p className="px-3 pb-1 pt-2 text-caption font-bold uppercase tracking-wide text-muted-foreground">
                  {section.heading}
                </p>
              )}
              {section.items.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  onClick={() => {
                    if (item.disabled) return;
                    setOpen(false);
                    item.onClick();
                  }}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-body-sm font-medium transition-colors',
                    item.destructive ? 'text-red-600 hover:bg-red-50' : 'text-foreground hover:bg-brand-100',
                    item.disabled && 'cursor-not-allowed opacity-45',
                  )}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
