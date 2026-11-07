/**
 * Banco de dados LOCAL de desenvolvimento (Postgres embutido, sem Docker).
 *
 *   npm run db:local          sobe o banco, aplica migrations e carrega o seed se estiver vazio
 *   npm run db:local:reset    apaga os dados locais e recria tudo com o seed
 *
 * Os dados ficam em .local-db/ (ignorado pelo git). Nunca toca no banco de produção:
 * a URL é sempre localhost e passada explicitamente aos processos filhos.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import EmbeddedPostgres from 'embedded-postgres';

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, '.local-db', 'data');
const PORT = Number(process.env.LOCAL_DB_PORT ?? 54329);
const DB_NAME = 'gringoou';
export const LOCAL_URL = `postgresql://postgres:postgres@localhost:${PORT}/${DB_NAME}`;

const reset = process.argv.includes('--reset');

if (reset && fs.existsSync(DATA_DIR)) {
  fs.rmSync(DATA_DIR, { recursive: true, force: true });
  console.log('[db:local] Dados locais apagados.');
}

const pg = new EmbeddedPostgres({
  databaseDir: DATA_DIR,
  user: 'postgres',
  password: 'postgres',
  port: PORT,
  persistent: true,
  onLog: () => {},
  onError: (message) => {
    const text = String(message ?? '');
    if (/FATAL|PANIC/i.test(text)) console.error('[postgres]', text.trim());
  },
});

const run = (command, args, extraEnv = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: ROOT,
      stdio: 'inherit',
      shell: process.platform === 'win32',
      env: { ...process.env, DATABASE_URL: LOCAL_URL, DIRECT_URL: LOCAL_URL, ...extraEnv },
    });
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${command} ${args.join(' ')} saiu com código ${code}`))));
  });

const stop = async () => {
  console.log('\n[db:local] Encerrando Postgres local...');
  await pg.stop().catch(() => {});
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);

try {
  if (!fs.existsSync(path.join(DATA_DIR, 'PG_VERSION'))) {
    console.log('[db:local] Inicializando cluster (primeira vez)...');
    await pg.initialise();
  }
  await pg.start();
  try {
    await pg.createDatabase(DB_NAME);
  } catch {
    // já existe
  }

  console.log('[db:local] Aplicando migrations...');
  await run('npx', ['prisma', 'migrate', 'deploy']);

  console.log('[db:local] Carregando dados fictícios (se o banco estiver vazio)...');
  await run('node', ['scripts/seed-local.mjs']);

  console.log(`\n[db:local] Pronto em ${LOCAL_URL.replace(/:postgres@/, ':***@')}`);
  console.log('[db:local] Deixe este terminal aberto e rode "npm run dev" em outro. Ctrl+C para parar.');
  await new Promise(() => {});
} catch (error) {
  console.error('[db:local] Falhou:', error instanceof Error ? error.message : error);
  await pg.stop().catch(() => {});
  process.exit(1);
}
