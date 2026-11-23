import { BusinessMemberRole, BusinessStatus, EventStatus, Prisma, UserRole, VisibilityScope } from '@prisma/client';
import ExcelJS from 'exceljs';
import { parseDateTimeInputPtBr } from '@/lib/forms/datetime';
import { prisma } from '@/lib/prisma';
import { ensureRegionCatalog } from '@/lib/region-store';
import { slugifyRegionKey } from '@/lib/regions';
import { slugify } from '@/lib/slug';
import { adminBusinessSchema, adminEventSchema, adminRegionSchema } from '@/lib/validators';

const SHEET_NAMES = {
  readme: 'Leia-me',
  examples: 'Exemplos',
  regions: 'Regioes',
  businesses: 'Negocios',
  events: 'Eventos',
  regionKeys: 'RegionKeys',
} as const;

const businessStatusValues = Object.values(BusinessStatus);
const eventStatusValues = Object.values(EventStatus);
const visibilityScopeValues = Object.values(VisibilityScope);

type ColumnSpec = {
  key: string;
  label: string;
  required?: boolean;
  width?: number;
  example?: string | number | boolean;
};

const regionColumns: ColumnSpec[] = [
  { key: 'key', label: 'key', width: 24, example: 'miami-fl' },
  { key: 'label', label: 'label', required: true, width: 28, example: 'Miami, FL' },
  { key: 'city', label: 'city', required: true, width: 24, example: 'Miami' },
  { key: 'state', label: 'state', required: true, width: 16, example: 'FL' },
  { key: 'lat', label: 'lat', required: true, width: 14, example: 25.7617 },
  { key: 'lng', label: 'lng', required: true, width: 14, example: -80.1918 },
  { key: 'aliases', label: 'aliases', width: 34, example: 'greater miami; miami metro' },
  { key: 'isActive', label: 'isActive', width: 16, example: true },
];

const businessColumns: ColumnSpec[] = [
  { key: 'name', label: 'name', required: true, width: 30, example: 'Brasil Market' },
  { key: 'category', label: 'category', required: true, width: 20, example: 'Mercado' },
  { key: 'description', label: 'description', required: true, width: 48, example: 'Produtos brasileiros e atendimento em português.' },
  { key: 'address', label: 'address', required: true, width: 42, example: '123 Main St, Miami, FL' },
  { key: 'regionKey', label: 'regionKey', required: true, width: 24, example: 'miami-fl' },
  { key: 'phone', label: 'phone', width: 20, example: '+1 305 000 0000' },
  { key: 'whatsapp', label: 'whatsapp', width: 20, example: '+1 305 000 0000' },
  { key: 'website', label: 'website', width: 34, example: 'https://exemplo.com' },
  { key: 'instagram', label: 'instagram', width: 24, example: '@brasilmarket' },
  { key: 'imageUrl', label: 'imageUrl', width: 36, example: 'https://exemplo.com/capa.jpg' },
  { key: 'galleryUrls', label: 'galleryUrls', width: 44, example: 'https://exemplo.com/1.jpg; https://exemplo.com/2.jpg' },
  { key: 'visibilityScope', label: 'visibilityScope', width: 20, example: VisibilityScope.USER_REGION },
  { key: 'visibilityRegionKey', label: 'visibilityRegionKey', width: 24, example: 'miami-fl' },
  { key: 'status', label: 'status', width: 20, example: BusinessStatus.PENDING_REVIEW },
];

