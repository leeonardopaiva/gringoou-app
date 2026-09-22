import type { Metadata, Viewport } from 'next';
import { Sora } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { getCachedServerAuthSession } from '@/lib/server/auth-session';
import { SpeedInsights } from '@vercel/speed-insights/next';

const sora = Sora({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sora',
});

export const metadata: Metadata = {
  title: 'Gringoou - Comunidade Brasileira',
  description:
    'Uma plataforma completa para a comunidade brasileira no exterior, oferecendo servicos de moradia, empregos, negocios locais, noticias e rede social.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/assets/favicon/favicon.ico' },
      { url: '/assets/favicon/favicon-32x32.png', type: 'image/png', sizes: '32x32' },
      { url: '/assets/favicon/favicon-16x16.png', type: 'image/png', sizes: '16x16' },
    ],
    apple: [{ url: '/assets/favicon/apple-touch-icon.png', type: 'image/png', sizes: '180x180' }],
    shortcut: ['/assets/favicon/favicon.ico'],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Gringoou',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getCachedServerAuthSession();

  return (
    <html lang="pt-BR">
      <body className={`${sora.className} ${sora.variable} bg-bg text-foreground`}>
        <Providers session={session}>{children}</Providers>
        <SpeedInsights />
      </body>
    </html>
  );
}
