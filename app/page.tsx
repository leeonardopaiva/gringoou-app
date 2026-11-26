import type { Metadata } from 'next';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { LandingHero } from '@/components/landing/LandingHero';
import { LandingFooter } from '@/components/landing/LandingFooter';

export const metadata: Metadata = {
  title: 'Gringoou — A comunidade brasileira no exterior',
  description:
    'Conecte-se com brasileiros ao redor do mundo em uma rede feita por imigrantes para imigrantes.',
};

export default function LandingPage() {
  return (
    // Landing sempre clara (muitas imagens e cores próprias); o tema escuro vale só dentro do app.
    <div className="theme-light flex min-h-dvh flex-col overflow-hidden bg-wash-2">
      <LandingHeader />
      <LandingHero />
      <LandingFooter />
    </div>
  );
}
