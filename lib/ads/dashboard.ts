import { AdModerationStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export type AdsDateRangeKey = '7d' | 'month' | 'all';

export type AdsDateRange = {
  key: AdsDateRangeKey;
  label: string;
  from: Date | null;
  to: Date;
};

export type AdsOverviewRow = {
  id: string;
  label: string;
  imageUrl: string | null;
  goal: string | null;
  description: string | null;
  ctaLabel: string | null;
  destination: string | null;
  rejectionReason: string | null;
  plan: string | null;
  moderationStatus: AdModerationStatus;
  paymentStatus: string;
  campaignStatus: string;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  spendCents: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cpcCents: number | null;
  contractAmountCents: number | null;
  regionLabel: string | null;
  paymentProvider: string | null;
};

export type AdsOverviewData = {
  range: AdsDateRange;
  stats: {
    spendCents: number;
    impressions: number;
    activeCampaigns: number;
    rejectedCreatives: number;
  };
  rows: AdsOverviewRow[];
  total: {
    spendCents: number;
    impressions: number;
    clicks: number;
    conversions: number;
  };
  user: {
    id: string;
    name: string;
    image: string | null;
    email: string | null;
  };
};

export type AdsReportData = {
  reportName: string;
  activeCampaigns: Array<{
    id: string;
    label: string;
    goal: string | null;
    plan: string | null;
    regionLabel: string | null;
    moderationStatus: AdModerationStatus;
    paymentProvider: string | null;
  }>;
  regions: Array<{
    key: string;
    label: string;
    city: string;
    state: string;
  }>;
};

const USD_CURRENCY_FORMAT = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const USD_CURRENCY_FORMAT_WITH_CENTS = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'USD',
});

export const formatUsd = (amountCents: number) => USD_CURRENCY_FORMAT.format(amountCents / 100);

export const formatUsdWithCents = (amountCents: number) => USD_CURRENCY_FORMAT_WITH_CENTS.format(amountCents / 100);

export const formatNumber = (value: number) =>
  new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(value);

export const formatPercent = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 2 }).format(value);

export function resolveAdsDateRange(range: string | null | undefined): AdsDateRange {
  const key = range === 'month' || range === 'all' ? range : '7d';
  const to = new Date();
  const from =
    key === '7d'
      ? new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000)
      : key === 'month'
        ? new Date(to.getFullYear(), to.getMonth(), 1)
        : null;

  return {
    key,
    label:
      key === '7d'
        ? 'Ultimos 7 dias'
        : key === 'month'
          ? 'Este mes'
          : 'Total',
    from,
    to,
  };
}

const rangeClause = (range: AdsDateRange) => (range.from ? { gte: range.from, lte: range.to } : undefined);

const countByKey = (items: Array<{ key: string; value?: number }>) =>
  items.reduce<Record<string, number>>((acc, item) => {
    acc[item.key] = (acc[item.key] ?? 0) + (item.value ?? 1);
    return acc;
  }, {});

const average = (numerator: number, denominator: number) => (denominator > 0 ? numerator / denominator : 0);

