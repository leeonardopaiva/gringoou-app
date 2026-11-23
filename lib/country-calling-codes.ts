import { DEFAULT_ALLOWED_COUNTRIES } from '@/lib/geo-access';

export type CountryCallingCodeOption = {
  iso2: string;
  country: string;
  dialCode: string;
  flagUrl: string;
};

export const COUNTRY_CALLING_CODE_OPTIONS: CountryCallingCodeOption[] = [
  { iso2: 'us', country: 'Estados Unidos', dialCode: '+1', flagUrl: 'https://flagcdn.com/w20/us.png' },
  { iso2: 'br', country: 'Brasil', dialCode: '+55', flagUrl: 'https://flagcdn.com/w20/br.png' },
  { iso2: 'ca', country: 'Canada', dialCode: '+1', flagUrl: 'https://flagcdn.com/w20/ca.png' },
  { iso2: 'pt', country: 'Portugal', dialCode: '+351', flagUrl: 'https://flagcdn.com/w20/pt.png' },
  { iso2: 'gb', country: 'Reino Unido', dialCode: '+44', flagUrl: 'https://flagcdn.com/w20/gb.png' },
  { iso2: 'ie', country: 'Irlanda', dialCode: '+353', flagUrl: 'https://flagcdn.com/w20/ie.png' },
  { iso2: 'es', country: 'Espanha', dialCode: '+34', flagUrl: 'https://flagcdn.com/w20/es.png' },
  { iso2: 'it', country: 'Italia', dialCode: '+39', flagUrl: 'https://flagcdn.com/w20/it.png' },
  { iso2: 'fr', country: 'Franca', dialCode: '+33', flagUrl: 'https://flagcdn.com/w20/fr.png' },
  { iso2: 'de', country: 'Alemanha', dialCode: '+49', flagUrl: 'https://flagcdn.com/w20/de.png' },
  { iso2: 'nl', country: 'Holanda', dialCode: '+31', flagUrl: 'https://flagcdn.com/w20/nl.png' },
  { iso2: 'ch', country: 'Suica', dialCode: '+41', flagUrl: 'https://flagcdn.com/w20/ch.png' },
  { iso2: 'au', country: 'Australia', dialCode: '+61', flagUrl: 'https://flagcdn.com/w20/au.png' },
  { iso2: 'jp', country: 'Japao', dialCode: '+81', flagUrl: 'https://flagcdn.com/w20/jp.png' },
  { iso2: 'ae', country: 'Emirados Arabes', dialCode: '+971', flagUrl: 'https://flagcdn.com/w20/ae.png' },
  ...(
    [
      ['ad', 'Andorra', '+376'],
      ['al', 'Albania', '+355'],
      ['at', 'Austria', '+43'],
      ['ba', 'Bosnia e Herzegovina', '+387'],
      ['be', 'Belgica', '+32'],
      ['bg', 'Bulgaria', '+359'],
      ['cy', 'Chipre', '+357'],
      ['cz', 'Republica Tcheca', '+420'],
      ['dk', 'Dinamarca', '+45'],
      ['ee', 'Estonia', '+372'],
      ['fi', 'Finlandia', '+358'],
      ['fo', 'Ilhas Faroe', '+298'],
      ['gi', 'Gibraltar', '+350'],
      ['gr', 'Grecia', '+30'],
      ['hr', 'Croacia', '+385'],
      ['hu', 'Hungria', '+36'],
      ['is', 'Islandia', '+354'],
      ['li', 'Liechtenstein', '+423'],
      ['lt', 'Lituania', '+370'],
      ['lu', 'Luxemburgo', '+352'],
      ['lv', 'Letonia', '+371'],
      ['mc', 'Monaco', '+377'],
      ['md', 'Moldavia', '+373'],
      ['me', 'Montenegro', '+382'],
      ['mk', 'Macedonia do Norte', '+389'],
      ['mt', 'Malta', '+356'],
      ['no', 'Noruega', '+47'],
      ['pl', 'Polonia', '+48'],
      ['ro', 'Romenia', '+40'],
      ['rs', 'Servia', '+381'],
      ['se', 'Suecia', '+46'],
      ['si', 'Eslovenia', '+386'],
      ['sk', 'Eslovaquia', '+421'],
      ['sm', 'San Marino', '+378'],
      ['tr', 'Turquia', '+90'],
      ['ua', 'Ucrania', '+380'],
      ['xk', 'Kosovo', '+383'],
    ] as const
  ).map(([iso2, country, dialCode]) => ({
    iso2,
    country,
    dialCode,
    flagUrl: `https://flagcdn.com/w20/${iso2}.png`,
  })),
];

// Countries offered in the registration form: only those the app accepts (same list
// as the country and phone blocks), so nobody picks a country that is refused later.
// US and Canada stay on top, the rest is alphabetical.
export const REGISTRATION_COUNTRY_OPTIONS: CountryCallingCodeOption[] = [
  ...COUNTRY_CALLING_CODE_OPTIONS.filter((option) =>
    DEFAULT_ALLOWED_COUNTRIES.includes(option.iso2.toUpperCase()),
  ),
].sort((left, right) => {
  const rank = (iso2: string) => (iso2 === 'us' ? 0 : iso2 === 'ca' ? 1 : 2);
  return rank(left.iso2) - rank(right.iso2) || left.country.localeCompare(right.country, 'pt-BR');
});

export const DEFAULT_COUNTRY_CALLING_CODE = COUNTRY_CALLING_CODE_OPTIONS[0];

const sortByDialCodeLength = [...COUNTRY_CALLING_CODE_OPTIONS].sort(
  (left, right) => right.dialCode.length - left.dialCode.length,
);

export const findCountryByIso2 = (iso2?: string | null) =>
  COUNTRY_CALLING_CODE_OPTIONS.find((option) => option.iso2 === iso2) || DEFAULT_COUNTRY_CALLING_CODE;

export const splitPhoneNumber = (phone?: string | null) => {
  const normalizedPhone = (phone || '').trim();

  if (!normalizedPhone) {
    return {
      country: DEFAULT_COUNTRY_CALLING_CODE,
      localNumber: '',
    };
  }

  const matchedCountry = sortByDialCodeLength.find((option) =>
    normalizedPhone.startsWith(option.dialCode),
  );

  if (!matchedCountry) {
    return {
      country: DEFAULT_COUNTRY_CALLING_CODE,
      localNumber: normalizedPhone,
    };
  }

  return {
    country: matchedCountry,
    localNumber: normalizedPhone.slice(matchedCountry.dialCode.length).trim(),
  };
};
