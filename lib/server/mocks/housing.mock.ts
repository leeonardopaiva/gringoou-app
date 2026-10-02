import 'server-only';

import { createMockListingCommentStore, type MockViewer } from './shared';

const housingCommentStore = createMockListingCommentStore();

type MockHousingRecord = {
  id: string;
  title: string;
  description: string;
  propertyType: string;
  locationLabel: string;
  regionKey: string;
  price: string;
  contactUrl: string | null;
  imageUrl: string | null;
  galleryUrls: string[];
  createdByName: string;
  createdByUsername: string;
};

export const MOCK_HOUSING: MockHousingRecord[] = [
  {
    id: 'mock-housing-1',
    title: 'Quarto individual perto do metrô',
    description: 'Quarto mobiliado em casa compartilhada, 5 minutos a pé da estação. Contas de água e internet inclusas.',
    propertyType: 'Quarto',
    locationLabel: 'Somerville, MA',
    regionKey: 'boston-ma',
    price: 'US$ 850/mês',
    contactUrl: 'https://wa.me/16175550111',
    imageUrl: 'https://picsum.photos/seed/mock-housing-1/600/400',
    galleryUrls: ['https://picsum.photos/seed/mock-housing-1-a/600/400'],
    createdByName: 'Camila Souza',
    createdByUsername: 'camila.souza',
  },
  {
    id: 'mock-housing-2',
    title: 'Apartamento 1 quarto reformado',
    description: 'Apartamento reformado, cozinha equipada, aceita animais de pequeno porte. Estacionamento incluso.',
    propertyType: 'Apartamento',
    locationLabel: 'Cambridge, MA',
    regionKey: 'boston-ma',
    price: 'US$ 1,950/mês',
    contactUrl: 'https://wa.me/16175550112',
    imageUrl: 'https://picsum.photos/seed/mock-housing-2/600/400',
    galleryUrls: [],
    createdByName: 'Rafael Lima',
    createdByUsername: 'rafael.lima',
  },
  {
    id: 'mock-housing-3',
    title: 'Casa compartilhada com brasileiros',
    description: 'Vaga em república com outros 3 brasileiros, contas divididas, perto do ponto de ônibus.',
    propertyType: 'Republica',
    locationLabel: 'Boston, MA',
    regionKey: 'boston-ma',
    price: 'US$ 700/mês',
    contactUrl: null,
    imageUrl: null,
    galleryUrls: [],
    createdByName: 'Thiago Alves',
    createdByUsername: 'thiago.alves',
  },
  {
    id: 'mock-housing-4',
    title: 'Quarto mobiliado no centro de Danbury',
    description: 'Quarto em casa compartilhada, perto do comércio e do transporte público.',
    propertyType: 'Quarto',
    locationLabel: 'Danbury, CT',
    regionKey: 'danbury-ct',
    price: 'US$ 800/mês',
    contactUrl: 'https://wa.me/12035550114',
    imageUrl: 'https://picsum.photos/seed/mock-housing-4/600/400',
    galleryUrls: [],
    createdByName: 'Juliana Prado',
    createdByUsername: 'juliana.prado',
  },
  {
    id: 'mock-housing-5',
    title: 'Apartamento 2 quartos em Danbury',
    description: 'Apartamento amplo, cozinha equipada e vaga de estacionamento inclusa.',
    propertyType: 'Apartamento',
    locationLabel: 'Danbury, CT',
    regionKey: 'danbury-ct',
    price: 'US$ 1,700/mês',
    contactUrl: null,
    imageUrl: null,
    galleryUrls: [],
    createdByName: 'Marcos Vieira',
    createdByUsername: 'marcos.vieira',
  },
];

const findMockHousing = (id: string) => MOCK_HOUSING.find((item) => item.id === id) ?? MOCK_HOUSING[0];

export function getMockHousingResponse(page: number, pageSize: number, regionKey?: string | null) {
  const scoped = regionKey ? MOCK_HOUSING.filter((item) => item.regionKey === regionKey) : MOCK_HOUSING;
  const housing = scoped.map(({ createdByName: _createdByName, createdByUsername: _createdByUsername, regionKey: _regionKey, contactUrl: _contactUrl, ...item }) => item);
  return { housing, pagination: { page, pageSize, total: housing.length, totalPages: 1 } };
}

export function getMockHousingDetail(id: string) {
  const housing = findMockHousing(id);
  const now = new Date().toISOString();

  return {
    housing: {
      id: housing.id,
      title: housing.title,
      description: housing.description,
      propertyType: housing.propertyType,
      locationLabel: housing.locationLabel,
      price: housing.price,
      contactUrl: housing.contactUrl,
      imageUrl: housing.imageUrl,
      galleryUrls: housing.galleryUrls,
      isActive: true,
      createdById: `mock-author-${housing.createdByUsername}`,
      createdAt: now,
      updatedAt: now,
      createdBy: { id: `mock-author-${housing.createdByUsername}`, name: housing.createdByName, username: housing.createdByUsername },
      canEdit: false,
    },
  };
}

export function getMockHousingComments() {
  return housingCommentStore.getComments();
}

export function addMockHousingComment(content: string, parentId: string | null, viewer: MockViewer) {
  return housingCommentStore.addComment(content, parentId, viewer);
}
