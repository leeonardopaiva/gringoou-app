import 'server-only';

import { AdAccountRole, BusinessStatus } from '@prisma/client';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const AD_ACCOUNT_COOKIE = 'gringoou_ad_account';
export const MAX_AD_ACCOUNTS_PER_USER = 3;
export const AD_ACCOUNT_DRAFT_ROLES: AdAccountRole[] = [
  AdAccountRole.BUSINESS_ADMIN,
  AdAccountRole.ADMIN,
  AdAccountRole.EDITOR,
];

export const AD_ACCOUNT_CAMPAIGN_ROLES: AdAccountRole[] = [
  AdAccountRole.BUSINESS_ADMIN,
  AdAccountRole.ADMIN,
];

type PromotionAccount = {
  businessId: string | null;
  business?: { status: BusinessStatus } | null;
};

export function getPromotionEligibilityError(account: PromotionAccount) {
  if (!account.businessId || !account.business) {
    return {
      code: 'BUSINESS_PAGE_REQUIRED',
      error: 'Crie e vincule a página do negócio antes de promover.',
    };
  }
  if (account.business.status !== BusinessStatus.PUBLISHED) {
    return {
      code: 'BUSINESS_APPROVAL_REQUIRED',
      error: 'A página do negócio precisa ser aprovada antes de promover.',
    };
  }
  return null;
}

export function getCampaignDraftEligibilityError(account: PromotionAccount) {
  if (!account.businessId || !account.business) {
    return {
      code: 'BUSINESS_PAGE_REQUIRED',
      error: 'Crie e vincule a página do negócio antes de montar a campanha.',
    };
  }
  return null;
}

export async function getAdAccountMembership(userId: string, requestedAccountId?: string | null) {
  const cookieStore = await cookies();
  const selectedId = requestedAccountId || cookieStore.get(AD_ACCOUNT_COOKIE)?.value;

  if (selectedId) {
    const selected = await prisma.adAccountUser.findUnique({
      where: { adAccountId_userId: { adAccountId: selectedId, userId } },
      include: { adAccount: true },
    });
    if (selected) return selected;
  }

  return prisma.adAccountUser.findFirst({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    include: { adAccount: true },
  });
}

export function canEditAdDraft(role: AdAccountRole) {
  return AD_ACCOUNT_DRAFT_ROLES.includes(role);
}

export function canManageAdCampaign(role: AdAccountRole) {
  return AD_ACCOUNT_CAMPAIGN_ROLES.includes(role);
}

export function canManageAdBilling(role: AdAccountRole) {
  return role === AdAccountRole.BUSINESS_ADMIN;
}

export function canManageAdMembers(role: AdAccountRole) {
  return role === AdAccountRole.BUSINESS_ADMIN;
}

export function canViewAdReports(_role: AdAccountRole) {
  return true;
}

/** @deprecated Use a capability-specific check instead. */
export function canManageAdAccount(role: AdAccountRole) {
  return canEditAdDraft(role);
}

export async function requireAdAccountPage() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) redirect('/ads/login');
  const membership = await getAdAccountMembership(session.user.id);
  if (!membership) redirect('/ads/onboarding');
  return { session, membership };
}
