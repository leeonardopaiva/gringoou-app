import type React from 'react';
import { AdAccountProvider } from '@/components/ads/AdAccountProvider';
import { AdsShell } from '@/components/ads/AdsShell';
import { PanelsDictionary } from '@/components/i18n/PanelsDictionary';

export default function AdsLayout({ children }: { children: React.ReactNode }) {
  return (
    <PanelsDictionary>
      <AdAccountProvider><AdsShell>{children}</AdsShell></AdAccountProvider>
    </PanelsDictionary>
  );
}