const eventColumns: ColumnSpec[] = [
  { key: 'title', label: 'title', required: true, width: 32, example: 'Feijoada da Comunidade' },
  { key: 'description', label: 'description', required: true, width: 48, example: 'Encontro com comida brasileira e música ao vivo.' },
  { key: 'venueName', label: 'venueName', required: true, width: 28, example: 'Brazilian Center' },
  { key: 'startsAt', label: 'startsAt', required: true, width: 22, example: '24/05/2026 18:00' },
  { key: 'endsAt', label: 'endsAt', width: 22, example: '24/05/2026 22:00' },
  { key: 'regionKey', label: 'regionKey', required: true, width: 24, example: 'miami-fl' },
  { key: 'externalUrl', label: 'externalUrl', width: 34, example: 'https://exemplo.com/ingressos' },
  { key: 'imageUrl', label: 'imageUrl', width: 36, example: 'https://exemplo.com/evento.jpg' },
  { key: 'galleryUrls', label: 'galleryUrls', width: 44, example: 'https://exemplo.com/1.jpg; https://exemplo.com/2.jpg' },
  { key: 'visibilityScope', label: 'visibilityScope', width: 20, example: VisibilityScope.USER_REGION },
  { key: 'visibilityRegionKey', label: 'visibilityRegionKey', width: 24, example: 'miami-fl' },
  { key: 'status', label: 'status', width: 20, example: EventStatus.PENDING_REVIEW },
];

export type AdminImportError = {
  sheet: string;
  row: number;
  field: string;
  message: string;
};

export type AdminImportRegionRow = {
  key: string;
  label: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  aliases: string[];
  isActive: boolean;
};

export type AdminImportBusinessRow = {
  name: string;
  category: string;
  description: string;
  address: string;
  regionKey: string;
  phone?: string;
  whatsapp?: string;
  website?: string;
  instagram?: string;
  imageUrl?: string;
  galleryUrls: string[];
  visibilityScope: VisibilityScope;
  visibilityRegionKey?: string;
  status: BusinessStatus;
};

export type AdminImportEventRow = {
  title: string;
  description: string;
  venueName: string;
  startsAt: string;
  endsAt?: string;
  regionKey: string;
  externalUrl?: string;
  imageUrl?: string;
  galleryUrls: string[];
  visibilityScope: VisibilityScope;
  visibilityRegionKey?: string;
  status: EventStatus;
};

export type AdminImportDraft = {
  regions: AdminImportRegionRow[];
  businesses: AdminImportBusinessRow[];
  events: AdminImportEventRow[];
};

export type AdminImportPreview = {
  draft: AdminImportDraft;
  errors: AdminImportError[];
  summary: {
    regions: number;
    businesses: number;
    events: number;
  };
};

type RawRow = {
  rowNumber: number;
  values: Record<string, unknown>;
};

const headerFill = {
  type: 'pattern' as const,
  pattern: 'solid' as const,
  fgColor: { argb: 'FF28B8C7' },
};

const requiredFill = {
  type: 'pattern' as const,
  pattern: 'solid' as const,
  fgColor: { argb: 'FFFFF2CC' },
};

const normalizeHeader = (value: unknown) => String(value ?? '').trim();

const normalizeText = (value: unknown) => {
  if (value == null) {
    return '';
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'object') {
    const candidate = value as {
      text?: unknown;
      result?: unknown;
      hyperlink?: unknown;
      richText?: Array<{ text?: unknown }>;
    };

    if (candidate.text != null) {
      return normalizeText(candidate.text);
    }

    if (candidate.result != null) {
      return normalizeText(candidate.result);
    }

    if (candidate.richText?.length) {
      return candidate.richText.map((item) => String(item.text ?? '')).join('').trim();
    }

    if (candidate.hyperlink != null) {
      return normalizeText(candidate.hyperlink);
    }
  }

  return String(value).trim();
};

const parseBoolean = (value: unknown, defaultValue: boolean) => {
  const normalized = normalizeText(value).toLowerCase();

  if (!normalized) {
    return defaultValue;
  }

  return ['true', '1', 'sim', 'yes', 'ativo', 'ativa'].includes(normalized);
};

const parseList = (value: unknown) =>
  normalizeText(value)
    .split(/[;\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);

const parseDateTime = (value: unknown) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    const excelEpochOffset = 25569;
    const millisPerDay = 24 * 60 * 60 * 1000;
    const date = new Date((value - excelEpochOffset) * millisPerDay);

    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  const normalized = normalizeText(value);

  if (!normalized) {
    return undefined;
  }

  const date = new Date(normalized);

  if (!Number.isNaN(date.getTime())) {
    return date.toISOString();
  }

  return parseDateTimeInputPtBr(normalized) ?? undefined;
};

