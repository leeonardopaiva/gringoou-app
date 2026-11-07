import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs/config';

const isDevelopment = process.env.NODE_ENV === 'development';

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ''} https://js.stripe.com https://maps.googleapis.com https://www.googletagmanager.com https://cdn.ably.io`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  "connect-src 'self' https: wss:",
  "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://accounts.google.com https://www.openstreetmap.org",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://accounts.google.com",
  "frame-ancestors 'none'",
  ...(isDevelopment ? [] : ['upgrade-insecure-requests']),
].join('; ');

const nextConfig: NextConfig = {
  poweredByHeader: false,
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Ably SDK não é compatível com o webpack do Next; carregamos via CDN.
      config.externals = [...(config.externals || []), { ably: 'Ably' }];
    }
    return config;
  },
  // URLs antigas (pt-BR) -> novas (en). Permanentes para preservar links já compartilhados.
  async redirects() {
    return [
      { source: '/inicio', destination: '/home', permanent: true },
      { source: '/noticias', destination: '/news', permanent: true },
      { source: '/convite/:username', destination: '/invites/:username', permanent: true },
      { source: '/admin/noticias', destination: '/admin/news', permanent: true },
      { source: '/admin/convites', destination: '/admin/invites', permanent: true },
      { source: '/negocios', destination: '/businesses', permanent: true },
      { source: '/negocios/:path*', destination: '/businesses/:path*', permanent: true },
      { source: '/eventos', destination: '/events', permanent: true },
      { source: '/eventos/:path*', destination: '/events/:path*', permanent: true },
      { source: '/vagas', destination: '/jobs', permanent: true },
      { source: '/vagas/:path*', destination: '/jobs/:path*', permanent: true },
      { source: '/moradia', destination: '/housing', permanent: true },
      { source: '/moradia/:path*', destination: '/housing/:path*', permanent: true },
      { source: '/grupos', destination: '/groups', permanent: true },
      { source: '/grupos/:path*', destination: '/groups/:path*', permanent: true },
      { source: '/buscar', destination: '/search', permanent: true },
      { source: '/buscar/:path*', destination: '/search/:path*', permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: contentSecurityPolicy },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=(self), payment=(self)' },
          ...(isDevelopment
            ? []
            : [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }]),
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  silent: true,
  webpack: { treeshake: { removeDebugLogging: true } },
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
});

