/** Endereço amigável da notícia: título legível + id (o id garante a unicidade). */
const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70)
    .replace(/-+$/g, '');

export const newsPath = (article: { id: string; title: string }) => {
  const slug = slugify(article.title);
  return slug ? `/news/${slug}-${article.id}` : `/news/${article.id}`;
};

/** Extrai o id da notícia do final do endereço (ids não têm hífen). */
export const newsIdFromSlug = (slug: string) => slug.split('-').pop() ?? slug;

/** O endereço recebido é o canônico? Se não, a página redireciona para o certo. */
export const isCanonicalNewsSlug = (slug: string, article: { id: string; title: string }) =>
  newsPath(article) === `/news/${slug}`;
