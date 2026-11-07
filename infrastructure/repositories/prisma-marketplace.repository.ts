import 'server-only';

import { MarketplaceStatus, Prisma } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';
import type { MarketplaceRepository } from '@/domain/marketplace/repositories/marketplace.repository';
import type {
  MarketplaceCondition,
  MarketplaceDetailItem,
  MarketplaceListFilters,
  MarketplaceListItem,
  MarketplaceModerationDecision,
  MarketplacePage,
} from '@/domain/marketplace/entities/marketplace.entity';
import {
  MarketplaceRuleError,
  assertNotSelfModeration,
  resolveModerationStatus,
  resolveOwnerStatus,
} from '@/domain/marketplace/rules';
import { findRegionByKey } from '@/lib/region-store';

const DEFAULT_PAGE_SIZE = 24;

const mapCondition = (condition: string): MarketplaceCondition => {
  if (condition === 'NEW') return 'NEW';
  if (condition === 'LIKE_NEW') return 'LIKE_NEW';
  if (condition === 'FAIR') return 'FAIR';
  if (condition === 'POOR') return 'POOR';
  return 'GOOD';
};

const mapStatus = (status: string): MarketplaceListItem['status'] => {
  if (status === 'ACTIVE') return 'ACTIVE';
  if (status === 'SOLD') return 'SOLD';
  if (status === 'UNAVAILABLE') return 'UNAVAILABLE';
  if (status === 'REMOVED') return 'REMOVED';
  if (status === 'REJECTED') return 'REJECTED';
  return 'PENDING_REVIEW';
};

function buildWhere(filters: MarketplaceListFilters): Prisma.MarketplaceItemWhereInput {
  const { viewerId, isAdmin, regionKey, category, query, minPriceCents, maxPriceCents, scope } = filters;

  const visibleStatuses: MarketplaceStatus[] = [MarketplaceStatus.ACTIVE];

  const where: Prisma.MarketplaceItemWhereInput = {
    ...(category ? { category } : {}),
    ...(query
      ? {
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
          ],
        }
      : {}),
    ...(minPriceCents != null ? { priceCents: { gte: minPriceCents } } : {}),
    ...(maxPriceCents != null ? { priceCents: { lte: maxPriceCents } } : {}),
  };

  if (scope === 'mine') {
    return {
      ...where,
      createdById: viewerId,
      status: { in: [...visibleStatuses, MarketplaceStatus.PENDING_REVIEW, MarketplaceStatus.REJECTED, MarketplaceStatus.SOLD, MarketplaceStatus.UNAVAILABLE] },
    };
  }

  if (scope === 'favorites') {
    return {
      ...where,
      favorites: { some: { userId: viewerId } },
      status: { in: visibleStatuses },
    };
  }

  // Listagem pública: apenas ativos do público, mais os itens do próprio
  // usuário (qualquer status: PENDING_REVIEW, SOLD ou UNAVAILABLE) para que
  // ele os veja na aba "Todos" enquanto aguardam aprovação.
  return {
    ...where,
    OR: [
      { status: { in: visibleStatuses } },
      {
        createdById: viewerId,
        status: { in: [MarketplaceStatus.PENDING_REVIEW, MarketplaceStatus.REJECTED, MarketplaceStatus.SOLD, MarketplaceStatus.UNAVAILABLE] },
      },
    ],
    ...(regionKey ? { regionKey } : {}),
  };
}

function buildOrderBy(filters: MarketplaceListFilters): Prisma.MarketplaceItemOrderByWithRelationInput[] {
  switch (filters.sort) {
    case 'price_asc':
      return [{ priceCents: 'asc' as const }, { createdAt: 'desc' as const }];
    case 'price_desc':
      return [{ priceCents: 'desc' as const }, { createdAt: 'desc' as const }];
    default:
      return [{ createdAt: 'desc' as const }];
  }
}

