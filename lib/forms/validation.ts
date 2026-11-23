import { isValidHttpUrl, normalizeHttpUrlInput } from '../url';

export type FieldErrors<T extends string> = Partial<Record<T, string>>;

export const requiredFieldError = (label: string) => `Preencha ${label}.`;

export const hasFieldErrors = <T extends string>(errors: FieldErrors<T>) =>
  Object.values(errors).some(Boolean);

export const isValidEmail = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

export const normalizeUrlFieldValue = (value: string) =>
  normalizeHttpUrlInput(value);

export const validateOptionalUrlField = (value: string, label: string) => {
  const normalized = normalizeHttpUrlInput(value);

  if (!normalized) {
    return null;
  }

  return isValidHttpUrl(normalized)
    ? null
    : `${label} deve iniciar com http:// ou https://.`;
};

export const validateRequiredUrlField = (value: string, label: string) => {
  const normalized = normalizeHttpUrlInput(value);

  if (!normalized) {
    return requiredFieldError(label);
  }

  return isValidHttpUrl(normalized)
    ? null
    : `${label} deve iniciar com http:// ou https://.`;
};

export const validatePhoneField = (value: string, label: string) => {
  const digits = value.replace(/\D/g, '');

  if (!digits.length) {
    return null;
  }

  return digits.length >= 8 ? null : `${label} está muito curto.`;
};
