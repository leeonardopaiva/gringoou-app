import { cookies, headers } from 'next/headers';
import { dictionaries, type Language } from '@/lib/i18n/dictionaries';
import { DEFAULT_LANGUAGE } from '@/lib/i18n/languages';

export const LANGUAGE_COOKIE = 'gringoou_language';

export const isLanguage = (value: string | null | undefined): value is Language =>
  Boolean(value) && Object.prototype.hasOwnProperty.call(dictionaries, value as string);

/** Idioma do cabeçalho Accept-Language (mesma regra que o navegador usava antes). */
const fromAcceptLanguage = (header: string | null): Language => {
  const first = (header ?? '').split(',')[0]?.trim().toLowerCase() ?? '';
  if (first.startsWith('pt-pt')) return 'pt-PT';
  if (first.startsWith('en')) return 'en-US';
  if (first.startsWith('es')) return 'es';
  return DEFAULT_LANGUAGE;
};

/**
 * Idioma da requisição: cookie escolhido pela pessoa; sem cookie, o idioma do navegador.
 * Assim o servidor já entrega a tela traduzida, sem o "piscar" do português.
 */
export async function getRequestLanguage(): Promise<Language> {
  const fromCookie = (await cookies()).get(LANGUAGE_COOKIE)?.value;
  if (isLanguage(fromCookie)) return fromCookie;
  return fromAcceptLanguage((await headers()).get('accept-language'));
}