const parseEnum = <T extends string>(value: unknown, allowed: T[], fallback: T) => {
  const normalized = normalizeText(value).toUpperCase();

  if (!normalized) {
    return fallback;
  }

  return (allowed.includes(normalized as T) ? normalized : normalized) as T;
};

const appendValidationError = (
  errors: AdminImportError[],
  sheet: string,
  row: number,
  field: string,
  message: string,
) => {
  errors.push({ sheet, row, field, message });
};

const addSheet = (
  workbook: ExcelJS.Workbook,
  name: string,
  columns: ColumnSpec[],
  rows: Array<Record<string, string | number | boolean>>,
  regionKeyCount: number,
) => {
  const worksheet = workbook.addWorksheet(name, {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  worksheet.columns = columns.map((column) => ({
    header: column.label,
    key: column.key,
    width: column.width ?? 20,
  }));

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = headerFill;
  headerRow.alignment = { vertical: 'middle' };

  rows.forEach((row) => worksheet.addRow(row));

  columns.forEach((column, index) => {
    const cell = worksheet.getCell(1, index + 1);

    if (column.required) {
      cell.fill = requiredFill;
      cell.font = { bold: true, color: { argb: 'FF1F2937' } };
      cell.note = 'Campo obrigatório';
    }
  });

  const regionKeyColumnIndex = columns.findIndex((column) => column.key === 'regionKey') + 1;
  const visibilityRegionKeyColumnIndex =
    columns.findIndex((column) => column.key === 'visibilityRegionKey') + 1;
  const visibilityScopeColumnIndex = columns.findIndex((column) => column.key === 'visibilityScope') + 1;
  const statusColumnIndex = columns.findIndex((column) => column.key === 'status') + 1;
  const startsAtColumnIndex = columns.findIndex((column) => column.key === 'startsAt') + 1;
  const endsAtColumnIndex = columns.findIndex((column) => column.key === 'endsAt') + 1;

  for (let row = 2; row <= 250; row += 1) {
    if (startsAtColumnIndex > 0) {
      worksheet.getCell(row, startsAtColumnIndex).numFmt = 'dd/mm/yyyy hh:mm';
    }

    if (endsAtColumnIndex > 0) {
      worksheet.getCell(row, endsAtColumnIndex).numFmt = 'dd/mm/yyyy hh:mm';
    }

    if (regionKeyColumnIndex > 0 && regionKeyCount > 0) {
      worksheet.getCell(row, regionKeyColumnIndex).dataValidation = {
        type: 'list',
        allowBlank: false,
        formulae: [`${SHEET_NAMES.regionKeys}!$A$1:$A$${regionKeyCount}`],
      };
    }

    if (visibilityRegionKeyColumnIndex > 0 && regionKeyCount > 0) {
      worksheet.getCell(row, visibilityRegionKeyColumnIndex).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`${SHEET_NAMES.regionKeys}!$A$1:$A$${regionKeyCount}`],
      };
    }

    if (visibilityScopeColumnIndex > 0) {
      worksheet.getCell(row, visibilityScopeColumnIndex).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`"${visibilityScopeValues.join(',')}"`],
      };
    }

    if (statusColumnIndex > 0) {
      const options = name === SHEET_NAMES.events ? eventStatusValues : businessStatusValues;
      worksheet.getCell(row, statusColumnIndex).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`"${options.join(',')}"`],
      };
    }
  }

  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: columns.length },
  };
};

const addExamplesSheet = (workbook: ExcelJS.Workbook) => {
  const examples = workbook.addWorksheet(SHEET_NAMES.examples);
  examples.columns = [
    { width: 18 },
    { width: 28 },
    { width: 72 },
  ];
  examples.addRows([
    ['Aba', 'Campo', 'Exemplo'],
    ...regionColumns.map((column) => [SHEET_NAMES.regions, column.label, column.example ?? '']),
    [],
    ...businessColumns.map((column) => [SHEET_NAMES.businesses, column.label, column.example ?? '']),
    [],
    ...eventColumns.map((column) => [SHEET_NAMES.events, column.label, column.example ?? '']),
  ]);

  const headerRow = examples.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = headerFill;
};

