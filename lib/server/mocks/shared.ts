import 'server-only';

export const avatarFor = (username: string) => `https://i.pravatar.cc/150?u=${username}`;

export const mockAuthor = (id: string, name: string, username: string) => ({
  id,
  name,
  username,
  image: avatarFor(username),
  locationLabel: 'Boston, MA',
});

export type MockListingComment = {
  id: string;
  content: string;
  isHidden: boolean;
  createdAt: string;
  canEdit: boolean;
  canDelete: boolean;
  canHide: boolean;
  author: { id: string; name: string; username: string; image: string };
  replies: MockListingComment[];
};

export type MockViewer = { id: string; name: string; username?: string | null; image?: string | null };

/**
 * Factory for a per-domain, in-memory comment store (persists for the life
 * of the dev server process) so jobs and housing listings each keep their
 * own mutable comment thread instead of sharing one frozen fixture.
 */
export function createMockListingCommentStore() {
  const comments: MockListingComment[] = [
    {
      id: 'mock-listing-comment-1',
      content: 'Ainda está disponível? Tenho interesse!',
      isHidden: false,
      createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      canEdit: false,
      canDelete: false,
      canHide: false,
      author: { id: 'mock-user-4', name: 'Thiago Alves', username: 'thiago.alves', image: avatarFor('thiago.alves') },
      replies: [
        {
          id: 'mock-listing-comment-1-reply-1',
          content: 'Sim! Pode chamar no WhatsApp do anúncio.',
          isHidden: false,
          createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
          canEdit: false,
          canDelete: false,
          canHide: false,
          author: { id: 'mock-user-2', name: 'Rafael Lima', username: 'rafael.lima', image: avatarFor('rafael.lima') },
          replies: [],
        },
      ],
    },
  ];

  return {
    getComments: () => ({ comments }),
    addComment: (content: string, parentId: string | null, viewer: MockViewer): MockListingComment | null => {
      const comment: MockListingComment = {
        id: `mock-listing-comment-${Date.now()}`,
        content,
        isHidden: false,
        createdAt: new Date().toISOString(),
        canEdit: true,
        canDelete: true,
        canHide: false,
        author: { id: viewer.id, name: viewer.name, username: viewer.username ?? '', image: viewer.image ?? '' },
        replies: [],
      };

      if (parentId) {
        const parent = comments.find((existing) => existing.id === parentId);
        if (!parent) return null;
        parent.replies.push(comment);
      } else {
        comments.push(comment);
      }

      return comment;
    },
  };
}
