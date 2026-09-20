import { ReactionType } from '@prisma/client';
import { NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { buildRateLimitHeaders, consumeRateLimit, getRateLimitKey } from '@/lib/rate-limit';
import { getGroupPostPermissions } from '@/lib/server/group-permissions';

type RouteContext = {
  params: Promise<{
    postId: string;
  }>;
};

const LIKERS_PREVIEW_LIMIT = 8;

const buildReactionPayload = async (postId: string) => {
  const [reactions, likeCount] = await Promise.all([
    prisma.postReaction.findMany({
      where: {
        postId,
        type: ReactionType.LIKE,
      },
      orderBy: [{ createdAt: 'desc' }],
      take: LIKERS_PREVIEW_LIMIT,
      select: {
        author: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
          },
        },
      },
    }),
    prisma.postReaction.count({
      where: {
        postId,
        type: ReactionType.LIKE,
      },
    }),
  ]);

  return {
    likeCount,
    likedBy: reactions.map((reaction) => ({
      id: reaction.author.id,
      name: reaction.author.name || 'Usuario da comunidade',
      username: reaction.author.username,
      image: reaction.author.image,
    })),
  };
};

export async function POST(_request: Request, context: RouteContext) {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rateLimit = await consumeRateLimit({
    scope: 'community:reaction',
    key: getRateLimitKey(_request, session.user.id),
    max: 60,
    windowMs: 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Muitas interacoes em pouco tempo. Aguarde um minuto.' },
      { status: 429, headers: buildRateLimitHeaders(rateLimit) },
    );
  }

  const { postId } = await context.params;
  const permissions = await getGroupPostPermissions(postId, session.user.id, session.user.role === 'ADMIN');
  if (!permissions) return NextResponse.json({ error: 'Publicação não encontrada.' }, { status: 404 });
  if (!permissions.canInteract) return NextResponse.json({ error: 'Apenas membros aprovados podem reagir.' }, { status: 403 });

  const existingReaction = await prisma.postReaction.findUnique({
    where: {
      postId_authorId_type: {
        postId,
        authorId: session.user.id,
        type: ReactionType.LIKE,
      },
    },
    select: { id: true },
  });

  if (existingReaction) {
    await prisma.postReaction.delete({
      where: {
        postId_authorId_type: {
          postId,
          authorId: session.user.id,
          type: ReactionType.LIKE,
        },
      },
    });

    return NextResponse.json({
      liked: false,
      ...(await buildReactionPayload(postId)),
    });
  }

  await prisma.postReaction.create({
    data: {
      postId,
      authorId: session.user.id,
      type: ReactionType.LIKE,
    },
  });

  return NextResponse.json({
    liked: true,
    ...(await buildReactionPayload(postId)),
  });
}
