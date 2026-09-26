import 'server-only';

import { avatarFor } from './shared';
import { MOCK_BUSINESSES } from './businesses.mock';
import { MOCK_EVENTS } from './events.mock';

/** Mutable in-memory friend-request status per mock profile (dev-server lifetime). */
const mockFriendStatuses = new Map<string, 'pending_sent' | 'accepted'>();

export function getMockPublicProfile(username: string) {
  const normalized = username.trim().toLowerCase();
  const displayName = normalized
    .split(/[.\-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || 'Membro da comunidade';
  const friendStatus = mockFriendStatuses.get(normalized) ?? 'none';

  return {
    profile: {
      id: `mock-author-${normalized}`,
      name: displayName,
      username: normalized,
      image: avatarFor(normalized),
      coverImageUrl: null,
      bio: 'Brasileiro(a) na comunidade Gringoou, sempre pronto(a) para ajudar quem está chegando.',
      interests: ['Futebol', 'Culinária brasileira', 'Networking'],
      galleryUrls: [],
      locationLabel: 'Boston, MA',
      birthCity: 'São Paulo, SP',
      joinedAt: new Date(Date.now() - 180 * 86400000).toISOString(),
      publicPath: `/${normalized}`,
      friendFeature: {
        available: true,
        canRequest: friendStatus === 'none',
        status: friendStatus,
        requestId: friendStatus === 'none' ? null : `mock-friend-request-${normalized}`,
      },
      stats: { friendCount: 12, businessCount: 1, eventCount: 1, postCount: 3 },
      friends: [
        { id: 'mock-user-2', name: 'Rafael Lima', username: 'rafael.lima', locationLabel: 'Boston, MA', publicPath: '/rafael.lima' },
        { id: 'mock-user-1', name: 'Camila Souza', username: 'camila.souza', locationLabel: 'Somerville, MA', publicPath: '/camila.souza' },
      ],
      groups: [],
      businesses: [
        {
          id: MOCK_BUSINESSES[0].id,
          slug: MOCK_BUSINESSES[0].slug,
          name: MOCK_BUSINESSES[0].name,
          category: MOCK_BUSINESSES[0].category,
          imageUrl: MOCK_BUSINESSES[0].imageUrl,
          locationLabel: MOCK_BUSINESSES[0].locationLabel,
          ratingAverage: MOCK_BUSINESSES[0].ratingAverage,
          ratingCount: MOCK_BUSINESSES[0].ratingCount,
        },
      ],
      events: [
        {
          id: MOCK_EVENTS[0].id,
          slug: MOCK_EVENTS[0].slug,
          title: MOCK_EVENTS[0].title,
          venueName: MOCK_EVENTS[0].venueName,
          startsAt: MOCK_EVENTS[0].startsAt,
          imageUrl: MOCK_EVENTS[0].imageUrl,
          locationLabel: MOCK_EVENTS[0].locationLabel,
          ratingAverage: 0,
          ratingCount: 0,
        },
      ],
      posts: [],
    },
  };
}

const usernameFromMockRequestId = (id: string) => id.replace(/^mock-(author|friend-request)-/, '');

export function sendMockFriendRequest(recipientId: string) {
  const normalized = usernameFromMockRequestId(recipientId);
  const existing = mockFriendStatuses.get(normalized);
  if (existing === 'accepted') return { status: 'accepted', requestId: `mock-friend-request-${normalized}`, message: 'Voces ja estao conectados.' };
  mockFriendStatuses.set(normalized, 'pending_sent');
  return { status: 'pending', requestId: `mock-friend-request-${normalized}`, message: 'Solicitacao enviada.' };
}

export function decideMockFriendRequest(requestId: string, action: 'accept' | 'decline') {
  const normalized = usernameFromMockRequestId(requestId);
  if (action === 'accept') {
    mockFriendStatuses.set(normalized, 'accepted');
    return { request: { id: requestId, status: 'ACCEPTED' }, message: 'Conexao aceita.' };
  }
  mockFriendStatuses.delete(normalized);
  return { request: { id: requestId, status: 'DECLINED' }, message: 'Solicitacao recusada.' };
}
