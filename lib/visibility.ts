import { VisibilityScope } from '@prisma/client';

export type RegionVisibilityTarget = {
  regionKey: string;
  visibilityScope: VisibilityScope;
  visibilityRegionKey?: string | null;
};

export const getVisibilityFilter = (viewerRegionKey?: string | null) => {
  if (!viewerRegionKey) {
    return {
      visibilityScope: VisibilityScope.GLOBAL,
    };
  }

  // Listings are strictly regional: only items scoped to the viewer's region
  // (or explicitly targeted at it) are returned. GLOBAL items are not mixed in.
  return {
    OR: [
      {
        visibilityScope: VisibilityScope.USER_REGION,
        regionKey: viewerRegionKey,
      },
      {
        visibilityScope: VisibilityScope.SPECIFIC_REGION,
        visibilityRegionKey: viewerRegionKey,
      },
    ],
  };
};

export const isVisibleForRegion = (
  item: RegionVisibilityTarget,
  viewerRegionKey?: string | null,
) => {
  if (item.visibilityScope === VisibilityScope.GLOBAL) {
    return true;
  }

  if (!viewerRegionKey) {
    return false;
  }

  if (item.visibilityScope === VisibilityScope.USER_REGION) {
    return item.regionKey === viewerRegionKey;
  }

  return item.visibilityRegionKey === viewerRegionKey;
};

export const formatVisibilityScopeLabel = (scope: VisibilityScope) => {
  switch (scope) {
    case VisibilityScope.GLOBAL:
      return 'Global';
    case VisibilityScope.SPECIFIC_REGION:
      return 'Regiao especifica';
    default:
      return 'Pela regiao do usuario';
  }
};
