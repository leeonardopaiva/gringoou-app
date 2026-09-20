import 'server-only';

import type { Region } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { DEFAULT_REGION_OPTIONS, type RegionOption } from '@/lib/regions';

const mapRegionRecord = (region: Region): RegionOption => ({
  key: region.key,
  label: region.label,
  city: region.city,
  state: region.state,
  countryCode: region.countryCode,
  lat: region.lat,
  lng: region.lng,
  aliases: region.aliases,
  isActive: region.isActive,
});

export async function ensureRegionCatalog() {
  const existingCount = await prisma.region.count();

  if (existingCount > 0) {
    return;
  }

  await prisma.$transaction(
    DEFAULT_REGION_OPTIONS.map((region) =>
      prisma.region.upsert({
        where: { key: region.key },
        update: {},
        create: {
          key: region.key,
          label: region.label,
          city: region.city,
          state: region.state,
          countryCode: region.countryCode ?? 'US',
          lat: region.lat,
          lng: region.lng,
          aliases: region.aliases ?? [],
          isActive: true,
        },
      }),
    ),
  );
}

export async function listRegions(options?: { activeOnly?: boolean }) {
  await ensureRegionCatalog();

  const regions = await prisma.region.findMany({
    where: options?.activeOnly ? { isActive: true } : undefined,
    orderBy: [{ label: 'asc' }],
  });

  return regions.map(mapRegionRecord);
}

export async function findRegionByKey(regionKey?: string | null, options?: { activeOnly?: boolean }) {
  if (!regionKey) {
    return null;
  }

  await ensureRegionCatalog();

  const region = await prisma.region.findUnique({
    where: { key: regionKey },
  });

  if (!region || (options?.activeOnly && !region.isActive)) {
    return null;
  }

  return mapRegionRecord(region);
}