export async function buildAdsOverviewData(userId: string, range: AdsDateRange, adAccountId?: string): Promise<AdsOverviewData> {
  const banners = await prisma.banner.findMany({
    where: { archivedAt: null, ...(adAccountId ? { adAccountId } : { createdById: userId }) },
    orderBy: [{ updatedAt: 'desc' }],
    select: {
      id: true,
      name: true,
      headline: true,
      imageUrl: true,
      goal: true,
      description: true,
      ctaLabel: true,
      targetUrl: true,
      whatsappNumber: true,
      marketplaceItemId: true,
      rejectionReason: true,
      plan: true,
      moderationStatus: true,
      paymentStatus: true,
      campaignStatus: true,
      isActive: true,
      startsAt: true,
      endsAt: true,
      spentCents: true,
      contractAmountCents: true,
      paymentProvider: true,
      region: {
        select: {
          label: true,
        },
      },
    },
  });

  const bannerIds = banners.map((banner) => banner.id);
  const timeClause = rangeClause(range);

  const [impressions, clicks, conversions, spend] = await Promise.all([
    bannerIds.length
      ? prisma.adImpression.findMany({
          where: {
            bannerId: { in: bannerIds },
            ...(timeClause ? { createdAt: timeClause } : {}),
          },
          select: { bannerId: true },
        })
      : Promise.resolve([] as Array<{ bannerId: string }>),
    bannerIds.length
      ? prisma.analyticsEvent.findMany({
          where: {
            type: 'banner_click',
            targetType: 'banner',
            targetKey: { in: bannerIds },
            ...(timeClause ? { createdAt: timeClause } : {}),
          },
          select: { targetKey: true },
        })
      : Promise.resolve([] as Array<{ targetKey: string }>),
    bannerIds.length
      ? prisma.bannerRegistration.findMany({
          where: {
            bannerId: { in: bannerIds },
            ...(timeClause ? { createdAt: timeClause } : {}),
          },
          select: { bannerId: true },
        })
      : Promise.resolve([] as Array<{ bannerId: string }>),
    bannerIds.length
      ? prisma.adCharge.findMany({
          where: {
            bannerId: { in: bannerIds },
            ...(timeClause ? { createdAt: timeClause } : {}),
          },
          select: { bannerId: true, amountCents: true },
        })
      : Promise.resolve([] as Array<{ bannerId: string; amountCents: number }>),
  ]);

  const impressionsByBanner = countByKey(impressions.map((item) => ({ key: item.bannerId })));
  const clicksByBanner = countByKey(clicks.map((item) => ({ key: item.targetKey })));
  const conversionsByBanner = countByKey(conversions.map((item) => ({ key: item.bannerId })));
  const spendByBanner = spend.reduce<Record<string, number>>((acc, item) => {
    acc[item.bannerId] = (acc[item.bannerId] ?? 0) + item.amountCents;
    return acc;
  }, {});

  const rows = banners.map<AdsOverviewRow>((banner) => {
    const impressionCount = impressionsByBanner[banner.id] ?? 0;
    const clickCount = clicksByBanner[banner.id] ?? 0;
    const conversionCount = conversionsByBanner[banner.id] ?? 0;
    const spendCents = spendByBanner[banner.id] ?? 0;

    return {
      id: banner.id,
      label: banner.headline || banner.name,
      imageUrl: banner.imageUrl,
      goal: banner.goal,
      description: banner.description,
      ctaLabel: banner.ctaLabel,
      destination:
        banner.goal === 'WHATSAPP'
          ? banner.whatsappNumber
          : banner.goal === 'MARKETPLACE'
            ? banner.marketplaceItemId
            : banner.targetUrl,
      rejectionReason: banner.rejectionReason,
      plan: banner.plan,
      moderationStatus: banner.moderationStatus,
      paymentStatus: banner.paymentStatus,
      campaignStatus: banner.campaignStatus,
      isActive: banner.isActive,
      startsAt: banner.startsAt?.toISOString() ?? null,
      endsAt: banner.endsAt?.toISOString() ?? null,
      spendCents,
      impressions: impressionCount,
      clicks: clickCount,
      conversions: conversionCount,
      ctr: average(clickCount, impressionCount),
      cpcCents: clickCount > 0 ? Math.round(spendCents / clickCount) : null,
      contractAmountCents: banner.contractAmountCents,
      regionLabel: banner.region?.label ?? null,
      paymentProvider: banner.paymentProvider,
    };
  });

  const totals = rows.reduce(
    (acc, row) => {
      acc.spendCents += row.spendCents;
      acc.impressions += row.impressions;
      acc.clicks += row.clicks;
      acc.conversions += row.conversions;
      return acc;
    },
    { spendCents: 0, impressions: 0, clicks: 0, conversions: 0 },
  );

  const activeCampaigns = banners.filter(
    (banner) =>
      banner.isActive &&
      banner.moderationStatus === AdModerationStatus.APPROVED,
  ).length;

  const rejectedCreatives = banners.filter((banner) => banner.moderationStatus === AdModerationStatus.REJECTED).length;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, image: true, email: true },
  });

  return {
    range,
    stats: {
      spendCents: totals.spendCents,
      impressions: totals.impressions,
      activeCampaigns,
      rejectedCreatives,
    },
    rows,
    total: totals,
    user: {
      id: user?.id ?? userId,
      name: user?.name ?? 'Anunciante',
      image: user?.image ?? null,
      email: user?.email ?? null,
    },
  };
}