export const buildAdminImportTemplate = async () => {
  await ensureRegionCatalog();

  const regions = await prisma.region.findMany({
    orderBy: [{ label: 'asc' }],
    select: { key: true, label: true },
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Gringoou';
  workbook.created = new Date();

  const readme = workbook.addWorksheet(SHEET_NAMES.readme);
  readme.columns = [{ width: 34 }, { width: 96 }];
  readme.addRows([
    ['Objetivo', 'Use este arquivo para importar regiões, negócios e eventos em massa pelo painel admin.'],
    ['Fluxo seguro', 'Primeiro envie o arquivo para validação. O banco so será alterado após a confirmação no painel.'],
    ['Campos obrigatórios', 'Cabecalhos amarelos nas abas de dados. Não renomeie os cabecalhos.'],
    ['Exemplos', 'Consulte a aba Exemplos. As abas Regioes, Negocios e Eventos devem conter apenas dados reais.'],
    ['Datas', 'Eventos aceitam dd/mm/aaaa hh:mm ou datas nativas do Excel.'],
    ['Listas', 'Use ponto e virgula para aliases e galleryUrls.'],
    ['Status padrão', 'Negócios e eventos sem status entram como PENDING_REVIEW.'],
    ['Visibilidade', 'Use USER_REGION, SPECIFIC_REGION ou GLOBAL. Para SPECIFIC_REGION preencha visibilityRegionKey.'],
  ]);
  readme.getColumn(1).font = { bold: true };

  const regionKeySheet = workbook.addWorksheet(SHEET_NAMES.regionKeys);
  regionKeySheet.state = 'hidden';
  regions.forEach((region, index) => {
    regionKeySheet.getCell(index + 1, 1).value = region.key;
    regionKeySheet.getCell(index + 1, 2).value = region.label;
  });

  addExamplesSheet(workbook);
  addSheet(
    workbook,
    SHEET_NAMES.regions,
    regionColumns,
    [],
    regions.length,
  );
  addSheet(
    workbook,
    SHEET_NAMES.businesses,
    businessColumns,
    [],
    regions.length,
  );
  addSheet(
    workbook,
    SHEET_NAMES.events,
    eventColumns,
    [],
    regions.length,
  );

  return workbook.xlsx.writeBuffer();
};

const readSheetRows = (workbook: ExcelJS.Workbook, sheetName: string): RawRow[] => {
  const worksheet = workbook.getWorksheet(sheetName);

  if (!worksheet) {
    return [];
  }

  const headers: string[] = [];
  worksheet.getRow(1).eachCell((cell, columnNumber) => {
    headers[columnNumber] = normalizeHeader(cell.value);
  });

  const rows: RawRow[] = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      return;
    }

    const values: Record<string, unknown> = {};
    let hasValue = false;

    headers.forEach((header, columnNumber) => {
      if (!header) {
        return;
      }

      const value = row.getCell(columnNumber).value;
      values[header] = value;

      if (normalizeText(value)) {
        hasValue = true;
      }
    });

    if (hasValue) {
      rows.push({ rowNumber, values });
    }
  });

  return rows;
};

const getExistingRegionMaps = async () => {
  const regions = await prisma.region.findMany({
    select: { key: true, label: true },
  });

  return {
    byKey: new Map(regions.map((region) => [region.key, region])),
    byLabel: new Map(regions.map((region) => [region.label.toLowerCase(), region])),
  };
};