const listSelect = {
  id: true,
  title: true,
  description: true,
  category: true,
  priceCents: true,
  isFree: true,
  condition: true,
  locationLabel: true,
  regionKey: true,
  imageUrl: true,
  galleryUrls: true,
  status: true,
  moderationReason: true,
  createdById: true,
  createdAt: true,
  createdBy: { select: { id: true, name: true, username: true, image: true } },
  favorites: { select: { userId: true }, take: 1 },
} satisfies Prisma.MarketplaceItemSelect;

type ListRaw = Prisma.MarketplaceItemGetPayload<{ select: typeof listSelect }>;

/** Arredonda para 2 casas decimais (~1 km) para não revelar a localização exata. */
const coarsenCoordinate = (value: number | null | undefined) =>
  typeof value === 'number' && Number.isFinite(value) ? Math.round(value * 100) / 100 : null;

function mapListItem(raw: ListRaw, viewerId: string | null, isAdmin: boolean): MarketplaceListItem {
  const canEdit = isAdmin || raw.createdById === viewerId;
  return {
    id: raw.id,
    title: raw.title,
    description: raw.description,
    category: raw.category,
    priceCents: raw.priceCents,
    isFree: raw.isFree,
    condition: mapCondition(raw.condition),
    locationLabel: raw.locationLabel,
    regionKey: raw.regionKey,
    imageUrl: raw.imageUrl,
    galleryUrls: raw.galleryUrls,
    status: mapStatus(raw.status),
    isFavorite: Boolean(viewerId && raw.favorites.some((f) => f.userId === viewerId)),
    canEdit,
    isOwner: Boolean(viewerId) && raw.createdById === viewerId,
    isPendingReview: raw.status === MarketplaceStatus.PENDING_REVIEW,
    moderationReason: canEdit ? raw.moderationReason : null,
    publicPath: `/marketplace/${raw.id}`,
    createdAt: raw.createdAt.toISOString(),
    sellerName: raw.createdBy?.name ?? null,
    sellerUsername: raw.createdBy?.username ?? null,
    sellerImage: raw.createdBy?.image ?? null,
  };
}

