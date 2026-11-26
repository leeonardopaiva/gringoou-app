import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Provas assinadas (HMAC-SHA256) usadas no cadastro que começa pelo telefone.
 *
 * - prova de telefone: emitida pelo servidor SÓ depois de o código de SMS ser aprovado; o cadastro
 *   exige essa prova, então ninguém cria conta com um telefone que não confirmou.
 * - desafio: usado apenas quando o código é conferido localmente (modo de teste ou SMS comum); guarda
 *   o hash do código, que só quem tem o segredo do servidor consegue refazer.
 */

const PROOF_TTL_MS = 30 * 60 * 1000;
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

type Payload = { k: 'signup-phone' | 'signup-challenge'; p: string; h?: string; exp: number };

const getSecret = () => {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error('NEXTAUTH_SECRET is required to sign phone proofs.');
  return secret;
};

const sign = (encoded: string) => createHmac('sha256', getSecret()).update(encoded).digest('base64url');

const encode = (payload: Payload) => {
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  return `${encoded}.${sign(encoded)}`;
};

const decode = (token: string | null | undefined, kind: Payload['k']): Payload | null => {
  if (!token) return null;
  const [encoded, signature] = token.split('.');
  if (!encoded || !signature) return null;

  const expected = Buffer.from(sign(encoded));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as Payload;
    if (payload.k !== kind || typeof payload.p !== 'string' || typeof payload.exp !== 'number' || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
};

export const createPhoneProof = (phoneE164: string) => encode({ k: 'signup-phone', p: phoneE164, exp: Date.now() + PROOF_TTL_MS });

/** Telefone confirmado (E.164) se a prova for válida e não tiver vencido; senão null. */
export const verifyPhoneProof = (token: string | null | undefined) => decode(token, 'signup-phone')?.p ?? null;

export const createCodeChallenge = (phoneE164: string, codeHash: string) =>
  encode({ k: 'signup-challenge', p: phoneE164, h: codeHash, exp: Date.now() + CHALLENGE_TTL_MS });

export const readCodeChallenge = (token: string | null | undefined, phoneE164: string) => {
  const payload = decode(token, 'signup-challenge');
  return payload && payload.p === phoneE164 && payload.h ? payload.h : null;
};
