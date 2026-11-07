import type { Metadata } from 'next';
import { Compass } from 'lucide-react';
import { StatusPage } from '@/components/ui/StatusPage';

export const metadata: Metadata = {
  title: 'Página não encontrada — Gringoou',
};

export default function NotFound() {
  return (
    <StatusPage
      fullScreen
      icon={<Compass size={30} />}
      code="404"
      title="Página não encontrada"
      description="O endereço que você tentou acessar não existe ou foi movido. Confira o link ou volte para a comunidade."
      actions={[
        { label: 'Ir para o início', href: '/home' },
        { label: 'Ver a comunidade', href: '/community', variant: 'secondary' },
      ]}
    />
  );
}
