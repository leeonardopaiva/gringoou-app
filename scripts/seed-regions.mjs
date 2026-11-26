/**
 * Cadastra as regiões da fase atual (hoje: Bragança, em Portugal) ou atualiza, se já existirem.
 *
 * Uso (na raiz do projeto):
 *   node --env-file=.env.local scripts/seed-regions.mjs                     # só mostra o que faria (nada é gravado)
 *   node --env-file=.env.local scripts/seed-regions.mjs --apply             # grava no banco local
 *   node --env-file=.env.local scripts/seed-regions.mjs --apply --activate  # já cria como ativas
 *   node --env-file=.env.local scripts/seed-regions.mjs --include-future    # inclui as regiões das próximas fases
 *
 * Produção: use scripts/prod-seed-regions.ps1 (confere o host e pede confirmação).
 *
 * Regras:
 * - Idempotente: a chave (key) identifica a região. Rodar de novo não duplica nada.
 * - Regiões NOVAS nascem INATIVAS (isActive=false): ninguém consegue escolhê-las até você ativar
 *   no Admin > Regiões. Use --activate para criar já ativas.
 * - Regiões que já existem têm nome, país e coordenadas atualizados, mas o status ativo/inativo
 *   NÃO é alterado.
 * - Nunca apaga nada.
 */
import { PrismaClient } from '@prisma/client';

// Liberação gradual: por padrão o script cadastra só as regiões da fase atual.
// Fase atual: Portugal começa por Bragança. O Canadá ainda não tem região definida.
const REGIONS = [
  { key: 'braganca-pt', label: 'Bragança, PT', city: 'Bragança', state: 'Bragança', countryCode: 'PT', lat: 41.8058, lng: -6.7572, aliases: ['braganca', 'bragança'] },
];

// Regiões previstas para as próximas fases. NÃO são cadastradas, a menos que você passe
// --include-future (ou mova a linha para REGIONS quando a fase chegar).
const FUTURE_REGIONS = [
  // ---------- Portugal (state = distrito ou região autônoma) ----------
  { key: 'lisboa-pt', label: 'Lisboa, PT', city: 'Lisboa', state: 'Lisboa', countryCode: 'PT', lat: 38.7223, lng: -9.1393, aliases: ['lisbon', 'grande lisboa'] },
  { key: 'porto-pt', label: 'Porto, PT', city: 'Porto', state: 'Porto', countryCode: 'PT', lat: 41.1579, lng: -8.6291, aliases: ['oporto', 'grande porto'] },
  { key: 'braga-pt', label: 'Braga, PT', city: 'Braga', state: 'Braga', countryCode: 'PT', lat: 41.5454, lng: -8.4265, aliases: [] },
  { key: 'coimbra-pt', label: 'Coimbra, PT', city: 'Coimbra', state: 'Coimbra', countryCode: 'PT', lat: 40.2033, lng: -8.4103, aliases: [] },
  { key: 'aveiro-pt', label: 'Aveiro, PT', city: 'Aveiro', state: 'Aveiro', countryCode: 'PT', lat: 40.6405, lng: -8.6538, aliases: [] },
  { key: 'setubal-pt', label: 'Setúbal, PT', city: 'Setúbal', state: 'Setúbal', countryCode: 'PT', lat: 38.5244, lng: -8.8882, aliases: ['setubal'] },
  { key: 'faro-pt', label: 'Faro, PT', city: 'Faro', state: 'Faro', countryCode: 'PT', lat: 37.0194, lng: -7.9304, aliases: ['algarve'] },
  { key: 'leiria-pt', label: 'Leiria, PT', city: 'Leiria', state: 'Leiria', countryCode: 'PT', lat: 39.7436, lng: -8.8071, aliases: [] },
  { key: 'funchal-pt', label: 'Funchal, PT', city: 'Funchal', state: 'Madeira', countryCode: 'PT', lat: 32.6669, lng: -16.9241, aliases: ['madeira'] },
  { key: 'ponta-delgada-pt', label: 'Ponta Delgada, PT', city: 'Ponta Delgada', state: 'Açores', countryCode: 'PT', lat: 37.7412, lng: -25.6756, aliases: ['acores', 'azores'] },

  // ---------- Canadá (state = sigla da província) ----------
  { key: 'toronto-on', label: 'Toronto, ON', city: 'Toronto', state: 'ON', countryCode: 'CA', lat: 43.6532, lng: -79.3832, aliases: ['gta', 'greater toronto area'] },
  { key: 'mississauga-on', label: 'Mississauga, ON', city: 'Mississauga', state: 'ON', countryCode: 'CA', lat: 43.589, lng: -79.6441, aliases: [] },
  { key: 'brampton-on', label: 'Brampton, ON', city: 'Brampton', state: 'ON', countryCode: 'CA', lat: 43.7315, lng: -79.7624, aliases: [] },
  { key: 'hamilton-on', label: 'Hamilton, ON', city: 'Hamilton', state: 'ON', countryCode: 'CA', lat: 43.2557, lng: -79.8711, aliases: [] },
  { key: 'kitchener-on', label: 'Kitchener, ON', city: 'Kitchener', state: 'ON', countryCode: 'CA', lat: 43.4516, lng: -80.4925, aliases: ['waterloo', 'kitchener waterloo'] },
  { key: 'london-on', label: 'London, ON', city: 'London', state: 'ON', countryCode: 'CA', lat: 42.9849, lng: -81.2453, aliases: [] },
  { key: 'ottawa-on', label: 'Ottawa, ON', city: 'Ottawa', state: 'ON', countryCode: 'CA', lat: 45.4215, lng: -75.6972, aliases: ['ottawa gatineau'] },
  { key: 'montreal-qc', label: 'Montréal, QC', city: 'Montréal', state: 'QC', countryCode: 'CA', lat: 45.5019, lng: -73.5674, aliases: ['montreal'] },
  { key: 'quebec-city-qc', label: 'Québec, QC', city: 'Québec', state: 'QC', countryCode: 'CA', lat: 46.8139, lng: -71.208, aliases: ['quebec', 'quebec city'] },
  { key: 'vancouver-bc', label: 'Vancouver, BC', city: 'Vancouver', state: 'BC', countryCode: 'CA', lat: 49.2827, lng: -123.1207, aliases: ['greater vancouver'] },
  { key: 'victoria-bc', label: 'Victoria, BC', city: 'Victoria', state: 'BC', countryCode: 'CA', lat: 48.4284, lng: -123.3656, aliases: [] },
  { key: 'calgary-ab', label: 'Calgary, AB', city: 'Calgary', state: 'AB', countryCode: 'CA', lat: 51.0447, lng: -114.0719, aliases: [] },
  { key: 'edmonton-ab', label: 'Edmonton, AB', city: 'Edmonton', state: 'AB', countryCode: 'CA', lat: 53.5461, lng: -113.4938, aliases: [] },
  { key: 'winnipeg-mb', label: 'Winnipeg, MB', city: 'Winnipeg', state: 'MB', countryCode: 'CA', lat: 49.8951, lng: -97.1384, aliases: [] },
  { key: 'halifax-ns', label: 'Halifax, NS', city: 'Halifax', state: 'NS', countryCode: 'CA', lat: 44.6488, lng: -63.5752, aliases: [] },
];

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};

