import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs/config';

const isDevelopment = process.env.NODE_ENV === 'development';

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ''} https://js.stripe.com https://maps.googleapis.com https://www.googletagmanager.com`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  "connect-src 'self' https: wss:",
  "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://accounts.google.com",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://accounts.google.com",
  "frame-ancestors 'none'",
  ...(isDevelopment ? [] : ['upgrade-insecure-requests']),
].join('; ');

const nextConfig: NextConfig = {
  poweredByHeader: false,
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
