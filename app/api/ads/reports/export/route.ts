import ExcelJS from 'exceljs';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdAccountMembership } from '@/lib/ads/account';
import {
  buildAdsOverviewData,
  createCsvReport,
  reportDimensionCatalog,
  reportMetricCatalog,
  sortReportRows,
  type AdsDateRange,
  type ReportDimensionId,
  type ReportMetricId,
} from '@/lib/ads/dashboard';
import { getServerAuthSession } from '@/lib/auth';

export const runtime = 'nodejs';

const dimensionIds = reportDimensionCatalog.map((item) => item.id) as [ReportDimensionId, ...ReportDimensionId[]];
const metricIds = reportMetricCatalog.map((item) => item.id) as [ReportMetricId, ...ReportMetricId[]];
const exportSchema = z.object({
  reportName: z.string().trim().min(1).max(100),
  outputFormat: z.enum(['CSV', 'XLSX']),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  search: z.string().trim().max(200).default(''),
  selectedDimensions: z.array(z.enum(dimensionIds)).min(1),
  selectedMetrics: z.array(z.enum(metricIds)).min(1),
});

const safeFilename = (value: string) => value.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-|-$/g, '') || 'ads-report';

export async function POST(request: Request) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  const parsed = exportSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Relatório inválido.' }, { status: 400 });
  if (parsed.data.startDate > parsed.data.endDate) return NextResponse.json({ error: 'Período do relatório inválido.' }, { status: 400 });

  const membership = await getAdAccountMembership(session.user.id);
  if (!membership) return NextResponse.json({ error: 'Conta comercial não encontrada.' }, { status: 403 });
  const endDate = new Date(parsed.data.endDate);
  endDate.setHours(23, 59, 59, 999);
  const range: AdsDateRange = { key: 'all', label: 'Período personalizado', from: parsed.data.startDate, to: endDate };
  const overview = await buildAdsOverviewData(session.user.id, range, membership.adAccountId);
  const search = parsed.data.search.toLowerCase();
  const rows = sortReportRows(overview.rows.filter((row) => !search || [row.label, row.goal, row.plan, row.regionLabel].filter(Boolean).some((value) => String(value).toLowerCase().includes(search))));
  const filename = safeFilename(parsed.data.reportName);

  if (parsed.data.outputFormat === 'CSV') {
    const csv = `\uFEFF${createCsvReport(rows, parsed.data.selectedDimensions, parsed.data.selectedMetrics)}`;
    return new NextResponse(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${filename}.csv"` } });
  }

  const dimensions = reportDimensionCatalog.filter((item) => parsed.data.selectedDimensions.includes(item.id));
  const metrics = reportMetricCatalog.filter((item) => parsed.data.selectedMetrics.includes(item.id));
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Ads Report');
  sheet.columns = [...dimensions, ...metrics].map((item) => ({ header: item.label, key: item.id, width: Math.max(16, item.label.length + 4) }));
  rows.forEach((row) => sheet.addRow(Object.fromEntries([...dimensions, ...metrics].map((item) => [item.id, item.accessor(row)]))));
  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(Buffer.from(buffer), { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': `attachment; filename="${filename}.xlsx"` } });
}
