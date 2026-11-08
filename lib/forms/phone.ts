import { COUNTRY_CALLING_CODE_OPTIONS, findCountryByIso2 } from '@/lib/country-calling-codes';

export const phoneDigitsOnly = (value: string) => value.replace(/\D/g, '');

/** Telefone válido: de 8 a 15 dígitos (padrão internacional E.164 sem o +). */
export const isValidPhone = (value: string) => {
  const digits = value.replace(/\D/g, '');
  return digits.length >= 8 && digits.length <= 15;
};

const formatGroupedDigits = (digits: string, groups: number[]) => {
  let cursor = 0;
  const chunks: string[] = [];

  for (const size of groups) {
    if (cursor >= digits.length) {
      break;
    }

    chunks.push(digits.slice(cursor, cursor + size));
    cursor += size;
  }

  if (cursor < digits.length) {
    chunks.push(digits.slice(cursor));
  }

  return chunks.filter(Boolean);
};

const formatBrazilPhone = (digits: string) => {
  const limited = digits.slice(0, 11);

  if (limited.length <= 2) {
    return limited ? `(${limited}` : '';
  }

  if (limited.length <= 6) {
    return `(${limited.slice(0, 2)}) ${limited.slice(2)}`;
  }

  if (limited.length <= 10) {
    return `(${limited.slice(0, 2)}) ${limited.slice(2, 6)}-${limited.slice(6)}`;
  }

  return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7)}`;
};

const formatNorthAmericaPhone = (digits: string) => {
  const limited = digits.slice(0, 10);

  if (limited.length <= 3) {
    return limited ? `(${limited}` : '';
  }

  if (limited.length <= 6) {
    return `(${limited.slice(0, 3)}) ${limited.slice(3)}`;
  }

  return `(${limited.slice(0, 3)}) ${limited.slice(3, 6)}-${limited.slice(6)}`;
};

const formatGenericPhone = (digits: string) =>
  formatGroupedDigits(digits.slice(0, 15), [3, 3, 4, 5]).join(' ');

export const formatPhoneInputByCountry = (value: string, countryIso2?: string | null) => {
  const digits = phoneDigitsOnly(value);

  if (!digits) {
    return '';
  }

  switch (countryIso2) {
    case 'br':
      return formatBrazilPhone(digits);
    case 'us':
    case 'ca':
      return formatNorthAmericaPhone(digits);
    default:
      return formatGenericPhone(digits);
  }
};

export const buildInternationalPhone = (countryIso2: string, value: string) => {
  const digits = phoneDigitsOnly(value);

  if (!digits) {
    return '';
  }

  return `${findCountryByIso2(countryIso2).dialCode} ${digits}`;
};

export const formatLoosePhoneInput = (value: string) => {
  const trimmed = value.trimStart();
  const hasInternationalPrefix = trimmed.startsWith('+');
  const digits = phoneDigitsOnly(trimmed);

  if (!digits) {
    return '';
  }

  if (!hasInternationalPrefix) {
    return formatGenericPhone(digits);
  }

  const countryOption = [...COUNTRY_CALLING_CODE_OPTIONS]
    .sort((left, right) => right.dialCode.length - left.dialCode.length)
    .find((option) => digits.startsWith(phoneDigitsOnly(option.dialCode)));

  if (!countryOption) {
    return `+${formatGenericPhone(digits)}`;
  }

  const localDigits = digits.slice(phoneDigitsOnly(countryOption.dialCode).length);
  const localFormatted = formatPhoneInputByCountry(localDigits, countryOption.iso2);

  return localFormatted
    ? `${countryOption.dialCode} ${localFormatted}`
    : countryOption.dialCode;
};
