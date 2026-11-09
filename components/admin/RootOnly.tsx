'use client';

import React from 'react';
import { useRootAdmin } from '@/hooks/useRootAdmin';
import { EmptyNotice } from '@/components/ui/EmptyNotice';

/** Mostra o conteúdo só para o administrador raiz; as APIs também conferem no servidor. */
export default function RootOnly({ children }: { children: React.ReactNode }) {
  const root = useRootAdmin();
  if (root === null) return <div className="p-10 text-center text-sm text-slate-400">Carregando...</div>;
  if (!root) return <EmptyNotice title="Acesso restrito" description="Esta área é exclusiva do administrador raiz." />;
  return <>{children}</>;
}
