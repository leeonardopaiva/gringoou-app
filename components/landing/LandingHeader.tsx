import Image from 'next/image';
import Link from 'next/link';

const navigation = ['Para Você', 'Para Empresas', 'A Comunidade', 'Fale Conosco'];

export function LandingHeader() {
  return (
    <header className="mx-auto flex w-full max-w-[1440px] items-center justify-between gap-5 px-5 py-5 sm:px-8 lg:px-12 xl:px-16">
      <Link href="/" aria-label="Ir para a página inicial da Gringoou" className="shrink-0 transition-transform duration-300 hover:scale-[1.03]">
        <Image
          src="/assets/gringoou-logo.png"
          alt="Gringoou"
          width={141}
          height={36}
          priority
          className="h-9 w-auto object-contain"
        />
      </Link>
      <div className="hidden items-center gap-4 lg:flex xl:gap-6">
      <nav aria-label="Navegação principal" className="flex items-center">
        {navigation.map((item, index) => (
          <a
            key={item}
            href={item === 'Fale Conosco' ? 'mailto:contato@gringoou.com' : '#comunidade'}
            className={`px-4 text-sm text-[#0f2b63] transition-opacity hover:opacity-65 xl:px-6 ${index === 0 ? 'font-extrabold' : 'font-normal'} ${index > 0 ? 'border-l border-[#dde3ef]' : ''}`}
          >
            {item}
          </a>
        ))}
      </nav>
        <Link
          href="#lista"
          className="shrink-0 rounded-full bg-[#0086ff] px-5 py-3 text-sm font-extrabold text-white shadow-[0_8px_20px_rgba(0,134,255,0.22)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#006ed4] hover:shadow-[0_12px_24px_rgba(0,134,255,0.3)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0086ff]"
        >
          Fazer parte
        </Link>
      </div>
      <Link
        href="#lista"
        className="rounded-full bg-[#0086ff] px-4 py-2.5 text-xs font-extrabold text-white shadow-sm transition-colors hover:bg-[#006ed4] lg:hidden"
      >
        Fazer parte
      </Link>
    </header>
  );
}
