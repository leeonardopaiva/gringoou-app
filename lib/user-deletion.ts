import 'server-only';

import { AdAccountRole, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { MAX_AD_ACCOUNTS_PER_USER } from '@/lib/ads/account';

const impactSelect = {
  id: true, name: true, username: true, email: true, role: true,
  image: true, coverImageUrl: true, galleryUrls: true,
  _count: { select: {
    accounts: true, sessions: true, emailChangeTokens: true, businessMemberships: true,
    createdBusinesses: true, createdEvents: true, createdJobs: true, createdHousing: true,
    communityPosts: true, postComments: true, postReactions: true, postReports: true,
    suggestions: true, businessFavorites: true, eventFavorites: true,
    businessRatings: true, eventRatings: true, bannerRegistrations: true,
    sentFriendRequests: true, receivedFriendRequests: true, createdGroups: true,
    groupMemberships: true, createdAds: true, approvedAds: true, analyticsEvents: true,
    adCharges: true, adImpressions: true, adAccountMemberships: true,
  } },
  createdBusinesses: { select: {
    id: true, name: true, imageUrl: true, galleryUrls: true,
    _count: { select: { members: true, favorites: true, ratings: true, communityPosts: true, events: true } },
  } },
  createdEvents: { select: {
    id: true, title: true, imageUrl: true, galleryUrls: true,
    _count: { select: { favorites: true, ratings: true } },
  } },
  createdHousing: { select: { id: true, title: true, imageUrl: true } },
  communityPosts: { select: {
    imageUrl: true,
    _count: { select: { comments: true, reactions: true, reports: true } },
  } },
  createdGroups: { select: {
    id: true, name: true, imageUrl: true,
    _count: { select: { members: true } },
  } },
  adAccountMemberships: { select: {
    role: true,
    adAccount: { select: {
      id: true, name: true,
      users: { select: { userId: true, role: true } },
      banners: { where: { isActive: true }, select: { id: true } },
    } },
  } },
} satisfies Prisma.UserSelect;

export async function getUserDeletionImpact(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: impactSelect });
  if (!user) return null;

  const counts = {
    posts: user._count.communityPosts,
    comments: user._count.postComments,
    reactions: user._count.postReactions,
    reports: user._count.postReports,
    businesses: user._count.createdBusinesses,
    events: user._count.createdEvents,
    jobs: user._count.createdJobs,
    housing: user._count.createdHousing,
    groups: user._count.createdGroups,
    suggestions: user._count.suggestions,
    favorites: user._count.businessFavorites + user._count.eventFavorites,
    ratings: user._count.businessRatings + user._count.eventRatings,
    friendRequests: user._count.sentFriendRequests + user._count.receivedFriendRequests,
    bannerRegistrations: user._count.bannerRegistrations,
    businessMemberships: user._count.businessMemberships,
    groupMemberships: user._count.groupMemberships,
    adAccountMemberships: user._count.adAccountMemberships,
    authRecords: user._count.accounts + user._count.sessions + user._count.emailChangeTokens,
  };
  const preservedAsAnonymous = {
    analyticsEvents: user._count.analyticsEvents,
    adCharges: user._count.adCharges,
    adImpressions: user._count.adImpressions,
    createdAds: user._count.createdAds,
    approvedAds: user._count.approvedAds,
  };
  const cascadeEffects = {
    businessMembers: user.createdBusinesses.reduce((total, item) => total + item._count.members, 0),
    businessFavorites: user.createdBusinesses.reduce((total, item) => total + item._count.favorites, 0),
    businessRatings: user.createdBusinesses.reduce((total, item) => total + item._count.ratings, 0),
    eventFavorites: user.createdEvents.reduce((total, item) => total + item._count.favorites, 0),
    eventRatings: user.createdEvents.reduce((total, item) => total + item._count.ratings, 0),
    postComments: user.communityPosts.reduce((total, item) => total + item._count.comments, 0),
    postReactions: user.communityPosts.reduce((total, item) => total + item._count.reactions, 0),
    postReports: user.communityPosts.reduce((total, item) => total + item._count.reports, 0),
    groupMembers: user.createdGroups.reduce((total, item) => total + item._count.members, 0),
  };
  const detachedRelations = {
    businessPosts: user.createdBusinesses.reduce((total, item) => total + item._count.communityPosts, 0),
    businessEvents: user.createdBusinesses.reduce((total, item) => total + item._count.events, 0),
  };
  const criticalAdAccounts = user.adAccountMemberships.flatMap(({ role, adAccount }) => {
    const otherMembers = adAccount.users.filter((member) => member.userId !== user.id);
    const otherBusinessAdmins = otherMembers.filter((member) => member.role === AdAccountRole.BUSINESS_ADMIN);
    const requiresTransfer = otherMembers.length === 0 || (role === AdAccountRole.BUSINESS_ADMIN && otherBusinessAdmins.length === 0);
    return requiresTransfer ? [{
      id: adAccount.id, name: adAccount.name, activeCampaigns: adAccount.banners.length,
      reason: otherMembers.length === 0 ? 'Sem outros membros' : 'Sem outro administrador principal',
    }] : [];
  });

  const assetUrls = new Set<string>();
  const addUrl = (value?: string | null) => { if (value) assetUrls.add(value); };
  addUrl(user.image); addUrl(user.coverImageUrl); user.galleryUrls.forEach(addUrl);
  user.createdBusinesses.forEach((item) => { addUrl(item.imageUrl); item.galleryUrls.forEach(addUrl); });
  user.createdEvents.forEach((item) => { addUrl(item.imageUrl); item.galleryUrls.forEach(addUrl); });
  user.createdHousing.forEach((item) => addUrl(item.imageUrl));
  user.communityPosts.forEach((item) => addUrl(item.imageUrl));
  user.createdGroups.forEach((item) => addUrl(item.imageUrl));

  return {
    user: { id: user.id, name: user.name, username: user.username, email: user.email, role: user.role },
    confirmationValue: user.username || user.email || user.id,
    counts,
    cascadeEffects,
    detachedRelations,
    preservedAsAnonymous,
    ownedContentCount: counts.businesses + counts.events + counts.jobs + counts.housing + counts.posts + counts.groups,
    criticalAdAccounts,
    requiresAdAccountTransfer: criticalAdAccounts.length > 0,
    externalAssetUrls: Array.from(assetUrls),
    ownedResources: {
      businesses: user.createdBusinesses.map(({ id, name }) => ({ id, label: name })),
      groups: user.createdGroups.map(({ id, name }) => ({ id, label: name })),
    },
  };
}

