// Trava de segurança para migrations automáticas: bloqueia SQL que apaga ou reescreve dados já existentes.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const DESTRUCTIVE_PATTERNS = [
  { label: 'DROP TABLE', regex: /\bDROP\s+TABLE\b/i },
  { label: 'DROP COLUMN', regex: /\bDROP\s+COLUMN\b/i },
  { label: 'DROP SCHEMA/DATABASE', regex: /\bDROP\s+(SCHEMA|DATABASE)\b/i },
  { label: 'TRUNCATE', regex: /\bTRUNCATE\b/i },
  { label: 'DELETE FROM', regex: /\bDELETE\s+FROM\b/i },
  { label: 'UPDATE em massa (UPDATE ... SET)', regex: /\bUPDATE\s+"?[A-Za-z_]+"?\s+SET\b/i },
  { label: 'ALTER COLUMN ... TYPE', regex: /\bALTER\s+COLUMN\b[^;]*\bTYPE\b/i },
  { label: 'DROP TYPE (enum)', regex: /\bDROP\s+TYPE\b/i },
];

const stripComments = (sql) =>
  sql
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n');

/** Retorna a lista de instruções perigosas encontradas no SQL (vazia = só mudanças aditivas). */
export const findDestructiveStatements = (sql) => {
  const clean = stripComments(sql);
  return DESTRUCTIVE_PATTERNS.filter(({ regex }) => regex.test(clean)).map(({ label }) => label);
};

/** Extrai os nomes das migrations pendentes da saída de `prisma migrate status`. */
export const parsePendingMigrations = (statusOutput) => {
  const marker = statusOutput.search(/have not yet been applied|not yet been applied/i);
  if (marker === -1) return [];
  return Array.from(statusOutput.slice(marker).matchAll(/^\s*(\d{14}_[\w-]+)\s*$/gm)).map((match) => match[1]);
};

export const inspectMigrations = (names, migrationsDir = 'prisma/migrations') =>
  names.flatMap((name) => {
    const file = join(migrationsDir, name, 'migration.sql');
    if (!existsSync(file)) return [];
    const found = findDestructiveStatements(readFileSync(file, 'utf8'));
    return found.length ? [{ name, found }] : [];
  });
