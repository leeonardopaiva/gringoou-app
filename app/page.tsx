import type { Metadata } from 'next';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { LandingHero } from '@/components/landing/LandingHero';
import { WaitlistSection } from '@/components/landing/WaitlistSection';

export const metadata: Metadata = {
  title: 'Gringoou — A comunidade brasileira no exterior',
  description:
    'Conecte-se com brasileiros ao redor do mundo em uma rede feita por imigrantes para imigrantes.',
};

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-hidden bg-[#f7f8fb]">
      <LandingHeader />
      <LandingHero />
      <WaitlistSection />
    </div>
  );
}