export async function buildAdsReportData(userId: string, adAccountId?: string): Promise<AdsReportData> {
  const [banners, regions] = await Promise.all([
    prisma.banner.findMany({
      where: adAccountId ? { adAccountId } : { createdById: userId },
      orderBy: [{ updatedAt: 'desc' }],
      select: {
        id: true,
        name: true,
        headline: true,
        goal: true,
        plan: true,
        moderationStatus: true,
        paymentProvider: true,
        region: {
          select: {
            label: true,
          },
        },
      },
    }),
    prisma.region.findMany({
      where: { isActive: true },
      orderBy: [{ label: 'asc' }],
      select: {
        key: true,
        label: true,
        city: true,
        state: true,
      },
    }),
  ]);

  return {
    reportName: `Relatorio de anuncios ${new Date().toISOString().slice(0, 10)}`,
    activeCampaigns: banners.map((banner) => ({
      id: banner.id,
      label: banner.headline || banner.name,
      goal: banner.goal,
      plan: banner.plan,
      regionLabel: banner.region?.label ?? null,
      moderationStatus: banner.moderationStatus,
      paymentProvider: banner.paymentProvider,
    })),
    regions,
  };
}

export const reportDimensionCatalog = [
  { id: 'campaign_name', label: 'Nome da Campanha', accessor: (row: AdsOverviewRow) => row.label },
  { id: 'campaign_id', label: 'ID da Campanha', accessor: (row: AdsOverviewRow) => row.id },
  { id: 'group_name', label: 'Nome do Grupo', accessor: () => 'Grupo padrao' },
  { id: 'group_id', label: 'ID do Grupo', accessor: () => 'default' },
  { id: 'ad_name', label: 'Nome do Anuncio', accessor: (row: AdsOverviewRow) => row.label },
  { id: 'objective', label: 'Objetivo', accessor: (row: AdsOverviewRow) => row.goal ?? 'Sem objetivo' },
  {
    id: 'platform',
    label: 'Plataforma',
    accessor: (row: AdsOverviewRow) => row.paymentProvider ?? 'Web',
  },
  {
    id: 'date',
    label: 'Data',
    accessor: (row: AdsOverviewRow) => row.startsAt ?? new Date().toISOString(),
  },
] as const;

export const reportMetricCatalog = [
  {
    id: 'clicks',
    label: 'Clicks',
    accessor: (row: AdsOverviewRow) => row.clicks.toString(),
  },
  {
    id: 'impressions',
    label: 'Impressões',
    accessor: (row: AdsOverviewRow) => formatNumber(row.impressions),
  },
  {
    id: 'ctr',
    label: 'CTR',
    accessor: (row: AdsOverviewRow) => formatPercent(row.ctr),
  },
  {
    id: 'spend',
    label: 'Spend',
    accessor: (row: AdsOverviewRow) => formatUsdWithCents(row.spendCents),
  },
  {
    id: 'billable_spend',
    label: 'Gasto Faturavel',
    accessor: (row: AdsOverviewRow) => formatUsdWithCents(row.contractAmountCents ?? row.spendCents),
  },
  {
    id: 'leads',
    label: 'Leads',
    accessor: (row: AdsOverviewRow) => row.conversions.toString(),
  },
  {
    id: 'conversions',
    label: 'Conversoes',
    accessor: (row: AdsOverviewRow) => row.conversions.toString(),
  },
  {
    id: 'engagement',
    label: 'Engajamento',
    accessor: (row: AdsOverviewRow) => (row.clicks + row.conversions).toString(),
  },
] as const;

export type ReportDimensionId = (typeof reportDimensionCatalog)[number]['id'];
export type ReportMetricId = (typeof reportMetricCatalog)[number]['id'];

export const defaultReportDimensions: ReportDimensionId[] = ['campaign_name', 'platform', 'ad_name'];
export const defaultReportMetrics: ReportMetricId[] = ['clicks', 'impressions', 'ctr', 'spend', 'billable_spend'];

export function createCsvReport(
  rows: AdsOverviewRow[],
  dimensions: ReportDimensionId[],
  metrics: ReportMetricId[],
) {
  const resolvedDimensions = reportDimensionCatalog.filter((item) => dimensions.includes(item.id));
  const resolvedMetrics = reportMetricCatalog.filter((item) => metrics.includes(item.id));
  const headers = [...resolvedDimensions.map((item) => item.label), ...resolvedMetrics.map((item) => item.label)];

  const csvRows = rows.map((row) => [
    ...resolvedDimensions.map((dimension) => {
      const value = dimension.accessor(row);
      return `"${String(value).replaceAll('"', '""')}"`;
    }),
    ...resolvedMetrics.map((metric) => {
      const value = metric.accessor(row);
      return `"${String(value).replaceAll('"', '""')}"`;
    }),
  ]);

  return [headers.join(','), ...csvRows.map((row) => row.join(','))].join('\n');
}

export function sortReportRows(rows: AdsOverviewRow[]) {
  return [...rows].sort((left, right) => {
    if (right.impressions !== left.impressions) return right.impressions - left.impressions;
    return right.spendCents - left.spendCents;
  });
}
