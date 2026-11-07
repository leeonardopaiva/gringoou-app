/**
 * Gera data/geo/cities.json a partir dos dumps públicos do GeoNames (CC BY 4.0).
 *
 * Uso:
 *   1. Baixe e extraia https://download.geonames.org/export/dump/cities5000.zip
 *   2. Baixe https://download.geonames.org/export/dump/admin1CodesASCII.txt
 *   3. node scripts/build-cities.mjs <cities5000.txt> <admin1CodesASCII.txt>
 *
 * Atualize o arquivo gerado cerca de uma vez por ano.
 * Fonte dos dados: GeoNames (https://www.geonames.org), licença CC BY 4.0.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const [citiesPath, admin1Path] = process.argv.slice(2);
if (!citiesPath || !admin1Path) {
  console.error('Uso: node scripts/build-cities.mjs <cities5000.txt> <admin1CodesASCII.txt>');
  process.exit(1);
}

// "US.FL<TAB>Florida<TAB>Florida<TAB>4155751" -> { "US.FL": "Florida" }
const admin1Names = new Map();
for (const line of readFileSync(admin1Path, 'utf8').split('\n')) {
  const [code, name] = line.split('\t');
  if (code && name) admin1Names.set(code, name);
}

const round = (value, digits) => Number(Number(value).toFixed(digits));

const rows = [];
for (const line of readFileSync(citiesPath, 'utf8').split('\n')) {
  if (!line.trim()) continue;
  const c = line.split('\t');
  // 1 name, 2 asciiname, 4 lat, 5 lng, 6 feature class, 8 country, 10 admin1 code, 14 population
  const [, name, asciiName, , lat, lng, featureClass, , countryCode, , admin1Code, , , , populationRaw] = c;
  if (featureClass !== 'P') continue;
  const admin1Name = admin1Names.get(`${countryCode}.${admin1Code}`) ?? '';
  // Para os EUA guardamos a sigla do estado (FL, TX...), usada em "Orlando, FL".
  const stateCode = countryCode === 'US' ? admin1Code : '';
  rows.push([
    name,
    asciiName === name ? '' : asciiName,
    admin1Name,
    countryCode,
    stateCode,
    round(lat, 3),
    round(lng, 3),
    Number(populationRaw) || 0,
  ]);
}

rows.sort((a, b) => b[7] - a[7]);

const output = resolve('data/geo/cities.json');
mkdirSync(dirname(output), { recursive: true });
writeFileSync(
  output,
  JSON.stringify({
    source: 'GeoNames cities5000 (CC BY 4.0) - https://www.geonames.org',
    fields: ['name', 'asciiName', 'admin1', 'countryCode', 'stateCode', 'lat', 'lng', 'population'],
    cities: rows,
  }),
);

console.log(`${rows.length} cidades gravadas em ${output}`);