const apply = flag('--apply');
const activate = flag('--activate');
const allowRemote = flag('--allow-remote');
const country = (option('--country') ?? 'all').toUpperCase();

if (!['ALL', 'PT', 'CA'].includes(country)) {
  console.error('Use --country PT, --country CA ou omita para todos.');
  process.exit(1);
}

let host = '';
try {
  host = new URL(process.env.DATABASE_URL ?? '').hostname;
} catch {
  /* url inválida */
}
if (!host) {
  console.error('DATABASE_URL não encontrada. Rode com: node --env-file=.env.local scripts/seed-regions.mjs');
  process.exit(1);
}
const isLocal = host === 'localhost' || host === '127.0.0.1';
if (!isLocal && !allowRemote) {
  console.error(`RECUSADO: DATABASE_URL aponta para "${host}", que não é local.`);
  console.error('Para produção use scripts/prod-seed-regions.ps1 (ele confere o host e pede confirmação).');
  process.exit(1);
}

const includeFuture = flag('--include-future');
const selected = (includeFuture ? [...REGIONS, ...FUTURE_REGIONS] : REGIONS).filter(
  (region) => country === 'ALL' || region.countryCode === country,
);

if (selected.length === 0) {
  console.log(`Nenhuma região da fase atual para "${country}". O Canadá ainda não tem região definida; use --include-future para ver as previstas.`);
  process.exit(0);
}
const prisma = new PrismaClient();

try {
  console.log(`Banco: ${host}${isLocal ? ' (local)' : ' (REMOTO)'}  |  Modo: ${apply ? 'GRAVAR' : 'simulação (use --apply para gravar)'}  |  Países: ${country}`);

  const existing = new Map(
    (await prisma.region.findMany({ where: { key: { in: selected.map((r) => r.key) } }, select: { key: true, isActive: true } })).map((r) => [r.key, r]),
  );

  let created = 0;
  let updated = 0;
  let failed = 0;

  for (const region of selected) {
    const current = existing.get(region.key);
    const data = { label: region.label, city: region.city, state: region.state, countryCode: region.countryCode, lat: region.lat, lng: region.lng, aliases: region.aliases };

    if (!apply) {
      console.log(`${current ? 'atualizaria' : 'criaria    '}  ${region.key.padEnd(18)} ${region.label}  [${region.countryCode}]${current ? `  (hoje: ${current.isActive ? 'ativa' : 'inativa'})` : `  (nasce ${activate ? 'ativa' : 'inativa'})`}`);
      continue;
    }

    try {
      if (current) {
        await prisma.region.update({ where: { key: region.key }, data });
        updated += 1;
      } else {
        await prisma.region.create({ data: { key: region.key, ...data, isActive: activate } });
        created += 1;
      }
    } catch (error) {
      failed += 1;
      console.error(`ERRO em ${region.key} (${region.label}): ${error.code === 'P2002' ? 'já existe outra região com este nome (label).' : error.message}`);
    }
  }

  if (apply) {
    console.log(`Concluído: ${created} criada(s), ${updated} atualizada(s), ${failed} com erro.`);
    if (created > 0 && !activate) console.log('As novas regiões estão INATIVAS. Ative em Admin > Regiões quando for liberar o acesso.');
  } else {
    console.log(`\n${selected.length} região(ões) na simulação. Nada foi gravado.`);
  }
} finally {
  await prisma.$disconnect();
}