type DeleteOptions = { userId: string; transferToUserId?: string; deleteOwnedContent: boolean };

export async function deleteUserSafely({ userId, transferToUserId, deleteOwnedContent }: DeleteOptions) {
  const impact = await getUserDeletionImpact(userId);
  if (!impact) throw new Error('USER_NOT_FOUND');
  if (transferToUserId === userId) throw new Error('INVALID_TRANSFER_TARGET');
  const transferTarget = transferToUserId
    ? await prisma.user.findUnique({
        where: { id: transferToUserId },
        select: { id: true, adAccountMemberships: { select: { adAccountId: true } } },
      })
    : null;
  if (transferToUserId && !transferTarget) throw new Error('TRANSFER_TARGET_NOT_FOUND');
  if (!transferTarget && impact.requiresAdAccountTransfer) throw new Error('AD_ACCOUNT_TRANSFER_REQUIRED');
  if (transferTarget) {
    const existingAccountIds = new Set(transferTarget.adAccountMemberships.map((item) => item.adAccountId));
    const addedAccounts = impact.criticalAdAccounts.filter((account) => !existingAccountIds.has(account.id)).length;
    if (existingAccountIds.size + addedAccounts > MAX_AD_ACCOUNTS_PER_USER) throw new Error('TRANSFER_ACCOUNT_LIMIT');
  }
  const affectedRecordCount = Object.values(impact.counts).reduce((total, count) => total + count, 0);
  if (affectedRecordCount > 0 && !deleteOwnedContent) throw new Error('DATA_LOSS_ACKNOWLEDGEMENT_REQUIRED');

  const result = await prisma.$transaction(async (tx) => {
    let transferredResources = 0;
    if (transferTarget) {
      const businessIds = impact.ownedResources.businesses.map((item) => item.id);
      const groupIds = impact.ownedResources.groups.map((item) => item.id);
      const updates = await Promise.all([
        tx.business.updateMany({ where: { createdById: userId }, data: { createdById: transferTarget.id } }),
        tx.event.updateMany({ where: { createdById: userId }, data: { createdById: transferTarget.id } }),
        tx.job.updateMany({ where: { createdById: userId }, data: { createdById: transferTarget.id } }),
        tx.housing.updateMany({ where: { createdById: userId }, data: { createdById: transferTarget.id } }),
        tx.communityGroup.updateMany({ where: { createdById: userId }, data: { createdById: transferTarget.id } }),
      ]);
      transferredResources = updates.reduce((total, update) => total + update.count, 0);
      if (businessIds.length) {
        await tx.businessMember.updateMany({ where: { businessId: { in: businessIds }, userId: transferTarget.id }, data: { role: 'OWNER' } });
        await tx.businessMember.createMany({ data: businessIds.map((businessId) => ({ businessId, userId: transferTarget.id, role: 'OWNER' })), skipDuplicates: true });
      }
      if (groupIds.length) {
        await tx.communityGroupMember.updateMany({ where: { groupId: { in: groupIds }, userId: transferTarget.id }, data: { role: 'OWNER' } });
        await tx.communityGroupMember.createMany({ data: groupIds.map((groupId) => ({ groupId, userId: transferTarget.id, role: 'OWNER' })), skipDuplicates: true });
      }
      for (const account of impact.criticalAdAccounts) {
        await tx.adAccountUser.upsert({
          where: { adAccountId_userId: { adAccountId: account.id, userId: transferTarget.id } },
          create: { adAccountId: account.id, userId: transferTarget.id, role: AdAccountRole.BUSINESS_ADMIN },
          update: { role: AdAccountRole.BUSINESS_ADMIN },
        });
      }
    }
    await tx.user.delete({ where: { id: userId } });
    return { transferredResources };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  return {
    ...result,
    anonymizedRecords: Object.values(impact.preservedAsAnonymous).reduce((total, count) => total + count, 0),
    externalAssetUrls: impact.externalAssetUrls,
  };
}
