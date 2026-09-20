export type RegionOption = {
  key: string;
  label: string;
  city: string;
  state: string;
  countryCode?: string;
  lat: number;
  lng: number;
  aliases?: string[];
  isActive?: boolean;
};

export const DEFAULT_REGION_OPTIONS: RegionOption[] = [
  { key: 'atlanta-ga', label: 'Atlanta, GA', city: 'Atlanta', state: 'GA', lat: 33.749, lng: -84.388, aliases: [] },
  { key: 'boston-ma', label: 'Boston, MA', city: 'Boston', state: 'MA', lat: 42.3601, lng: -71.0589, aliases: ['greater boston', 'boston metro'] },
  { key: 'buffalo-ny', label: 'Buffalo, NY', city: 'Buffalo', state: 'NY', lat: 42.8864, lng: -78.8784, aliases: ['greater buffalo'] },
  { key: 'cambridge-ma', label: 'Cambridge, MA', city: 'Cambridge', state: 'MA', lat: 42.3736, lng: -71.1097, aliases: [] },
  { key: 'danbury-ct', label: 'Danbury, CT', city: 'Danbury', state: 'CT', lat: 41.3948, lng: -73.454, aliases: [] },
  { key: 'dallas-tx', label: 'Dallas, TX', city: 'Dallas', state: 'TX', lat: 32.7767, lng: -96.797, aliases: ['dfw', 'dallas fort worth'] },
  { key: 'fort-lauderdale-fl', label: 'Fort Lauderdale, FL', city: 'Fort Lauderdale', state: 'FL', lat: 26.1224, lng: -80.1373, aliases: [] },
  { key: 'framingham-ma', label: 'Framingham, MA', city: 'Framingham', state: 'MA', lat: 42.2793, lng: -71.4162, aliases: [] },
  { key: 'houston-tx', label: 'Houston, TX', city: 'Houston', state: 'TX', lat: 29.7604, lng: -95.3698, aliases: [] },
  { key: 'elizabeth-nj', label: 'Elizabeth, NJ', city: 'Elizabeth', state: 'NJ', lat: 40.6639, lng: -74.2107, aliases: [] },
  { key: 'los-angeles-ca', label: 'Los Angeles, CA', city: 'Los Angeles', state: 'CA', lat: 34.0522, lng: -118.2437, aliases: ['la', 'greater los angeles'] },
  { key: 'lowell-ma', label: 'Lowell, MA', city: 'Lowell', state: 'MA', lat: 42.6334, lng: -71.3162, aliases: [] },
  { key: 'miami-fl', label: 'Miami, FL', city: 'Miami', state: 'FL', lat: 25.7617, lng: -80.1918, aliases: ['greater miami'] },
  { key: 'newark-nj', label: 'Newark, NJ', city: 'Newark', state: 'NJ', lat: 40.7357, lng: -74.1724, aliases: [] },
  {
    key: 'new-york-city-ny',
    label: 'New York City, NY',
    city: 'New York City',
    state: 'NY',
    lat: 40.7128,
    lng: -74.006,
    aliases: ['new york', 'new york ny', 'nyc', 'manhattan', 'brooklyn', 'queens', 'bronx', 'staten island'],
  },
  { key: 'orlando-fl', label: 'Orlando, FL', city: 'Orlando', state: 'FL', lat: 28.5383, lng: -81.3792, aliases: [] },
  { key: 'philadelphia-pa', label: 'Philadelphia, PA', city: 'Philadelphia', state: 'PA', lat: 39.9526, lng: -75.1652, aliases: ['philly'] },
  { key: 'providence-ri', label: 'Providence, RI', city: 'Providence', state: 'RI', lat: 41.824, lng: -71.4128, aliases: [] },
  { key: 'san-diego-ca', label: 'San Diego, CA', city: 'San Diego', state: 'CA', lat: 32.7157, lng: -117.1611, aliases: [] },
  {
    key: 'san-francisco-bay-area-ca',
    label: 'San Francisco Bay Area, CA',
    city: 'San Francisco Bay Area',
    state: 'CA',
    lat: 37.7749,
    lng: -122.4194,
    aliases: ['san francisco', 'bay area', 'sf bay area', 'sf'],
  },
  { key: 'tampa-fl', label: 'Tampa, FL', city: 'Tampa', state: 'FL', lat: 27.9506, lng: -82.4572, aliases: [] },
  { key: 'washington-dc', label: 'Washington, DC', city: 'Washington', state: 'DC', lat: 38.9072, lng: -77.0369, aliases: ['washington dc', 'dc'] },
  { key: 'worcester-ma', label: 'Worcester, MA', city: 'Worcester', state: 'MA', lat: 42.2626, lng: -71.8023, aliases: [] },
];

const regionLabelAliases = new Map<string, string>([
  ['nyc', 'new-york-city-ny'],
  ['new york, ny', 'new-york-city-ny'],
  ['new york city, ny', 'new-york-city-ny'],
  ['sf bay area, ca', 'san-francisco-bay-area-ca'],
]);

export const slugifyRegionKey = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

export const sortRegionsByLabel = (regions: RegionOption[]) =>
  [...regions].sort((left, right) => left.label.localeCompare(right.label, 'en-US'));

export const getRegionByKey = (
  regionKey?: string | null,
  regions: RegionOption[] = DEFAULT_REGION_OPTIONS,
) => (regionKey ? regions.find((region) => region.key === regionKey) ?? null : null);

export const getRegionByLabel = (
  label?: string | null,
  regions: RegionOption[] = DEFAULT_REGION_OPTIONS,
) => {
  if (!label) {
    return null;
  }

  const normalizedLabel = label.trim().toLowerCase();
  const aliasKey = regionLabelAliases.get(normalizedLabel);

  if (aliasKey) {
    return getRegionByKey(aliasKey, regions);
  }

  return regions.find((region) => region.label.toLowerCase() === normalizedLabel) ?? null;
};

const toRadians = (value: number) => (value * Math.PI) / 180;

const calculateDistanceKm = (fromLat: number, fromLng: number, toLat: number, toLng: number) => {
  const earthRadiusKm = 6371;
  const deltaLat = toRadians(toLat - fromLat);
  const deltaLng = toRadians(toLng - fromLng);
  const startLat = toRadians(fromLat);
  const endLat = toRadians(toLat);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(startLat) *
      Math.cos(endLat) *
      Math.sin(deltaLng / 2) *
      Math.sin(deltaLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
};

export const findNearestRegion = (
  latitude: number,
  longitude: number,
  regions: RegionOption[] = DEFAULT_REGION_OPTIONS,
) => {
  const pool = regions.length > 0 ? regions : DEFAULT_REGION_OPTIONS;
  let nearestRegion = pool[0];
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const region of pool) {
    const distance = calculateDistanceKm(latitude, longitude, region.lat, region.lng);

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestRegion = region;
    }
  }

  return nearestRegion;
};
