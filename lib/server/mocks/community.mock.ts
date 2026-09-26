import 'server-only';

import type { Post, PostComment, PostLikeUser } from '@/types';
import type { CommunityPostsPage } from '@/lib/server/community-posts';
import { avatarFor, mockAuthor, type MockViewer } from './shared';

const MOCK_POST_BUSINESS_IDS: Record<string, string> = {
  'mock-post-2': 'mock-business-1',
};

const MOCK_POST_GROUP_IDS: Record<string, string> = {
  'mock-post-3': 'mock-group-1',
};

/**
 * Mutable in-memory store (persists for the life of the dev server process)
 * so that liking/commenting on a mock post behaves consistently across
 * requests instead of resetting every time the fixture is rebuilt.
 */
const MOCK_POSTS: Post[] = [
    {
      id: 'mock-post-1',
      author: mockAuthor('mock-user-1', 'Camila Souza', 'camila.souza'),
      authorHref: '/camila.souza',
      authorType: 'USER',
      content: 'Alguém tem indicação de dentista brasileiro aqui em Boston? Preciso marcar uma consulta essa semana!',
      createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      locationLabel: 'Boston, MA',
      imageUrl: null,
      externalUrl: null,
      likeCount: 12,
      commentCount: 2,
      viewerHasLiked: false,
      likedBy: [
        { id: 'mock-user-2', name: 'Rafael Lima', username: 'rafael.lima', image: avatarFor('rafael.lima') },
      ],
      comments: [
        {
          id: 'mock-comment-1',
          content: 'Recomendo o Dr. Marcos, atende em português!',
          createdAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
          author: mockAuthor('mock-user-2', 'Rafael Lima', 'rafael.lima'),
        },
      ],
      status: 'PUBLISHED',
      canEdit: false,
      canDelete: false,
      viewerHasSaved: false,
      viewerIsInterested: false,
    },
    {
      id: 'mock-post-2',
      author: mockAuthor('mock-business-1', 'Sabor Brasil Mercado', 'sabor.brasil'),
      authorHref: '/negocios/sabor-brasil',
      authorType: 'BUSINESS',
      content: 'Chegou pão de queijo fresquinho! Passa lá na loja até domingo com desconto para a comunidade. 🇧🇷',
      createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      locationLabel: 'Somerville, MA',
      imageUrl: 'https://picsum.photos/seed/mock-post-2/600/400',
      externalUrl: null,
      likeCount: 34,
      commentCount: 0,
      viewerHasLiked: true,
      likedBy: [],
      comments: [],
      status: 'PUBLISHED',
      canEdit: false,
      canDelete: false,
      viewerHasSaved: true,
      viewerIsInterested: false,
    },
    {
      id: 'mock-post-3',
      author: mockAuthor('mock-user-4', 'Thiago Alves', 'thiago.alves'),
      authorHref: '/thiago.alves',
      authorType: 'USER',
      content: 'Cheguei em Boston há 1 mês, alguém topa marcar um futebol de domingo?',
      createdAt: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
      locationLabel: 'Cambridge, MA',
      imageUrl: null,
      externalUrl: null,
      likeCount: 6,
      commentCount: 1,
      viewerHasLiked: false,
      likedBy: [],
      comments: [
        {
          id: 'mock-comment-2',
          content: 'Bora! Jogamos todo domingo no Danehy Park.',
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          author: mockAuthor('mock-user-2', 'Rafael Lima', 'rafael.lima'),
        },
      ],
      status: 'PUBLISHED',
      canEdit: false,
      canDelete: false,
    viewerHasSaved: false,
    viewerIsInterested: true,
  },
];

export function getMockCommunityPostsPage(businessId?: string | null, groupId?: string | null): CommunityPostsPage {
  const filtered = groupId
    ? MOCK_POSTS.filter((post) => MOCK_POST_GROUP_IDS[post.id] === groupId)
    : businessId
      ? MOCK_POSTS.filter((post) => MOCK_POST_BUSINESS_IDS[post.id] === businessId)
      : MOCK_POSTS;

  return { posts: filtered, hasMore: false, nextOffset: filtered.length, nextCursor: null };
}

const findMockPost = (postId: string) => MOCK_POSTS.find((post) => post.id === postId) ?? null;

export function toggleMockPostReaction(postId: string, viewer: MockViewer) {
  const post = findMockPost(postId);
  if (!post) return null;

  const alreadyLiked = post.likedBy.some((liker) => liker.id === viewer.id);
  const likeUser: PostLikeUser = { id: viewer.id, name: viewer.name, username: viewer.username ?? null, image: viewer.image ?? null };

  if (alreadyLiked) {
    post.likedBy = post.likedBy.filter((liker) => liker.id !== viewer.id);
    post.likeCount = Math.max(0, post.likeCount - 1);
    post.viewerHasLiked = false;
  } else {
    post.likedBy = [likeUser, ...post.likedBy].slice(0, 8);
    post.likeCount += 1;
    post.viewerHasLiked = true;
  }

  return { liked: post.viewerHasLiked, likeCount: post.likeCount, likedBy: post.likedBy };
}

export function addMockPostComment(postId: string, content: string, parentId: string | null, viewer: MockViewer): PostComment | null {
  const post = findMockPost(postId);
  if (!post) return null;

  const comment: PostComment = {
    id: `mock-comment-${Date.now()}`,
    content,
    createdAt: new Date().toISOString(),
    author: { id: viewer.id, name: viewer.name, username: viewer.username ?? null, image: viewer.image ?? null },
    canEdit: true,
    canDelete: true,
  };

  if (parentId) {
    const parent = post.comments.find((existing) => existing.id === parentId);
    if (!parent) return null;
    parent.replies = [...(parent.replies || []), { ...comment, parentId }];
  } else {
    post.comments = [...post.comments, comment];
  }
  post.commentCount += 1;

  return comment;
}

export function setMockPostPreference(postId: string, action: 'save' | 'interest') {
  const post = findMockPost(postId);
  if (!post) return null;

  if (action === 'save') post.viewerHasSaved = !post.viewerHasSaved;
  if (action === 'interest') post.viewerIsInterested = !post.viewerIsInterested;

  return { isSaved: Boolean(post.viewerHasSaved), isInterested: Boolean(post.viewerIsInterested) };
}
