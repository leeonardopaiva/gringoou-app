import 'server-only';

import type { Business } from '@/types';
import type { BusinessesPage } from '@/lib/server/businesses';

type MockBusinessRecord = {
  id: string;
  slug: string;
  name: string;
  category: string;
  address: string;
  description: string;
  imageUrl: string;
  galleryUrls: string[];
  locationLabel: string;
  regionKey: string;
  phone: string;
  whatsapp: string;
  website: string;
  instagram: string;
  ratingAverage: number;
  ratingCount: number;
  status: string;
  createdAt: string;
  createdByName: string;
  isFavorite: boolean;
};

export const MOCK_BUSINESSES: MockBusinessRecord[] = [
  {
    id: 'mock-business-1',
    slug: 'sabor-brasil',
    name: 'Sabor Brasil Mercado',
    category: 'Mercado',
    address: '57 Cambridge St.',
    description: 'Mercadinho brasileiro com pão de queijo, guaraná e temperos importados.',
    imageUrl: 'https://picsum.photos/seed/mock-business-1/600/400',
    galleryUrls: ['https://picsum.photos/seed/mock-business-1-a/600/400', 'https://picsum.photos/seed/mock-business-1-b/600/400'],
    locationLabel: 'Somerville, MA',
    regionKey: 'boston-ma',
    phone: '+1 617-555-0101',
    whatsapp: '+1 617-555-0101',
    website: 'https://saborbrasil.example.com',
    instagram: '@saborbrasilmercado',
    ratingAverage: 4.8,
    ratingCount: 56,
    status: 'PUBLISHED',
    createdAt: new Date(Date.now() - 200 * 86400000).toISOString(),
    createdByName: 'Sabor Brasil Mercado',
    isFavorite: false,
  },
  {
    id: 'mock-business-2',
    slug: 'minas-grill',
    name: 'Minas Grill',
    category: 'Restaurante',
    address: '120 Broadway',
    description: 'Churrascaria brasileira com rodízio aos fins de semana e música ao vivo.',
    imageUrl: 'https://picsum.photos/seed/mock-business-2/600/400',
    galleryUrls: ['https://picsum.photos/seed/mock-business-2-a/600/400'],
    locationLabel: 'Boston, MA',
    regionKey: 'boston-ma',
    phone: '+1 617-555-0102',
    whatsapp: '+1 617-555-0102',
    website: 'https://minasgrill.example.com',
    instagram: '@minasgrill',
    ratingAverage: 4.6,
    ratingCount: 132,
    status: 'PUBLISHED',
    createdAt: new Date(Date.now() - 400 * 86400000).toISOString(),
    createdByName: 'Minas Grill',
    isFavorite: true,
  },
  {
    id: 'mock-business-3',
    slug: 'limpeza-brasil-express',
    name: 'Limpeza Brasil Express',
    category: 'Serviços',
    address: '200 Elm St.',
    description: 'Serviços de limpeza residencial e comercial com equipe brasileira.',
    imageUrl: 'https://picsum.photos/seed/mock-business-3/600/400',
    galleryUrls: [],
    locationLabel: 'Cambridge, MA',
    regionKey: 'boston-ma',
    phone: '+1 617-555-0103',
    whatsapp: '+1 617-555-0103',
    website: '',
    instagram: '',
    ratingAverage: 4.9,
    ratingCount: 28,
    status: 'PUBLISHED',
    createdAt: new Date(Date.now() - 90 * 86400000).toISOString(),
    createdByName: 'Limpeza Brasil Express',
    isFavorite: false,
  },
];

const findMockBusiness = (idOrSlug: string) =>
  MOCK_BUSINESSES.find((business) => business.id === idOrSlug || business.slug === idOrSlug) ?? MOCK_BUSINESSES[0];

export function getMockBusinessesPage(): BusinessesPage {
  const businesses: Business[] = MOCK_BUSINESSES.map((business) => ({
    id: business.id,
    slug: business.slug,
    name: business.name,
    category: business.category,
    address: business.address,
    description: business.description,
    imageUrl: business.imageUrl,
    galleryUrls: business.galleryUrls,
    locationLabel: business.locationLabel,
    ratingAverage: business.ratingAverage,
    ratingCount: business.ratingCount,
    isFavorite: business.isFavorite,
    canEdit: false,
    isPendingReview: false,
    publicPath: `/negocios/${business.slug}`,
  }));

  return { businesses, scope: 'local' };
}

export function getMockBusinessDetail(idOrSlug: string) {
  const business = findMockBusiness(idOrSlug);

  return {
    business: {
      id: business.id,
      slug: business.slug,
      name: business.name,
      category: business.category,
      description: business.description,
      address: business.address,
      imageUrl: business.imageUrl,
      galleryUrls: business.galleryUrls,
      locationLabel: business.locationLabel,
      regionKey: business.regionKey,
      phone: business.phone,
      whatsapp: business.whatsapp,
      website: business.website,
      instagram: business.instagram,
      ratingAverage: business.ratingAverage,
      ratingCount: business.ratingCount,
      status: business.status,
      ownershipVerifiedAt: null,
      createdAt: business.createdAt,
      createdBy: { name: business.createdByName },
      canEdit: false,
      canRate: true,
      isFavorite: business.isFavorite,
      viewerRating: null,
      publicPath: `/negocios/${business.slug}`,
    },
  };
}

export function setMockBusinessFavorite(idOrSlug: string, isFavorite: boolean) {
  const business = findMockBusiness(idOrSlug);
  business.isFavorite = isFavorite;
  return { isFavorite: business.isFavorite };
}

export function addMockBusinessRating(idOrSlug: string, stars: number) {
  const business = findMockBusiness(idOrSlug);
  const totalStars = business.ratingAverage * business.ratingCount + stars;
  business.ratingCount += 1;
  business.ratingAverage = Math.round((totalStars / business.ratingCount) * 10) / 10;
  return { viewerRating: stars, ratingAverage: business.ratingAverage, ratingCount: business.ratingCount };
}