export const previewAdminImportWorkbook = async (buffer: Buffer): Promise<AdminImportPreview> => {
  await ensureRegionCatalog();

  const workbook = new ExcelJS.Workbook();
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  await workbook.xlsx.load(arrayBuffer as Parameters<typeof workbook.xlsx.load>[0]);

  const errors: AdminImportError[] = [];
  const regionMaps = await getExistingRegionMaps();
  const regionKeys = new Set(regionMaps.byKey.keys());
  const regionLabels = new Map(regionMaps.byLabel);
  const seenRegionKeys = new Set<string>();
  const seenRegionLabels = new Set<string>();

  const regions: AdminImportRegionRow[] = readSheetRows(workbook, SHEET_NAMES.regions).flatMap((row) => {
    const raw = row.values;
    const regionKey =
      normalizeText(raw.key) || slugifyRegionKey(`${normalizeText(raw.city)}-${normalizeText(raw.state)}`);
    const parsed = adminRegionSchema.safeParse({
      key: regionKey,
      label: normalizeText(raw.label),
      city: normalizeText(raw.city),
      state: normalizeText(raw.state),
      lat: Number(normalizeText(raw.lat)),
      lng: Number(normalizeText(raw.lng)),
      aliases: parseList(raw.aliases),
      isActive: parseBoolean(raw.isActive, true),
    });

    if (!parsed.success) {
      parsed.error.issues.forEach((issue) =>
        appendValidationError(
          errors,
          SHEET_NAMES.regions,
          row.rowNumber,
          issue.path.join('.') || 'linha',
          issue.message,
        ),
      );
      return [];
    }

    const labelKey = parsed.data.label.toLowerCase();
    const existingByLabel = regionLabels.get(labelKey);

    if (seenRegionKeys.has(regionKey)) {
      appendValidationError(errors, SHEET_NAMES.regions, row.rowNumber, 'key', 'Chave duplicada no arquivo.');
      return [];
    }

    if (seenRegionLabels.has(labelKey)) {
      appendValidationError(errors, SHEET_NAMES.regions, row.rowNumber, 'label', 'Nome de região duplicado no arquivo.');
      return [];
    }

    if (existingByLabel && existingByLabel.key !== regionKey) {
      appendValidationError(
        errors,
        SHEET_NAMES.regions,
        row.rowNumber,
        'label',
        `Já existe uma região com esse nome usando a chave ${existingByLabel.key}.`,
      );
      return [];
    }

    seenRegionKeys.add(regionKey);
    seenRegionLabels.add(labelKey);
    regionKeys.add(regionKey);
    regionLabels.set(labelKey, { key: regionKey, label: parsed.data.label });

    return [{
      key: regionKey,
      label: parsed.data.label,
      city: parsed.data.city,
      state: parsed.data.state,
      lat: parsed.data.lat,
      lng: parsed.data.lng,
      aliases: parsed.data.aliases,
      isActive: parsed.data.isActive,
    }];
  });

  const validateRegionKey = (sheet: string, row: number, field: string, value: string) => {
    if (!regionKeys.has(value)) {
      appendValidationError(errors, sheet, row, field, `Região ${value || '(vazia)'} não existe na aba Regiões nem no catalogo.`);
      return false;
    }

    return true;
  };

  const businesses: AdminImportBusinessRow[] = readSheetRows(workbook, SHEET_NAMES.businesses).flatMap((row) => {
    const raw = row.values;
    const visibilityScope = parseEnum(raw.visibilityScope, visibilityScopeValues, VisibilityScope.USER_REGION);
    const visibilityRegionKey = normalizeText(raw.visibilityRegionKey);
    const parsed = adminBusinessSchema.safeParse({
      name: normalizeText(raw.name),
      category: normalizeText(raw.category),
      description: normalizeText(raw.description),
      address: normalizeText(raw.address),
      regionKey: normalizeText(raw.regionKey),
      phone: normalizeText(raw.phone),
      whatsapp: normalizeText(raw.whatsapp),
      website: normalizeText(raw.website),
      instagram: normalizeText(raw.instagram),
      imageUrl: normalizeText(raw.imageUrl),
      galleryUrls: parseList(raw.galleryUrls),
      visibilityScope,
      visibilityRegionKey: visibilityScope === VisibilityScope.SPECIFIC_REGION ? visibilityRegionKey : undefined,
      status: parseEnum(raw.status, businessStatusValues, BusinessStatus.PENDING_REVIEW),
    });

    if (!parsed.success) {
      parsed.error.issues.forEach((issue) =>
        appendValidationError(
          errors,
          SHEET_NAMES.businesses,
          row.rowNumber,
          issue.path.join('.') || 'linha',
          issue.message,
        ),
      );
      return [];
    }

    const hasRegion = validateRegionKey(SHEET_NAMES.businesses, row.rowNumber, 'regionKey', parsed.data.regionKey);
    const hasVisibilityRegion =
      parsed.data.visibilityScope !== VisibilityScope.SPECIFIC_REGION ||
      validateRegionKey(
        SHEET_NAMES.businesses,
        row.rowNumber,
        'visibilityRegionKey',
        parsed.data.visibilityRegionKey || '',
      );

    if (!hasRegion || !hasVisibilityRegion) {
      return [];
    }

    return [{
      ...parsed.data,
      galleryUrls: parsed.data.galleryUrls,
      visibilityScope: parsed.data.visibilityScope,
      visibilityRegionKey: parsed.data.visibilityRegionKey || undefined,
      status: parsed.data.status,
    }];
  });

  const events: AdminImportEventRow[] = readSheetRows(workbook, SHEET_NAMES.events).flatMap((row) => {
    const raw = row.values;
    const startsAt = parseDateTime(raw.startsAt);
    const endsAt = parseDateTime(raw.endsAt);
    const visibilityScope = parseEnum(raw.visibilityScope, visibilityScopeValues, VisibilityScope.USER_REGION);
    const visibilityRegionKey = normalizeText(raw.visibilityRegionKey);
    const parsed = adminEventSchema.safeParse({
      title: normalizeText(raw.title),
      description: normalizeText(raw.description),
      venueName: normalizeText(raw.venueName),
      startsAt: startsAt || '',
      endsAt,
      regionKey: normalizeText(raw.regionKey),
      externalUrl: normalizeText(raw.externalUrl),
      imageUrl: normalizeText(raw.imageUrl),
      galleryUrls: parseList(raw.galleryUrls),
      visibilityScope,
      visibilityRegionKey: visibilityScope === VisibilityScope.SPECIFIC_REGION ? visibilityRegionKey : undefined,
      status: parseEnum(raw.status, eventStatusValues, EventStatus.PENDING_REVIEW),
    });

    if (!parsed.success) {
      parsed.error.issues.forEach((issue) =>
        appendValidationError(
          errors,
          SHEET_NAMES.events,
          row.rowNumber,
          issue.path.join('.') || 'linha',
          issue.message,
        ),
      );
      return [];
    }

    if (parsed.data.endsAt && new Date(parsed.data.endsAt) < new Date(parsed.data.startsAt)) {
      appendValidationError(errors, SHEET_NAMES.events, row.rowNumber, 'endsAt', 'Fim não pode ser antes do início.');
      return [];
    }

    const hasRegion = validateRegionKey(SHEET_NAMES.events, row.rowNumber, 'regionKey', parsed.data.regionKey);
    const hasVisibilityRegion =
      parsed.data.visibilityScope !== VisibilityScope.SPECIFIC_REGION ||
      validateRegionKey(
        SHEET_NAMES.events,
        row.rowNumber,
        'visibilityRegionKey',
        parsed.data.visibilityRegionKey || '',
      );

    if (!hasRegion || !hasVisibilityRegion) {
      return [];
    }

    return [{
      ...parsed.data,
      galleryUrls: parsed.data.galleryUrls,
      visibilityScope: parsed.data.visibilityScope,
      visibilityRegionKey: parsed.data.visibilityRegionKey || undefined,
      status: parsed.data.status,
    }];
  });

  return {
    draft: { regions, businesses, events },
    errors,
    summary: {
      regions: regions.length,
      businesses: businesses.length,
      events: events.length,
    },
  };
};

