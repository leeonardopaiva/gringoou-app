'use client';

import Image from 'next/image';
import { useLanguage } from '@/components/i18n/LanguageProvider';

export function SocialProof() {
  const { tx } = useLanguage();
  return (
    <div className="flex flex-col gap-5">
      <div className="flex max-w-[340px] items-center gap-4">
        <div className="relative size-[52px] shrink-0 overflow-hidden rounded-full border-2 border-[#dde3ef] p-0.5 sm:size-[68px]">
          <Image src="/landing/avatar.png" alt={tx('Integrante da comunidade')} fill className="rounded-full object-cover" sizes="68px" />
        </div>
        <p className="text-[12px] leading-[1.65] text-[#6b7a9e] sm:text-sm">
          {tx('Conecte-se com brasileiros ao redor do mundo através de uma rede feita por imigrante para imigrantes')}
        </p>
      </div>
      <div className="flex items-center gap-3" aria-hidden="true">
        <span className="size-2 rounded-full bg-[#e4eaf6]" />
        <span className="size-2 rounded-full bg-[#e4eaf6]" />
        <span className="size-2 rounded-full bg-brand-500" />
{/*         <Image src="/landing/arrow.svg" alt="" width={18} height={18} className="ml-2" />
 */}      </div>
    </div>
  );
}
