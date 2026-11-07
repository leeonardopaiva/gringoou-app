import type { Metadata } from 'next';
import { ShieldAlert } from 'lucide-react';
import { StatusPage } from '@/components/ui/StatusPage';

export const metadata: Metadata = {
  title: 'Gringoou - acesso bloqueado',
  description: 'Seu acesso está bloqueado no momento.',
};

export default function AccessBlockedPage() {
  return (
    <StatusPage
      fullScreen
      icon={<ShieldAlert size={30} />}
      title="Acesso bloqueado"
      description="Sua conta não está liberada para acessar o aplicativo neste momento. Se acredita que é um engano, entre em contato com o suporte."
      actions={[
        { label: 'Voltar ao login', href: '/login' },
        { label: 'Trocar conta Google', href: '/login?switchAccount=1', variant: 'secondary' },
      ]}
    />
  );
}
