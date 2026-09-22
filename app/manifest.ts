import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Gringoou',
    short_name: 'Gringoou',
    description:
      'Uma plataforma completa para a comunidade brasileira no exterior, oferecendo servicos de moradia, empregos, negocios locais, noticias e rede social.',
    id: '/inicio',
    start_url: '/inicio',
    scope: '/',
    display: 'standalone',
    background_color: '#f9f9f9',
    theme_color: '#0869d6',
    icons: [
      {
        src: '/assets/favicon/android-chrome-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/assets/favicon/android-chrome-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
