import React from 'react';
import { BriefcaseBusiness, CalendarDays, Inbox, MessagesSquare, Newspaper, Search, Users } from 'lucide-react';
import { cn } from '@/lib/cn';

const ICONS = {
  generic: Inbox,
  posts: Newspaper,
  business: BriefcaseBusiness,
  groups: Users,
  events: CalendarDays,
  search: Search,
  messages: MessagesSquare,
} as const;

export type EmptyNoticeIcon = keyof typeof ICONS;

/** Aviso amigável para listas sem conteúdo: ícone suave, título curto e uma frase de apoio (sem caixa tracejada). */
export const EmptyNotice: React.FC<{ title: string; description?: string; icon?: EmptyNoticeIcon; className?: string }> = ({ title, description, icon = 'generic', className }) => {
  const Icon = ICONS[icon];
  return (
    <div className={cn('flex flex-col items-center gap-2 px-6 py-10 text-center', className)}>
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400" aria-hidden>
        <Icon size={22} />
      </span>
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      {description ? <p className="max-w-xs text-xs leading-5 text-slate-400">{description}</p> : null}
    </div>
  );
};

export default EmptyNotice;
