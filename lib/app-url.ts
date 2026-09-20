export const getAppBaseUrl = (request?: Request) => {
  const configuredUrl =
    process.env.APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, '');
  }

  const vercelUrl =
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
    process.env.VERCEL_URL?.trim();

  if (vercelUrl) {
    return vercelUrl.startsWith('http') ? vercelUrl.replace(/\/$/, '') : `https://${vercelUrl}`;
  }

  if (request) {
    return new URL(request.url).origin;
  }

  const authUrl = process.env.NEXTAUTH_URL?.trim();

  if (authUrl) {
    return authUrl.replace(/\/$/, '');
  }

  return 'http://localhost:3000';
};
