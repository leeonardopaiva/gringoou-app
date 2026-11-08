/**
 * Menções em comentários: o texto guarda `@[Nome](tipo:referência)` e a tela mostra um link.
 * Tipos: user (nome público), business (endereço da página), item (anúncio do marketplace).
 */
export type MentionKind = 'user' | 'business' | 'item';

export type MentionPart = { type: 'text'; text: string } | { type: 'mention'; label: string; kind: MentionKind; ref: string; href: string };

const TOKEN = /@\[([^\]\n]{1,80})\]\((user|business|item):([A-Za-z0-9_.-]{1,80})\)/g;

export function mentionHref(kind: MentionKind, ref: string) {
  if (kind === 'user') return `/${ref}`;
  if (kind === 'business') return `/businesses/${ref}`;
  return `/marketplace/${ref}`;
}

export function parseMentions(text: string): MentionPart[] {
  const parts: MentionPart[] = [];
  let last = 0;
  for (const match of text.matchAll(TOKEN)) {
    const index = match.index ?? 0;
    if (index > last) parts.push({ type: 'text', text: text.slice(last, index) });
    const kind = match[2] as MentionKind;
    parts.push({ type: 'mention', label: match[1], kind, ref: match[3], href: mentionHref(kind, match[3]) });
    last = index + match[0].length;
  }
  if (last < text.length) parts.push({ type: 'text', text: text.slice(last) });
  return parts;
}

/** Texto como a pessoa digita: `@[Ana](user:ana)` vira `@Ana`. */
export function toDisplayText(text: string) {
  return text.replace(TOKEN, (_all, label: string) => `@${label}`);
}

export type KnownMention = { label: string; kind: MentionKind; ref: string };

export function knownMentionsFrom(text: string): KnownMention[] {
  return Array.from(text.matchAll(TOKEN)).map((match) => ({ label: match[1], kind: match[2] as MentionKind, ref: match[3] }));
}

/** Converte o texto digitado (`@Ana`) de volta para o formato guardado, usando as menções já escolhidas. */
export function toStoredText(display: string, known: KnownMention[]) {
  let result = display;
  const ordered = [...known].sort((a, b) => b.label.length - a.label.length);
  for (const mention of ordered) {
    const marker = `@${mention.label}`;
    const token = `@[${mention.label}](${mention.kind}:${mention.ref})`;
    const index = result.indexOf(marker);
    if (index >= 0) result = result.slice(0, index) + token + result.slice(index + marker.length);
  }
  return result;
}
