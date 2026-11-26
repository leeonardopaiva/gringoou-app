import type { Metadata, Viewport } from 'next';
import { Sora } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { isInviteOnlyRegistration } from '@/lib/invites';
import { getCachedServerAuthSession } from '@/lib/server/auth-session';
import { Analytics } from '@vercel/analytics/next';
import UtmCapture from '@/components/analytics/UtmCapture';
import { THEME_INIT_SCRIPT } from '@/lib/theme';
import { getRequestLanguage } from '@/lib/i18n/server';
import { loadCoreDictionary } from '@/lib/i18n/loaders';

// Local/mock dev has no real traffic to measure, so skip the Vercel beacon entirely.
const shouldLoadVercelAnalytics = process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_USE_MOCKS !== 'true';

const sora = Sora({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sora',
});

export const metadata: Metadata = {
  title: 'Gringoou - Comunidade Brasileira',
  description:
    'Uma plataforma completa para a comunidade brasileira no exterior, oferecendo serviços de moradia, empregos, negócios locais, notícias e rede social.',
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
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f9f9f9' },
    { media: '(prefers-color-scheme: dark)', color: '#0b1117' },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getCachedServerAuthSession();
  const language = await getRequestLanguage();
  const dictionary = await loadCoreDictionary(language);

  return (
    // suppressHydrationWarning: o script do <head> define data-theme antes da hidratação.
    <html lang={language} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className={`${sora.className} ${sora.variable} bg-bg text-foreground`}>
        <script
          src="https://cdn.ably.io/lib/ably.min-1.js"
          integrity="sha384-1VctYsPyM44cfdPM4wtl9VekdhFjLP0JD+sph/uI7FHQeimgi5m30/Jst/IrcBTc"
          crossOrigin="anonymous"
          data-app="gringoou-app"
        />
        <Providers session={session} inviteRequired={isInviteOnlyRegistration()} initialLanguage={language} initialDictionary={dictionary}>{children}</Providers>
        <UtmCapture />
        {shouldLoadVercelAnalytics ? <Analytics /> : null}
      </body>
    </html>
  );
}
