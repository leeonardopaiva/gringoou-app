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
import net from 'node:net';
import { spawn, spawnSync } from 'node:child_process';
import EmbeddedPostgres from 'embedded-postgres';

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, '.local-db', 'data');
const PORT = Number(process.env.LOCAL_DB_PORT ?? 54329);
const DB_NAME = 'gringoou';
export const LOCAL_URL = `postgresql://postgres:postgres@localhost:${PORT}/${DB_NAME}`;

/** Tamanho (bytes) de uma pasta, somando os arquivos. */
const folderSize = (dir) => {
  let total = 0;
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      total += entry.isDirectory() ? folderSize(full) : fs.statSync(full).size;
    }
  } catch {
    /* pasta inexistente ou em uso */
  }
  return total;
};

/** O cache do Next (.next) incha ao longo dos dias e deixa o modo dev lento; limpa quando passa de 1,5 GB. */
const cleanNextCacheIfHuge = () => {
  const dir = path.join(ROOT, '.next');
  if (folderSize(dir) < 1.5 * 1024 ** 3) return;
  console.log('[db:local] Cache do Next acima de 1,5 GB: limpando .next para manter o app rápido...');
  fs.rmSync(dir, { recursive: true, force: true });
};

const reset = process.argv.includes('--reset');
const withDev = process.argv.includes('--with-dev');
let devProcess = null;

/** Verdadeiro se já existe algo aceitando conexões na porta do banco local. */
const isPortOpen = () =>
  new Promise((resolve) => {
    const socket = net.connect({ port: PORT, host: '127.0.0.1' });
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => resolve(false));
    socket.setTimeout(1500, () => {
      socket.destroy();
      resolve(false);
    });
  });

/** PID do processo principal gravado pelo Postgres (ou null se não houver). */
const readPostmasterPid = () => {
  try {
    const first = fs.readFileSync(path.join(DATA_DIR, 'postmaster.pid'), 'utf8').split(/\r?\n/)[0];
    const pid = Number(first);
    return Number.isInteger(pid) && pid > 0 ? pid : null;
  } catch {
    return null;
  }
};

const isPidAlive = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code === 'EPERM';
  }
};

/**
 * Encerra processos postgres.exe do binário embutido DESTE projeto que ficaram órfãos
 * (ex.: o principal morreu mas um worker segurou o socket). Não toca em outros Postgres.
 */
const killOrphanedProjectPostgres = () => {
  if (process.platform !== 'win32') return;
  const root = ROOT.replace(/\\/g, '/').toLowerCase();
  const script = `
    $root = '${root.replace(/'/g, "''")}'
    Get-CimInstance Win32_Process -Filter "Name='postgres.exe'" |
      Where-Object { ($_.CommandLine -replace '\\\\','/').ToLower() -like "*$root/node_modules/@embedded-postgres*" } |
      ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
  `;
  spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', script], { stdio: 'ignore' });
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// "Rodando" = o processo principal gravado em postmaster.pid está vivo E a porta responde.
// Só a porta aberta não basta: um worker órfão pode manter o socket aceitando conexões sem ninguém atendendo.
const postmasterPid = readPostmasterPid();
let alreadyRunning = postmasterPid !== null && isPidAlive(postmasterPid) && (await isPortOpen());

if (!alreadyRunning && (postmasterPid !== null || (await isPortOpen()))) {
  console.log('[db:local] Restos de uma execução anterior detectados; limpando...');
  killOrphanedProjectPostgres();
  for (let i = 0; i < 10 && (await isPortOpen()); i++) await sleep(500);
  if (await isPortOpen()) {
    console.error(`[db:local] A porta ${PORT} está ocupada por outro programa. Libere-a ou defina LOCAL_DB_PORT.`);
    process.exit(1);
  }
  fs.rmSync(path.join(DATA_DIR, 'postmaster.pid'), { force: true });
}
let startedByUs = false;

if (reset && alreadyRunning) {
  console.error('[db:local] O banco local está em execução. Pare-o (Ctrl+C no terminal dele) e rode o reset de novo.');
  process.exit(1);
}

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
  console.log('\n[db:local] Encerrando...');
  if (devProcess && !devProcess.killed) {
    if (process.platform === 'win32') spawn('taskkill', ['/pid', String(devProcess.pid), '/T', '/F']);
    else devProcess.kill('SIGTERM');
  }
  // Só para o Postgres se foi este processo que o iniciou.
  if (startedByUs) await pg.stop().catch(() => {});
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);

try {
  if (alreadyRunning) {
    console.log(`[db:local] Banco já está rodando na porta ${PORT}; reaproveitando.`);
  } else {
    if (!fs.existsSync(path.join(DATA_DIR, 'PG_VERSION'))) {
      console.log('[db:local] Inicializando cluster (primeira vez)...');
      await pg.initialise();
    }
    await pg.start();
    startedByUs = true;
    try {
      await pg.createDatabase(DB_NAME);
    } catch {
      // já existe
    }
  }

  console.log('[db:local] Aplicando migrations...');
  await run('npx', ['prisma', 'migrate', 'deploy']);

  console.log('[db:local] Carregando dados fictícios (se o banco estiver vazio)...');
  await run('node', ['scripts/seed-local.mjs']);

  console.log(`\n[db:local] Pronto em ${LOCAL_URL.replace(/:postgres@/, ':***@')}`);
  if (withDev) {
    cleanNextCacheIfHuge();
    console.log('[db:local] Iniciando o app (next dev --turbopack)... Ctrl+C encerra app e banco.');
    devProcess = spawn('npx', ['next', 'dev', '--turbopack'], {
      cwd: ROOT,
      stdio: 'inherit',
      shell: process.platform === 'win32',
      env: {
        ...process.env,
        DATABASE_URL: LOCAL_URL,
        DIRECT_URL: LOCAL_URL,
        // Limita o heap do Node para o coletor de lixo agir antes de a memória chegar a vários GB.
        NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ''} --max-old-space-size=4096`.trim(),
      },
    });
    devProcess.on('exit', () => void stop());
  } else {
    console.log('[db:local] Deixe este terminal aberto e rode "npm run dev" em outro. Ctrl+C para parar.');
  }
  await new Promise(() => {});
} catch (error) {
  console.error('[db:local] Falhou:', error instanceof Error ? error.message : error);
  if (startedByUs) await pg.stop().catch(() => {});
  process.exit(1);
}
