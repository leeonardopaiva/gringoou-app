import 'server-only';

import { CommunityGroupMemberRole, CommunityGroupMembershipStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export async function getGroupPostPermissions(postId: string, userId?: string | null, platformAdmin = false) {
  const post = await prisma.communityPost.findUnique({
    where: { id: postId },
    select: {
      id: true, authorId: true, groupId: true,
      group: {
        select: {
          isPublic: true,
          members: userId ? { where: { userId }, take: 1, select: { role: true, status: true } } : false,
        },
      },
    },
  });
  if (!post) return null;
  const membership = post.group?.members?.[0];
  const approved = membership?.status === CommunityGroupMembershipStatus.APPROVED;
  return {
    post,
    canView: !post.groupId || Boolean(post.group?.isPublic || platformAdmin || approved),
    canInteract: !post.groupId || Boolean(platformAdmin || approved),
    canManage: platformAdmin || userId === post.authorId || Boolean(approved && membership && (membership.role === CommunityGroupMemberRole.OWNER || membership.role === CommunityGroupMemberRole.ADMIN || membership.role === CommunityGroupMemberRole.MODERATOR)),
  };
}
