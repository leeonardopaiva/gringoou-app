// Build de produção: gera o Prisma Client, aplica migrations pendentes SOMENTE no deploy de produção da Vercel e compila.
//
// - Preview deployments e build local NUNCA tocam no banco (VERCEL_ENV !== 'production').
// - As migrations do projeto são aditivas; se uma falhar, o build para e a versão anterior continua no ar.
// - Usa DIRECT_URL (conexão direta, necessária para migrations no Neon).
import { spawnSync } from 'node:child_process';

const run = (label, command) => {
  console.log(`\n> ${label}`);
  const result = spawnSync(command, { stdio: 'inherit', shell: true });
  if (result.status !== 0) {
    console.error(`\nFalha em: ${label}`);
    process.exit(result.status ?? 1);
  }
};

run('prisma generate', 'npx prisma generate');

if (process.env.VERCEL_ENV === 'production') {
  if (!process.env.DIRECT_URL) {
    console.error('DIRECT_URL ausente: nao e seguro aplicar migrations. Defina DIRECT_URL na Vercel (Production).');
    process.exit(1);
  }
  run('prisma migrate deploy (producao)', 'npx prisma migrate deploy');
} else {
  console.log('\nMigrations ignoradas (nao e deploy de producao).');
}

run('next build', 'npx next build');
