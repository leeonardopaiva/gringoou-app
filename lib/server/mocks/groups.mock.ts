import 'server-only';

import { avatarFor } from './shared';

type MockGroupMember = {
  id: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  name: string;
  username: string;
  locationLabel: string;
};

type MockGroupRecord = {
  id: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string | null;
  coverImageUrl: string | null;
  category: string;
  regionKey: string;
  regionLabel: string;
  countryCode: string;
  isPublic: boolean;
  createdAt: string;
  members: MockGroupMember[];
  viewerMembershipStatus: 'APPROVED' | 'PENDING' | 'NONE';
};

export const MOCK_GROUPS: MockGroupRecord[] = [
  {
    id: 'mock-group-1',
    name: 'Futebol de Domingo - Boston',
    slug: 'futebol-de-domingo-boston',
    description: 'Grupo para combinar peladas de domingo e trocar figurinha sobre futebol no time da comunidade.',
    imageUrl: 'https://picsum.photos/seed/mock-group-1-avatar/200/200',
    coverImageUrl: 'https://picsum.photos/seed/mock-group-1-cover/900/400',
    category: 'Esportes',
    regionKey: 'boston-ma',
    regionLabel: 'Boston, MA',
    countryCode: 'US',
    isPublic: true,
    createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
    members: [
      { id: 'mock-user-2', role: 'OWNER', name: 'Rafael Lima', username: 'rafael.lima', locationLabel: 'Boston, MA' },
      { id: 'mock-user-1', role: 'MEMBER', name: 'Camila Souza', username: 'camila.souza', locationLabel: 'Somerville, MA' },
      { id: 'mock-user-4', role: 'MEMBER', name: 'Thiago Alves', username: 'thiago.alves', locationLabel: 'Cambridge, MA' },
    ],
    viewerMembershipStatus: 'APPROVED',
  },
  {
    id: 'mock-group-2',
    name: 'Brasileiros em Cambridge',
    slug: 'brasileiros-em-cambridge',
    description: 'Rede de apoio para quem chegou recentemente em Cambridge: dicas de moradia, documentos e networking.',
    imageUrl: null,
    coverImageUrl: null,
    category: 'Networking',
    regionKey: 'cambridge-ma',
    regionLabel: 'Cambridge, MA',
    countryCode: 'US',
    isPublic: true,
    createdAt: new Date(Date.now() - 120 * 86400000).toISOString(),
    members: [
      { id: 'mock-user-4', role: 'OWNER', name: 'Thiago Alves', username: 'thiago.alves', locationLabel: 'Cambridge, MA' },
      { id: 'mock-user-2', role: 'MEMBER', name: 'Rafael Lima', username: 'rafael.lima', locationLabel: 'Boston, MA' },
    ],
    viewerMembershipStatus: 'APPROVED',
  },
];

const findMockGroup = (idOrSlug: string) =>
  MOCK_GROUPS.find((group) => group.id === idOrSlug || group.slug === idOrSlug) ?? MOCK_GROUPS[0];

const toMemberPreview = (member: MockGroupMember) => ({
  id: member.id,
  name: member.name,
  username: member.username,
  image: avatarFor(member.username),
  locationLabel: member.locationLabel,
});

export function getMockGroupsPage(limit = 24, offset = 0) {
  const groups = MOCK_GROUPS.slice(offset, offset + limit).map((group) => ({
    id: group.id,
    name: group.name,
    slug: group.slug,
    description: group.description,
    imageUrl: group.imageUrl,
    coverImageUrl: group.coverImageUrl,
    category: group.category,
    countryCode: group.countryCode,
    isPublic: group.isPublic,
    regionKey: group.regionKey,
    regionLabel: group.regionLabel,
    memberCount: group.members.length,
    createdAt: group.createdAt,
    memberPreviews: group.members.slice(0, 4).map(toMemberPreview),
    publicPath: `/grupos/${group.slug}`,
  }));

  return { groups, hasMore: false, nextOffset: groups.length };
}

export function getMockGroupDetail(idOrSlug: string) {
  const group = findMockGroup(idOrSlug);

  return {
    group: {
      id: group.id,
      name: group.name,
      slug: group.slug,
      description: group.description,
      imageUrl: group.imageUrl,
      coverImageUrl: group.coverImageUrl,
      category: group.category,
      regionKey: group.regionKey,
      regionLabel: group.regionLabel,
      countryCode: group.countryCode,
      isPublic: group.isPublic,
      createdAt: group.createdAt,
      memberCount: group.members.length,
      postCount: 1,
      publicPath: `/grupos/${group.slug}`,
      canViewContent: true,
      canManage: false,
      canManageAdmins: false,
      viewerMembership: group.viewerMembershipStatus === 'NONE' ? null : {
        id: `mock-membership-${group.id}`,
        role: 'MEMBER',
        status: group.viewerMembershipStatus,
      },
      members: group.members.map((member) => ({
        id: `mock-membership-${group.id}-${member.id}`,
        role: member.role,
        status: 'APPROVED',
        joinedAt: group.createdAt,
        user: {
          id: member.id,
          name: member.name,
          username: member.username,
          image: avatarFor(member.username),
          locationLabel: member.locationLabel,
          verified: true,
        },
      })),
    },
  };
}

export function joinMockGroup(idOrSlug: string) {
  const group = findMockGroup(idOrSlug);
  group.viewerMembershipStatus = group.isPublic ? 'APPROVED' : 'PENDING';
  return {
    membership: { id: `mock-membership-${group.id}`, role: 'MEMBER', status: group.viewerMembershipStatus },
    message: group.viewerMembershipStatus === 'APPROVED' ? 'Você entrou no grupo.' : 'Solicitação enviada para aprovação.',
  };
}

export function leaveMockGroup(idOrSlug: string) {
  const group = findMockGroup(idOrSlug);
  group.viewerMembershipStatus = 'NONE';
  return { message: 'Você saiu do grupo.' };
}
