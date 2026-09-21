'use client';

import React from 'react';
import { ShieldAlert } from 'lucide-react';
import AdminPanel from '@/views/AdminPanel';
import AdminShell from '@/components/admin/AdminShell';
import GroupReportsSection from '@/components/admin/GroupReportsSection';
import { UserRole, type User } from '@/types';

type AdminWorkspaceProps = {
  currentUser: User;
  pathname: string;
};

const AdminAccessDenied: React.FC = () => (
  <div className="px-5 pt-4">
    <div className="rounded-[32px] border border-slate-100 bg-white p-6 shadow-sm">
      <div className="inline-flex h-14 w-14 items-center justify-center rounded-3xl bg-red-50 text-red-600">
        <ShieldAlert size={28} />
      </div>
      <h1 className="mt-5 text-h2 font-bold text-foreground">Acesso restrito</h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        Seu usuario nao possui permissao de administrador para acessar esta area.
      </p>
    </div>
  </div>
);

const AdminWorkspace: React.FC<AdminWorkspaceProps> = ({ currentUser, pathname }) => {
  const isModerator = currentUser.role === UserRole.MODERATOR;
  if (currentUser.role !== UserRole.ADMIN && !isModerator) {
    return <AdminAccessDenied />;
  }

  const segment = pathname.split('/')[2] || '';
  if (isModerator) {
    if (segment !== 'moderation') return <AdminAccessDenied />;
    return <AdminShell user={currentUser}><div className="mx-auto max-w-6xl p-5 sm:p-8"><GroupReportsSection /></div></AdminShell>;
  }
  const sectionBySegment = {
    ads: 'ads',
    moderation: 'moderation',
    businesses: 'businesses',
    events: 'events',
    users: 'users',
    regions: 'regions',
    imports: 'imports',
    banners: 'banners',
    analytics: 'analytics',
  } as const;
  const initialSection = sectionBySegment[segment as keyof typeof sectionBySegment] ?? 'overview';

  return <AdminShell user={currentUser}><AdminPanel user={currentUser} initialSection={initialSection} /></AdminShell>;
};

export default AdminWorkspace;
