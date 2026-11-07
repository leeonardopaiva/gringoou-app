import 'server-only';

import citiesFile from '@/data/geo/cities.json';

/**
 * Busca de cidades em base própria (GeoNames, CC BY 4.0), sem serviço externo.
 * A lista vem ordenada por população (maior primeiro), o que dá o desempate natural.
 */

export type CityScope = 'world' | 'us';

export type CitySuggestion = {
  id: string;
  /** Texto exibido e gravado. Ex.: "Campinas, São Paulo, Brasil" ou "Orlando, FL". */
  label: string;
  city: string;
  countryCode: string;
  lat: number;
  lng: number;
};

type IndexedCity = {
  name: string;
  admin1: string;
  countryCode: string;
  stateCode: string;
  lat: number;
  lng: number;
  /** Nome sem acento, minúsculo. */
  search: string;
  searchAdmin: string;
  searchState: string;
  searchCountry: string;
  index: number;
};

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * O GeoNames guarda nomes de cidades estrangeiras em inglês. Estes são os nomes em
 * português mais buscados por brasileiros; a busca troca o apelido pelo nome da base.
 */
const PT_ALIASES: Record<string, string> = {
  lisboa: 'lisbon', londres: 'london', 'nova york': 'new york city', 'nova iorque': 'new york city',
  roma: 'rome', pequim: 'beijing', toquio: 'tokyo', 'cidade do mexico': 'mexico city',
  genebra: 'geneva', milao: 'milan', veneza: 'venice', florenca: 'florence', moscou: 'moscow',
  viena: 'vienna', bruxelas: 'brussels', copenhague: 'copenhagen', praga: 'prague',
  varsovia: 'warsaw', atenas: 'athens', 'xangai': 'shanghai', 'cantao': 'guangzhou',
  turim: 'turin', napoles: 'naples', colonia: 'cologne', munique: 'munich', zurique: 'zurich',
  'sao petersburgo': 'saint petersburg', 'cidade do cabo': 'cape town', bombaim: 'mumbai',
};

const applyAlias = (name: string) => {
  for (const [alias, target] of Object.entries(PT_ALIASES)) {
    if (name === alias || name.startsWith(`${alias} `)) return target + name.slice(alias.length);
  }
  return name;
};

let countryNames: Intl.DisplayNames | null = null;
const getCountryName = (code: string) => {
  try {
    countryNames ??= new Intl.DisplayNames(['pt-BR'], { type: 'region' });
    return countryNames.of(code) ?? code;
  } catch {
    return code;
  }
};

/** UF dos estados brasileiros (o GeoNames só traz código numérico). Chave: nome sem acento. */
const BR_UF: Record<string, string> = {
  acre: 'AC', alagoas: 'AL', amapa: 'AP', amazonas: 'AM', bahia: 'BA', ceara: 'CE',
  'federal district': 'DF', 'distrito federal': 'DF', 'espirito santo': 'ES', goias: 'GO',
  maranhao: 'MA', 'mato grosso': 'MT', 'mato grosso do sul': 'MS', 'minas gerais': 'MG',
  para: 'PA', paraiba: 'PB', parana: 'PR', pernambuco: 'PE', piaui: 'PI',
  'rio de janeiro': 'RJ', 'rio grande do norte': 'RN', 'rio grande do sul': 'RS',
  rondonia: 'RO', roraima: 'RR', 'santa catarina': 'SC', 'sao paulo': 'SP', sergipe: 'SE', tocantins: 'TO',
};

let cachedIndex: { all: IndexedCity[]; us: IndexedCity[] } | null = null;

const getIndex = () => {
  if (cachedIndex) return cachedIndex;

  const all: IndexedCity[] = (citiesFile.cities as Array<[string, string, string, string, string, number, number, number]>).map(
    ([name, asciiName, admin1, countryCode, stateCode, lat, lng], index) => {
      const normalizedAdmin = normalize(admin1);
      const code = countryCode === 'BR' ? (BR_UF[normalizedAdmin] ?? '') : stateCode;
      return {
        name,
        admin1,
        countryCode,
        stateCode: code,
        lat,
        lng,
        search: normalize(asciiName || name),
        searchAdmin: normalizedAdmin,
        searchState: code.toLowerCase(),
        searchCountry: normalize(getCountryName(countryCode)),
        index,
      };
    },
  );

  cachedIndex = { all, us: all.filter((city) => city.countryCode === 'US') };
  return cachedIndex;
};

const buildLabel = (city: IndexedCity, scope: CityScope) => {
  const country = getCountryName(city.countryCode);
  // Estados Unidos e Brasil: "Cidade, UF" (o país só entra na busca mundial).
  if ((city.countryCode === 'US' || city.countryCode === 'BR') && city.stateCode) {
    return scope === 'us' ? `${city.name}, ${city.stateCode}` : `${city.name}, ${city.stateCode}, ${country}`;
  }
  // Demais países: omite a região quando repete o nome da cidade (ex.: Singapura).
  const region = city.admin1 && city.admin1 !== city.name ? city.admin1 : '';
  return [city.name, region, country].filter(Boolean).join(', ');
};

const collect = (pool: IndexedCity[], namePart: string, qualifier: string, max: number) => {
  const startsWith: IndexedCity[] = [];
  const wordStarts: IndexedCity[] = [];

  for (const city of pool) {
    const isPrefix = city.search.startsWith(namePart);
    const isWordPrefix = !isPrefix && city.search.includes(` ${namePart}`);
    if (!isPrefix && !isWordPrefix) continue;

    if (qualifier) {
      const matchesQualifier =
        city.searchAdmin.startsWith(qualifier) ||
        city.searchState === qualifier ||
        city.searchCountry.startsWith(qualifier);
      if (!matchesQualifier) continue;
    }

    // `pool` já está ordenado por população: o primeiro encontrado é o mais relevante.
    (isPrefix ? startsWith : wordStarts).push(city);
    if (startsWith.length >= max) break;
  }

  return [...startsWith, ...wordStarts].slice(0, max);
};

/**
 * Aceita "campinas", "campinas, sp", "orlando fl" e "são paulo, brasil".
 * Ranking: nome começa com a busca > alguma palavra do nome começa > população.
 */
export function searchCities(rawQuery: string, scope: CityScope, limit = 8): CitySuggestion[] {
  // Separa "cidade, estado/país" ANTES de normalizar (a normalização remove vírgulas).
  const [namePartRaw = '', ...rest] = rawQuery.slice(0, 80).split(',');
  const namePart = applyAlias(normalize(namePartRaw));
  const qualifier = normalize(rest.join(' '));
  if (namePart.length < 2) return [];

  const pool = scope === 'us' ? getIndex().us : getIndex().all;
  const max = Math.max(1, Math.min(limit, 15));
  let found = collect(pool, namePart, qualifier, max);

  // Sem vírgula e sem resultado: tenta a última palavra como estado/país ("orlando fl").
  if (found.length === 0 && !qualifier) {
    const words = namePart.split(' ');
    if (words.length >= 2) {
      found = collect(pool, applyAlias(words.slice(0, -1).join(' ')), words[words.length - 1]!, max);
    }
  }

  return found.map((city) => ({
    id: `${city.countryCode}-${city.index}`,
    label: buildLabel(city, scope),
    city: city.name,
    countryCode: city.countryCode,
    lat: city.lat,
    lng: city.lng,
  }));
}
