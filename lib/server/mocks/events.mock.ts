import 'server-only';

import type { EventItem } from '@/types';
import type { EventsPage } from '@/lib/server/events';

type MockEventRecord = {
  id: string;
  slug: string;
  title: string;
  venueName: string;
  category: string;
  startsAt: string;
  locationLabel: string;
  description: string;
  imageUrl: string;
  galleryUrls: string[];
  regionKey: string;
  city: string;
  state: string;
  isFavorite: boolean;
  interestCount: number;
  ratingAverage: number;
  ratingCount: number;
  createdByName: string;
};

export const MOCK_EVENTS: MockEventRecord[] = [
  {
    id: 'mock-event-1',
    slug: 'feira-gastronomica-brasileira',
    title: 'Feira Gastronômica Brasileira',
    venueName: 'Charles River Park',
    category: 'Gastronomia',
    startsAt: new Date(Date.now() + 3 * 86400000).toISOString(),
    locationLabel: 'Boston, MA',
    description: 'Comidas típicas, música ao vivo e feira de artesanato da comunidade brasileira.',
    imageUrl: 'https://picsum.photos/seed/mock-event-1/600/400',
    galleryUrls: ['https://picsum.photos/seed/mock-event-1-a/600/400'],
    regionKey: 'boston-ma',
    city: 'Boston',
    state: 'MA',
    isFavorite: false,
    interestCount: 48,
    ratingAverage: 0,
    ratingCount: 0,
    createdByName: 'Comunidade Gringoou',
  },
  {
    id: 'mock-event-2',
    slug: 'torneio-futebol-brasileiro',
    title: 'Torneio de Futebol Brasileiro',
    venueName: 'Everett Soccer Field',
    category: 'Esporte',
    startsAt: new Date(Date.now() + 6 * 86400000).toISOString(),
    locationLabel: 'Everett, MA',
    description: 'Torneio amistoso entre times da comunidade, com churrasco depois do jogo.',
    imageUrl: 'https://picsum.photos/seed/mock-event-2/600/400',
    galleryUrls: [],
    regionKey: 'boston-ma',
    city: 'Everett',
    state: 'MA',
    isFavorite: true,
    interestCount: 22,
    ratingAverage: 0,
    ratingCount: 0,
    createdByName: 'Rafael Lima',
  },
  {
    id: 'mock-event-3',
    slug: 'roda-de-conversa-imigracao',
    title: 'Roda de conversa: vistos e imigração',
    venueName: 'Biblioteca Comunitária',
    category: 'Networking',
    startsAt: new Date(Date.now() + 12 * 86400000).toISOString(),
    locationLabel: 'Somerville, MA',
    description: 'Advogados voluntários tiram dúvidas sobre processos de visto e green card.',
    imageUrl: 'https://picsum.photos/seed/mock-event-3/600/400',
    galleryUrls: [],
    regionKey: 'boston-ma',
    city: 'Somerville',
    state: 'MA',
    isFavorite: false,
    interestCount: 15,
    ratingAverage: 0,
    ratingCount: 0,
    createdByName: 'Comunidade Gringoou',
  },
  {
    id: 'mock-event-4',
    slug: 'festa-junina-danbury',
    title: 'Festa Junina da Comunidade',
    venueName: 'Danbury Community Center',
    category: 'Festa',
    startsAt: new Date(Date.now() + 8 * 86400000).toISOString(),
    locationLabel: 'Danbury, CT',
    description: 'Quadrilha, comidas típicas e música ao vivo para toda a família.',
    imageUrl: 'https://picsum.photos/seed/mock-event-4/600/400',
    galleryUrls: [],
    regionKey: 'danbury-ct',
    city: 'Danbury',
    state: 'CT',
    isFavorite: false,
    interestCount: 31,
    ratingAverage: 0,
    ratingCount: 0,
    createdByName: 'Comunidade Gringoou',
  },
  {
    id: 'mock-event-5',
    slug: 'feira-de-empregos-danbury',
    title: 'Feira de Empregos para Brasileiros',
    venueName: 'Danbury Library',
    category: 'Networking',
    startsAt: new Date(Date.now() + 15 * 86400000).toISOString(),
    locationLabel: 'Danbury, CT',
    description: 'Empresas locais contratando, com apoio para currículo e entrevistas.',
    imageUrl: 'https://picsum.photos/seed/mock-event-5/600/400',
    galleryUrls: [],
    regionKey: 'danbury-ct',
    city: 'Danbury',
    state: 'CT',
    isFavorite: false,
    interestCount: 19,
    ratingAverage: 0,
    ratingCount: 0,
    createdByName: 'Comunidade Gringoou',
  },
];

const findMockEvent = (idOrSlug: string) =>
  MOCK_EVENTS.find((event) => event.id === idOrSlug || event.slug === idOrSlug) ?? MOCK_EVENTS[0];

export function getMockEventsPage(regionKey?: string | null): EventsPage {
  const scoped = regionKey
    ? MOCK_EVENTS.filter((event) => event.regionKey === regionKey)
    : MOCK_EVENTS;

  const events: EventItem[] = scoped.map((event) => ({
    id: event.id,
    slug: event.slug,
    title: event.title,
    venueName: event.venueName,
    category: event.category,
    startsAt: event.startsAt,
    locationLabel: event.locationLabel,
    description: event.description,
    imageUrl: event.imageUrl,
    galleryUrls: event.galleryUrls,
    status: 'PUBLISHED',
    isFavorite: event.isFavorite,
    interestCount: event.interestCount,
    interestPreview: [],
    canViewInterestedUsers: false,
    canUnlockInterestedUsers: false,
    publicPath: `/eventos/${event.slug}`,
  }));

  return { events, scope: 'local' };
}

export function getMockEventDetail(idOrSlug: string) {
  const event = findMockEvent(idOrSlug);

  return {
    event: {
      id: event.id,
      slug: event.slug,
      title: event.title,
      category: event.category,
      description: event.description,
      venueName: event.venueName,
      startsAt: event.startsAt,
      endsAt: null,
      locationLabel: event.locationLabel,
      regionKey: event.regionKey,
      externalUrl: null,
      imageUrl: event.imageUrl,
      galleryUrls: event.galleryUrls,
      ratingAverage: event.ratingAverage,
      ratingCount: event.ratingCount,
      status: 'PUBLISHED',
      ownershipVerifiedAt: null,
      createdBy: { name: event.createdByName },
      city: event.city,
      state: event.state,
      canEdit: false,
      canRate: true,
      isFavorite: event.isFavorite,
      viewerRating: null,
      publicPath: `/eventos/${event.slug}`,
    },
  };
}

export function setMockEventFavorite(idOrSlug: string, isFavorite: boolean) {
  const event = findMockEvent(idOrSlug);
  event.isFavorite = isFavorite;
  return { isFavorite: event.isFavorite };
}

export function addMockEventRating(idOrSlug: string, stars: number) {
  const event = findMockEvent(idOrSlug);
  const totalStars = event.ratingAverage * event.ratingCount + stars;
  event.ratingCount += 1;
  event.ratingAverage = Math.round((totalStars / event.ratingCount) * 10) / 10;
  return { viewerRating: stars, ratingAverage: event.ratingAverage, ratingCount: event.ratingCount };
}
