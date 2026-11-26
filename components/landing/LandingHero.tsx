'use client';

import Image from 'next/image';
import { useLanguage } from '@/components/i18n/LanguageProvider';
import { CommunityMetrics } from './CommunityMetrics';
import { WaitlistSection } from './WaitlistSection';

function ActivityBadge({ kind }: { kind: 'member' | 'job' }) {
  const { tx } = useLanguage();
  const isMember = kind === 'member';
  return (
    <div className={`absolute z-10 flex items-center gap-2 rounded-full border border-[#e5e5e5] bg-[#f7f8fb] px-2.5 py-1.5 shadow-[0_6px_12px_rgba(0,0,0,0.12)] transition-shadow duration-300 hover:shadow-[0_12px_24px_rgba(15,43,99,0.18)] motion-reduce:animate-none lg:gap-3 lg:px-4 lg:py-2.5 lg:shadow-[0_8px_14px_rgba(0,0,0,0.12)] ${isMember ? 'left-3 top-[30%] animate-[landing-float_4s_ease-in-out_infinite] lg:left-[-28px] lg:top-[56%]' : 'right-3 top-[44%] animate-[landing-float-alt_4.5s_ease-in-out_infinite] lg:bottom-8 lg:right-[-20px] lg:top-auto'}`}>
      <span className="flex size-7 items-center justify-center rounded-full border border-[#0f2b63] lg:size-9">
        <Image src={isMember ? '/landing/play.svg' : '/landing/briefcase.svg'} alt="" width={14} height={14} />
      </span>
      <p className="whitespace-nowrap text-[10px] text-[#0f2b63] lg:text-sm">
        <strong className={`font-extrabold ${isMember ? '' : 'underline'}`}>{isMember ? tx('Brasileiro') : tx('Contrata-se')}</strong>{' '}{isMember ? tx('entrou') : tx('cozinheira')}
      </p>
    </div>
  );
}

/**
 * Hero da landing.
 * - Desktop: título e formulário na coluna da esquerda, foto no centro, números à direita.
 * - Celular: a foto vira o fundo (com degradê no topo e na base), o título fica centralizado no alto e o
 *   formulário aparece sobre a parte de baixo da foto.
 */
export function LandingHero() {
  const { t, tx, language } = useLanguage();
  // Em inglês a última linha ("around the world.") é bem mais longa: a fonte é menor para caber na coluna.
  const titleSize =
    language === 'en-US'
      ? 'text-[clamp(2.2rem,8.5vw,3rem)] lg:text-[clamp(2.2rem,3.2vw,3.4rem)]'
      : 'text-[clamp(2.75rem,10vw,3.4rem)] lg:text-[clamp(2.6rem,3.9vw,4.2rem)]';

  return (
    <main
      id="comunidade"
      className="relative isolate mx-auto grid w-full max-w-[1440px] px-5 pb-10 pt-2 sm:px-8 lg:grid-cols-[minmax(300px,1.05fr)_minmax(400px,1.1fr)_minmax(170px,.6fr)] lg:auto-rows-[minmax(clamp(520px,calc(100dvh-230px),720px),auto)] lg:px-16 lg:pb-6 lg:pt-8"
    >
      <section className="relative z-10 flex flex-col items-center text-center lg:items-start lg:justify-between lg:gap-8 lg:pt-4 lg:text-left">
        <h1 className={`font-extrabold leading-[0.92] tracking-[-0.045em] text-[#0f2b63] ${titleSize}`}>
          <span className="block">{t('landing.hero.1')}</span>
          <span className="block">{t('landing.hero.2')}</span>
          <span className="block">
            {t('landing.hero.3a')}{' '}
            <span className="bg-[linear-gradient(to_top,#f5f6b0_0,#f5f6b0_20%,transparent_20%)]">{t('landing.hero.3b')}</span>
          </span>
        </h1>

        {/* No celular o espaço abaixo do título deixa o rosto da foto aparecer antes do formulário. */}
        <div className="mt-[270px] w-full lg:mt-0 lg:max-w-[420px]">
          <WaitlistSection />
        </div>
      </section>

      <section className="absolute inset-x-0 top-14 -z-10 h-[600px] lg:relative lg:inset-auto lg:top-auto lg:z-0 lg:mx-auto lg:h-auto lg:w-full lg:max-w-[520px] lg:px-4">
        <div className="relative h-full w-full overflow-hidden [-webkit-mask-image:linear-gradient(to_bottom,transparent_0%,#000_24%,#000_58%,transparent_100%)] [mask-image:linear-gradient(to_bottom,transparent_0%,#000_24%,#000_58%,transparent_100%)] lg:rounded-[60px] lg:[-webkit-mask-image:none] lg:[mask-image:none]">
          <Image src="/landing/hero.jpg" alt={tx('Brasileira usando a comunidade Gringoou pelo celular')} fill priority className="object-cover object-center" sizes="(max-width: 1024px) 100vw, 40vw" />
        </div>
        <ActivityBadge kind="member" />
        <ActivityBadge kind="job" />
      </section>

      <CommunityMetrics />
    </main>
  );
}
