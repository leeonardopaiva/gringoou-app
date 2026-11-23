import type { Metadata } from 'next';
import { BlockedPage } from '@/components/ui/BlockedPage';

export const metadata: Metadata = {
  title: 'Gringoou em manutenção',
  description: 'A plataforma está temporariamente em manutenção.',
  robots: { index: false },
};

export default function MaintenancePage() {
  return (
    <BlockedPage
      title="Em manutenção"
      description="Estamos fazendo melhorias na plataforma. Voltamos em instantes."
    />
  );
}
