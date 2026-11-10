// Build de produção: gera o Prisma Client, aplica migrations pendentes SOMENTE no deploy de produção da Vercel e compila.
//
// Segurança:
// - Preview deployments e build local NUNCA tocam no banco (VERCEL_ENV !== 'production').
// - `prisma migrate deploy` só aplica migrations novas; nunca faz reset nem apaga dados por conta própria.
// - Antes de aplicar, o SQL pendente é inspecionado: DROP/TRUNCATE/DELETE/UPDATE em massa/troca de tipo
//   abortam o build (a versão anterior continua no ar). Para liberar conscientemente, defina
//   ALLOW_DESTRUCTIVE_MIGRATIONS=true na Vercel apenas durante esse deploy e remova depois.
// - Usa DIRECT_URL (conexão direta, necessária para migrations no Neon).
import { spawnSync } from 'node:child_process';
import { inspectMigrations, parsePendingMigrations } from './migration-guard.mjs';

const run = (label, command, { capture = false } = {}) => {
  console.log(`\n> ${label}`);
  const result = spawnSync(command, { stdio: capture ? ['inherit', 'pipe', 'pipe'] : 'inherit', shell: true, encoding: 'utf8' });
  if (capture) {
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    return `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  }
  if (result.status !== 0) {
    console.error(`\nFalha em: ${label}`);
    process.exit(result.status ?? 1);
  }
  return '';
};

run('prisma generate', 'npx prisma generate');

if (process.env.VERCEL_ENV === 'production') {
  if (!process.env.DIRECT_URL) {
    console.error('DIRECT_URL ausente: nao e seguro aplicar migrations. Defina DIRECT_URL na Vercel (Production).');
    process.exit(1);
  }

  // `migrate status` sai com código != 0 quando há pendências; por isso só lemos a saída.
  const status = run('prisma migrate status', 'npx prisma migrate status', { capture: true });
  if (/failed migrations?|P3009|P3018/i.test(status)) {
    console.error('\nHa migration com falha registrada no banco. Resolva manualmente (prisma migrate resolve) antes de publicar.');
    process.exit(1);
  }

  const pending = parsePendingMigrations(status);
  // Falha fechada: se o Prisma informa pendências mas não conseguimos ler os nomes, não aplicamos às cegas.
  if (/not yet been applied/i.test(status) && pending.length === 0) {
    console.error('\nNao foi possivel identificar as migrations pendentes na saida do Prisma. Aplique manualmente com scripts/prod-migrate.ps1.');
    process.exit(1);
  }
  const risky = inspectMigrations(pending);
  if (risky.length > 0 && process.env.ALLOW_DESTRUCTIVE_MIGRATIONS !== 'true') {
    console.error('\nBuild abortado: migrations pendentes com operacoes que podem apagar ou reescrever dados:');
    for (const item of risky) console.error(`  - ${item.name}: ${item.found.join(', ')}`);
    console.error('Revise o SQL, faca backup no Neon e, se for intencional, defina ALLOW_DESTRUCTIVE_MIGRATIONS=true apenas neste deploy.');
    process.exit(1);
  }

  if (pending.length > 0) console.log(`\nMigrations pendentes (aditivas): ${pending.join(', ')}`);
  run('prisma migrate deploy (producao)', 'npx prisma migrate deploy');
} else {
  console.log('\nMigrations ignoradas (nao e deploy de producao).');
}

run('next build', 'npx next build');