const buildUniqueSlug = async (
  tx: Prisma.TransactionClient,
  entity: 'business' | 'event',
  value: string,
  reserved: Set<string>,
) => {
  const base = slugify(value) || 'item';
  let candidate = base;
  let suffix = 1;

  while (
    reserved.has(candidate) ||
    (entity === 'business'
      ? await tx.business.findUnique({ where: { slug: candidate }, select: { id: true } })
      : await tx.event.findUnique({ where: { slug: candidate }, select: { id: true } }))
  ) {
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }

  reserved.add(candidate);
  return candidate;
};

export const commitAdminImport = async (draft: AdminImportDraft, createdById: string) => {
  await ensureRegionCatalog();

  const validated = {
    regions: draft.regions,
    businesses: draft.businesses.map((business) => adminBusinessSchema.parse(business)),
    events: draft.events.map((event) => adminEventSchema.parse(event)),
  };

  return prisma.$transaction(async (tx) => {
    for (const region of validated.regions) {
      const parsed = adminRegionSchema.parse(region);

      await tx.region.upsert({
        where: { key: parsed.key },
        update: {
          label: parsed.label,
          city: parsed.city,
          state: parsed.state,
          lat: parsed.lat,
          lng: parsed.lng,
          aliases: parsed.aliases,
          isActive: parsed.isActive,
        },
        create: {
          key: parsed.key || slugifyRegionKey(`${parsed.city}-${parsed.state}`),
          label: parsed.label,
          city: parsed.city,
          state: parsed.state,
          lat: parsed.lat,
          lng: parsed.lng,
          aliases: parsed.aliases,
          isActive: parsed.isActive,
        },
      });
    }

    const regionRecords = await tx.region.findMany({
      select: { key: true, label: true },
    });
    const regionLabelsByKey = new Map(regionRecords.map((region) => [region.key, region.label]));
    const businessSlugs = new Set<string>();
    const eventSlugs = new Set<string>();

    for (const business of validated.businesses) {
      const slug = await buildUniqueSlug(tx, 'business', business.name, businessSlugs);
      const locationLabel = regionLabelsByKey.get(business.regionKey);

      if (!locationLabel) {
        throw new Error(`Região ${business.regionKey} não encontrada para negócio ${business.name}.`);
      }

      await tx.business.create({
        data: {
          name: business.name,
          slug,
          category: business.category,
          description: business.description,
          address: business.address,
          phone: business.phone,
          whatsapp: business.whatsapp,
          website: business.website,
          instagram: business.instagram,
          imageUrl: business.imageUrl,
          galleryUrls: business.galleryUrls,
          locationLabel,
          regionKey: business.regionKey,
          visibilityScope: business.visibilityScope,
          visibilityRegionKey:
            business.visibilityScope === VisibilityScope.SPECIFIC_REGION
              ? business.visibilityRegionKey || null
              : null,
          status: business.status,
          createdById,
          members: {
            create: {
              userId: createdById,
              role: BusinessMemberRole.OWNER,
            },
          },
        },
      });
    }

    for (const event of validated.events) {
      const slug = await buildUniqueSlug(tx, 'event', event.title, eventSlugs);
      const locationLabel = regionLabelsByKey.get(event.regionKey);

      if (!locationLabel) {
        throw new Error(`Região ${event.regionKey} não encontrada para evento ${event.title}.`);
      }

      await tx.event.create({
        data: {
          title: event.title,
          slug,
          description: event.description,
          venueName: event.venueName,
          startsAt: new Date(event.startsAt),
          endsAt: event.endsAt ? new Date(event.endsAt) : null,
          locationLabel,
          regionKey: event.regionKey,
          externalUrl: event.externalUrl,
          imageUrl: event.imageUrl,
          galleryUrls: event.galleryUrls,
          visibilityScope: event.visibilityScope,
          visibilityRegionKey:
            event.visibilityScope === VisibilityScope.SPECIFIC_REGION
              ? event.visibilityRegionKey || null
              : null,
          status: event.status,
          createdById,
        },
      });
    }

    await tx.user.update({
      where: { id: createdById },
      data: { role: UserRole.ADMIN },
    });

    return {
      regions: validated.regions.length,
      businesses: validated.businesses.length,
      events: validated.events.length,
    };
  });
};
