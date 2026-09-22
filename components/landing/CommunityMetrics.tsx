import Image from 'next/image';

const circularLabel = 'REDE SOCIAL • IMIGRANTE • BRASILEIRO • ';

function CommunitySeal() {
  return (
    <span className="relative block size-[150px] shrink-0" aria-hidden="true">
      <span className="absolute inset-0 animate-[landing-spin_22s_linear_infinite] motion-reduce:animate-none">
        {[...circularLabel].map((character, index) => (
          <span
            key={`${character}-${index}`}
            className="absolute left-1/2 top-1/2 text-[11px] font-extrabold text-[#0f2b63]"
            style={{ transform: `rotate(${index * (360 / circularLabel.length)}deg) translateY(-66px)`, transformOrigin: '0 0' }}
          >
            {character === ' ' ? '\u00a0' : character}
          </span>
        ))}
      </span>
      <span className="absolute inset-0 m-auto flex size-[54px] items-center justify-center rounded-full bg-[#0f2b63] shadow-[0_8px_20px_rgba(15,43,99,0.2)] transition-transform duration-300 group-hover:scale-110">
        <Image src="/landing/arrow-right.svg" alt="" width={28} height={28} />
      </span>
    </span>
  );
}

export function CommunityMetrics() {
  return (
    <aside className="flex items-end justify-between gap-8 lg:h-[720px] lg:flex-col lg:items-start lg:py-8">
      <div className="flex gap-8 lg:flex-col lg:gap-16">
        <div>
          <strong className="block text-5xl font-extrabold tracking-[-0.04em] text-[#0f2b63] sm:text-7xl lg:text-[100px] lg:leading-[0.78]">+5 M</strong>
          <span className="mt-3 block text-[10px] font-bold uppercase leading-4 tracking-[0.08em] text-[#6b7a9e]">Brasileiros<br />pelo mundo</span>
        </div>
        <div>
          <strong className="block text-5xl font-extrabold tracking-[-0.04em] text-[#0f2b63] sm:text-7xl lg:text-[100px] lg:leading-[0.78]">
            <span className="ml-1 text-[0.6em] text-[#0086ff]"> +</span> 130
          </strong>
          <span className="mt-3 block text-[10px] font-bold uppercase leading-4 tracking-[0.08em] text-[#6b7a9e]">Países com <br />brasileiros conectados</span>
        </div>
      </div>
      <a href="/login" aria-label="Fazer parte da rede social Gringoou" className="group hidden rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0086ff] lg:block">
        <CommunitySeal />
      </a>
    </aside>
  );
}
