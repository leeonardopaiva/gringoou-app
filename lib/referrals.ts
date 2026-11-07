import { prisma } from '@/lib/prisma';
import { getAppBaseUrl } from '@/lib/app-url';
import { normalizeUsernameInput, validateUsernameValue } from '@/lib/username';

export const buildReferralPath = (username: string) => `/invites/${normalizeUsernameInput(username)}`;

export const buildReferralUrl = (username: string, request?: Request) =>
  `${getAppBaseUrl(request)}${buildReferralPath(username)}`;

export const findReferrerByUsername = async (referralUsername?: string, currentUserId?: string) => {
  if (!referralUsername) {
    return null;
  }

  const normalized = normalizeUsernameInput(referralUsername);
  const validation = validateUsernameValue(normalized);

  if (validation.error) {
    return null;
  }

  return prisma.user.findFirst({
    where: {
      username: validation.normalized,
      NOT: currentUserId
        ? {
            id: currentUserId,
          }
        : undefined,
    },
    select: {
      id: true,
      username: true,
      name: true,
    },
  });
};

export const getReferralSummary = async (userId: string, username?: string | null, request?: Request) => {
  const registrations = await prisma.user.count({
    where: {
      referredById: userId,
      onboardingCompleted: true,
    },
  });

  return {
    referralUrl: username ? buildReferralUrl(username, request) : null,
    registrationCount: registrations,
  };
};
