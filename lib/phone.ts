import { formatLoosePhoneInput } from '@/lib/forms/phone';

/** Campo de telefone com código do país: aceita Brasil (+55), EUA/Canadá (+1) e Europa; no máximo 15 dígitos. */
export function formatInternationalPhone(value: string) {
  const digits = value.replace(/D/g, '').slice(0, 15);
  if (!digits) return value.trim().startsWith('+') ? '+' : '';
  return formatLoosePhoneInput(`+${digits}`);
}

export const normalizeInternationalPhone = (value: string) => {
  const digits = value.replace(/\D/g, '');
  return digits ? `+${digits}` : '';
};
