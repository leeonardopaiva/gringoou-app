import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { BlockedPage } from '@/components/ui/BlockedPage';
import { RegionWaitlistForm } from '@/components/ui/RegionWaitlistForm';

export const metadata: Metadata = {
  title: 'Gringoou - indisponível na sua região',
  description: 'O Gringoou não está disponível na sua região.',
  robots: { index: false },
};

// A página é servida via rewrite do middleware, que mantém os headers da requisição.
// O país detectado vai junto com o e-mail para a lista de interesse.
const resolveCountryName = (code: string | null) => {
  if (!code) return undefined;
  try {
    return new Intl.DisplayNames(['pt-BR'], { type: 'region' }).of(code.toUpperCase()) ?? undefined;
  } catch {
    return undefined;
  }
};

export default async function RegionUnavailablePage() {
  const requestHeaders = await headers();
  const country = resolveCountryName(requestHeaders.get('x-vercel-ip-country'));

  return (
    <BlockedPage
      title={
        <>
          Ainda não chegamos
          <br />à sua região
        </>
      }
      description="O Gringoou não está disponível onde você está no momento. Agradecemos o seu interesse!"
    >
      <RegionWaitlistForm country={country} />
    </BlockedPage>
  );
}
