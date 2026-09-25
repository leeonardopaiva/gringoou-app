import Image from 'next/image';
import { CommunityMetrics } from './CommunityMetrics';
import { SocialProof } from './SocialProof';

function ActivityBadge({ kind }: { kind: 'member' | 'job' }) {
  const isMember = kind === 'member';
  return (
    <div className={`absolute z-10 flex items-center gap-3 rounded-full border border-[#e5e5e5] bg-[#f7f8fb] px-3 py-2.5 shadow-[0_8px_14px_rgba(0,0,0,0.12)] transition-shadow duration-300 hover:shadow-[0_12px_24px_rgba(15,43,99,0.18)] motion-reduce:animate-none sm:px-4 ${isMember ? 'left-2 top-[56%] animate-[landing-float_4s_ease-in-out_infinite] sm:left-[-28px]' : 'bottom-8 right-1 animate-[landing-float-alt_4.5s_ease-in-out_infinite] sm:right-[-20px]'}`}>
      <span className="flex size-9 items-center justify-center rounded-full border border-[#0f2b63]">
        <Image src={isMember ? '/landing/play.svg' : '/landing/briefcase.svg'} alt="" width={14} height={14} />
      </span>
      <p className="whitespace-nowrap text-[11px] text-[#0f2b63] sm:text-sm">
        <strong className={`font-extrabold ${isMember ? '' : 'underline'}`}>{isMember ? 'Brasileiro' : 'Contrata-se'}</strong>{isMember ? ' entrou' : ' cozinheira'}
      </p>
    </div>
  );
}

export function LandingHero() {
  return (
    <main id="comunidade" className="mx-auto grid w-full max-w-[1440px] gap-10 px-5 pb-12 pt-5 sm:px-8 lg:grid-cols-[minmax(280px,1fr)_minmax(400px,1.15fr)_minmax(170px,.65fr)] lg:gap-0 lg:px-16 lg:pt-10">
      <section className="flex flex-col justify-between gap-12 lg:min-h-[720px] lg:pb-12 lg:pt-5">
        <h1 className="font-extrabold tracking-[-0.045em] text-[#0f2b63]">
          <span className="block text-[clamp(4rem,8vw,2.625rem)] leading-[0.9] text-[12px]">Comunidade</span>
          <span className="block text-[clamp(4.5rem,10vw,5rem)] leading-[0.77]">brasileira <br />pelo</span>
          <span className="mt-4 block w-fit border-t-[10px] border-[#f5f6b0] pt-1 text-[clamp(2.5rem,5vw,5.75rem)] leading-tight tracking-[-0.04em]">mundo.</span>
        </h1>
        <SocialProof />
      </section>

      <section className="relative mx-auto h-[560px] w-full max-w-[520px] lg:h-[720px] lg:px-4">
        <div className="relative h-full w-full overflow-hidden rounded-[42px] lg:rounded-[60px]">
          <Image src="/landing/hero.jpg" alt="Brasileira usando a comunidade Gringoou pelo celular" fill priority className="object-cover object-center" sizes="(max-width: 1024px) 100vw, 40vw" />
        </div>
        <ActivityBadge kind="member" />
        <ActivityBadge kind="job" />
      </section>

      <CommunityMetrics />
    </main>
  );
}
