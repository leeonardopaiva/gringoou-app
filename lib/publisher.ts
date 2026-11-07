/**
 * "Quem publicou": define nome, imagem e destino do clique em avatares/assinaturas.
 * Regra do site: clicar em quem publicou leva sempre à página pública
 * (negócio -> página do negócio; pessoa -> perfil público).
 */
export type Publisher = {
  name: string;
  image: string | null;
  /** Destino público; nulo quando não há como abrir (ex.: pessoa sem nome público). */
  href: string | null;
  kind: 'USER' | 'BUSINESS';
};

type PublisherUser = { name?: string | null; username?: string | null; image?: string | null } | null | undefined;
type PublisherBusiness = { id: string; slug?: string | null; name?: string | null; imageUrl?: string | null } | null | undefined;

export function buildPublisher(user: PublisherUser, business?: PublisherBusiness, fallbackName = 'Comunidade Gringoou'): Publisher {
  if (business?.name) {
    return {
      name: business.name,
      image: business.imageUrl ?? null,
      href: `/businesses/${business.slug || business.id}`,
      kind: 'BUSINESS',
    };
  }
  return {
    name: user?.name || fallbackName,
    image: user?.image ?? null,
    href: user?.username ? `/${user.username}` : null,
    kind: 'USER',
  };
}
