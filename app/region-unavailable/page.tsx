import type { Metadata } from 'next';
import { Globe2 } from 'lucide-react';
import { StatusPage } from '@/components/ui/StatusPage';

export const metadata: Metadata = {
  title: 'Gringoou - indisponível na sua região',
  description: 'O Gringoou não está disponível na sua região.',
  robots: { index: false },
};

export default function RegionUnavailablePage() {
  return (
    <StatusPage
      fullScreen
      icon={<Globe2 size={30} />}
      title="Ainda não chegamos à sua região"
      description="O Gringoou não está disponível onde você está no momento. Agradecemos o seu interesse!"
    />
  );
}
