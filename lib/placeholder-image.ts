/** Imagem neutra (cinza claro) para itens sem foto; evita buscar imagens aleatórias na internet. */
export const PLACEHOLDER_IMAGE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="#f1f5f9"/><path d="M150 190l35-45 25 30 20-25 40 40z" fill="#cbd5e1"/><circle cx="165" cy="120" r="14" fill="#cbd5e1"/></svg>',
  );