export function makePrismaMarketplaceRepository(prisma: PrismaClient): MarketplaceRepository {
  return {
    async list(filters: MarketplaceListFilters): Promise<MarketplacePage> {
      const page = Math.max(1, filters.page ?? 1);
      const pageSize = Math.min(48, Math.max(1, filters.pageSize ?? DEFAULT_PAGE_SIZE));

      const where = buildWhere(filters);
      const orderBy = buildOrderBy(filters);

      const [items, total] = await Promise.all([
        prisma.marketplaceItem.findMany({
          where,
          orderBy,
          skip: (page - 1) * pageSize,
          take: pageSize,
          select: listSelect,
        }),
        prisma.marketplaceItem.count({ where }),
      ]);

      const hasRegional = filters.regionKey ? items.some((item) => item.regionKey === filters.regionKey) : false;

      return {
        items: items.map((raw) => mapListItem(raw, filters.viewerId, filters.isAdmin)),
        scope: filters.regionKey && hasRegional ? 'local' : 'global',
        total,
      };
    },

    async getById(id: string, viewerId: string | null, isAdmin: boolean, canModerate = false): Promise<MarketplaceDetailItem | null> {
      const item = await prisma.marketplaceItem.findUnique({
        where: { id },
        select: {
          ...listSelect,
          latitude: true,
          longitude: true,
          createdBy: {
            select: { id: true, name: true, username: true, image: true, locationLabel: true },
          },
        },
      });

      if (!item) return null;

      const isOwner = item.createdById === viewerId;
      const canEdit = isAdmin || isOwner;

      // Não expõe anúncios não ativos para quem não é dono/admin/moderador.
      if (item.status !== MarketplaceStatus.ACTIVE && !canEdit && !canModerate) {
        return null;
      }

      const region = await findRegionByKey(item.regionKey);

      return {
        id: item.id,
        title: item.title,
        description: item.description,
        category: item.category,
        priceCents: item.priceCents,
        isFree: item.isFree,
        condition: mapCondition(item.condition),
        locationLabel: item.locationLabel,
        regionKey: item.regionKey,
        city: region?.city ?? null,
        state: region?.state ?? null,
        imageUrl: item.imageUrl,
        galleryUrls: item.galleryUrls,
        status: mapStatus(item.status),
        isFavorite: Boolean(viewerId && item.favorites.some((f) => f.userId === viewerId)),
        canEdit,
        isOwner,
        canModerate: canModerate && !isOwner,
        moderationReason: canEdit || canModerate ? item.moderationReason : null,
        publicPath: `/marketplace/${item.id}`,
        createdAt: item.createdAt.toISOString(),
        sellerId: item.createdBy?.id ?? item.createdById,
        sellerName: item.createdBy?.name ?? null,
        sellerUsername: item.createdBy?.username ?? null,
        sellerImage: item.createdBy?.image ?? null,
        sellerLocationLabel: item.createdBy?.locationLabel ?? null,
        // Privacidade: só o dono/admin recebe a coordenada exata (necessária para editar); os demais, ~1 km.
        latitude: canEdit ? (item.latitude ?? null) : coarsenCoordinate(item.latitude),
        longitude: canEdit ? (item.longitude ?? null) : coarsenCoordinate(item.longitude),
      };
    },

    async create(input): Promise<MarketplaceDetailItem> {
      const created = await prisma.marketplaceItem.create({
        data: {
          title: input.title,
          description: input.description,
          category: input.category,
          priceCents: input.isFree ? null : input.priceCents,
          isFree: input.isFree,
          condition: input.condition,
          locationLabel: input.locationLabel,
          regionKey: input.regionKey,
          imageUrl: input.imageUrl,
          galleryUrls: input.galleryUrls,
          status: MarketplaceStatus.PENDING_REVIEW,
          createdById: input.createdById,
          latitude: input.latitude ?? null,
          longitude: input.longitude ?? null,
        },
        select: listSelect,
      });

      return (await this.getById(created.id, input.createdById, false))!;
    },

    async update(id, viewerId, isAdmin, data): Promise<MarketplaceDetailItem | null> {
      const existing = await prisma.marketplaceItem.findUnique({ where: { id }, select: { createdById: true, status: true } });
      if (!existing) return null;
      if (!isAdmin && existing.createdById !== viewerId) return null;

      // Proprietário (não-admin): status só muda dentro das regras de domínio.
      // Isso impede auto-aprovação e que edição/reativação burlem uma rejeição.
      let nextStatus: MarketplaceStatus | undefined = data.status as MarketplaceStatus | undefined;
      if (!isAdmin) {
        const { status: requestedStatus, ...content } = data;
        const contentChanged = Object.values(content).some((value) => value !== undefined);
        nextStatus = resolveOwnerStatus(mapStatus(existing.status), requestedStatus, contentChanged) as MarketplaceStatus | undefined;
      }

      const updated = await prisma.marketplaceItem.update({
        where: { id },
        data: {
          ...(data.title !== undefined ? { title: data.title } : {}),
          ...(data.description !== undefined ? { description: data.description } : {}),
          ...(data.category !== undefined ? { category: data.category } : {}),
          ...(data.priceCents !== undefined ? { priceCents: data.isFree ? null : data.priceCents } : {}),
          ...(data.isFree !== undefined ? { isFree: data.isFree } : {}),
          ...(data.condition !== undefined ? { condition: data.condition } : {}),
          ...(data.locationLabel !== undefined ? { locationLabel: data.locationLabel } : {}),
          ...(data.regionKey !== undefined ? { regionKey: data.regionKey } : {}),
          ...(data.imageUrl !== undefined ? { imageUrl: data.imageUrl } : {}),
          ...(data.galleryUrls !== undefined ? { galleryUrls: data.galleryUrls } : {}),
          ...(nextStatus !== undefined ? { status: nextStatus } : {}),
          ...(data.latitude !== undefined ? { latitude: data.latitude } : {}),
          ...(data.longitude !== undefined ? { longitude: data.longitude } : {}),
        },
        select: listSelect,
      });

      return this.getById(updated.id, viewerId, isAdmin);
    },

    async remove(id, viewerId, isAdmin): Promise<boolean> {
      const existing = await prisma.marketplaceItem.findUnique({ where: { id }, select: { createdById: true } });
      if (!existing) return false;
      if (!isAdmin && existing.createdById !== viewerId) return false;

      await prisma.marketplaceItem.delete({ where: { id } });
      return true;
    },

    async listForModeration({ statuses, page = 1, pageSize = 24 }) {
      const take = Math.min(48, Math.max(1, pageSize));
      const where: Prisma.MarketplaceItemWhereInput = { status: { in: statuses as MarketplaceStatus[] } };

      const [items, total] = await Promise.all([
        prisma.marketplaceItem.findMany({
          where,
          orderBy: { createdAt: 'asc' },
          skip: (Math.max(1, page) - 1) * take,
          take,
          select: {
            id: true,
            title: true,
            description: true,
            category: true,
            priceCents: true,
            isFree: true,
            imageUrl: true,
            locationLabel: true,
            regionKey: true,
            status: true,
            createdAt: true,
            createdById: true,
            moderationReason: true,
            moderatedAt: true,
            createdBy: { select: { name: true, username: true } },
            moderationLogs: {
              orderBy: { createdAt: 'desc' },
              take: 10,
              select: { id: true, decision: true, reason: true, createdAt: true, moderator: { select: { name: true } } },
            },
          },
        }),
        prisma.marketplaceItem.count({ where }),
      ]);

      return {
        total,
        items: items.map((item) => ({
          id: item.id,
          title: item.title,
          description: item.description,
          category: item.category,
          priceCents: item.priceCents,
          isFree: item.isFree,
          imageUrl: item.imageUrl,
          locationLabel: item.locationLabel,
          regionKey: item.regionKey,
          status: mapStatus(item.status),
          publicPath: `/marketplace/${item.id}`,
          createdAt: item.createdAt.toISOString(),
          sellerId: item.createdById,
          sellerName: item.createdBy?.name ?? null,
          sellerUsername: item.createdBy?.username ?? null,
          moderationReason: item.moderationReason,
          moderatedAt: item.moderatedAt ? item.moderatedAt.toISOString() : null,
          logs: item.moderationLogs.map((log) => ({
            id: log.id,
            decision: log.decision as MarketplaceModerationDecision,
            reason: log.reason,
            moderatorName: log.moderator?.name ?? null,
            createdAt: log.createdAt.toISOString(),
          })),
        })),
      };
    },

    async moderate({ id, moderatorId, decision, reason }) {
      await prisma.$transaction(async (tx) => {
        const item = await tx.marketplaceItem.findUnique({ where: { id }, select: { createdById: true, status: true } });
        if (!item) throw new MarketplaceRuleError('NOT_FOUND', 'Anúncio não encontrado.');

        assertNotSelfModeration(item.createdById, moderatorId);
        const nextStatus = resolveModerationStatus(mapStatus(item.status), decision, reason ?? null);
        const cleanReason = reason?.trim() ? reason.trim() : null;

        // A condição de status no WHERE evita que decisões concorrentes se sobrescrevam.
        const result = await tx.marketplaceItem.updateMany({
          where: { id, status: item.status },
          data: {
            status: nextStatus as MarketplaceStatus,
            moderationReason: decision === 'APPROVE' ? null : cleanReason,
            moderatedById: moderatorId,
            moderatedAt: new Date(),
          },
        });
        if (result.count === 0) {
          throw new MarketplaceRuleError('INVALID_TRANSITION', 'O anúncio foi alterado por outra decisão. Recarregue.');
        }

        await tx.marketplaceModerationLog.create({
          data: { itemId: id, moderatorId, decision, reason: cleanReason },
        });
      });
    },

    async toggleFavorite(id, viewerId): Promise<{ isFavorite: boolean }> {
      const existing = await prisma.marketplaceFavorite.findUnique({
        where: { itemId_userId: { itemId: id, userId: viewerId } },
        select: { id: true },
      });

      if (existing) {
        await prisma.marketplaceFavorite.delete({ where: { id: existing.id } });
        return { isFavorite: false };
      }

      await prisma.marketplaceFavorite.create({ data: { itemId: id, userId: viewerId } });
      return { isFavorite: true };
    },
  };
}