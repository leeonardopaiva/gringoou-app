import 'server-only';

import { prisma } from '@/lib/prisma';

export type AdvertisableBusiness = {
  id: string;
  slug: string;
  name: string;
  category: string;
  status: string;
  address: string;
  phone: string | null;
  website: string | null;
  imageUrl: string | null;
  linkedAdAccountId: string | null;
};

export async function getAdvertisableBusinesses(userId: string): Promise<AdvertisableBusiness[]> {
  const businesses = await prisma.business.findMany({
    where: {
      OR: [{ createdById: userId }, { members: { some: { userId } } }],
    },
    orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
    select: {
      id: true,
      slug: true,
      name: true,
      category: true,
      status: true,
      address: true,
      phone: true,
      website: true,
      imageUrl: true,
      adAccount: { select: { id: true } },
    },
  });

  return businesses.map(({ adAccount, ...business }) => ({
    ...business,
    linkedAdAccountId: adAccount?.id ?? null,
  }));
}
