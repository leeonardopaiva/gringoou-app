type DevMagicLinkRecord = {
  email: string;
  url: string;
  expiresAt: string;
  createdAt: string;
};

declare global {
  var __gringoouDevMagicLinks: Map<string, DevMagicLinkRecord> | undefined;
}

const devMagicLinks = globalThis.__gringoouDevMagicLinks ?? new Map<string, DevMagicLinkRecord>();

if (!globalThis.__gringoouDevMagicLinks) {
  globalThis.__gringoouDevMagicLinks = devMagicLinks;
}

export const isDevAuthEnabled =
  process.env.NODE_ENV !== 'production' && process.env.DEV_AUTH_ENABLED === 'true';

export const normalizeMagicLinkEmail = (identifier: string) =>
  identifier.trim().toLowerCase().split(',')[0];

export const saveDevMagicLink = (identifier: string, url: string, expires: Date) => {
  const email = normalizeMagicLinkEmail(identifier);

  devMagicLinks.set(email, {
    email,
    url,
    expiresAt: expires.toISOString(),
    createdAt: new Date().toISOString(),
  });
};

export const getDevMagicLink = (identifier: string) => {
  const email = normalizeMagicLinkEmail(identifier);
  const link = devMagicLinks.get(email);

  if (!link) {
    return null;
  }

  if (new Date(link.expiresAt).getTime() <= Date.now()) {
    devMagicLinks.delete(email);
    return null;
  }

  return link;
};
