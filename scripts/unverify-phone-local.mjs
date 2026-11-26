/**
 * Só para desenvolvimento local: tira a confirmação de telefone de uma conta, para testar a tela
 * "Confirme seu telefone". Os usuários do seed já nascem com o telefone confirmado.
 *
 * Uso: node scripts/unverify-phone-local.mjs <username>
 * Trava de segurança: recusa qualquer banco que não seja localhost/127.0.0.1.
 */
import { PrismaClient } from '@prisma/client';

const username = process.argv[2];
if (!username) {
  console.error('Informe o username. Ex.: node scripts/unverify-phone-local.mjs maria');
  process.exit(1);
}

let host = '';
try {
  host = new URL(process.env.DATABASE_URL ?? '').hostname;
} catch {
  /* url inválida */
}
if (host !== 'localhost' && host !== '127.0.0.1') {
  console.error(`RECUSADO: DATABASE_URL aponta para "${host || 'desconhecido'}", não para localhost.`);
  process.exit(1);
}

const prisma = new PrismaClient();
try {
  const user = await prisma.user.findUnique({ where: { username }, select: { id: true, role: true } });
  if (!user) {
    console.error(`Usuário "${username}" não encontrado.`);
    process.exit(1);
  }
  await prisma.user.update({ where: { id: user.id }, data: { phoneVerifiedAt: null } });
  console.log(`Telefone de "${username}" agora está NÃO confirmado.${user.role === 'ADMIN' ? ' Atenção: admins são isentos da tela de confirmação.' : ''}`);
} finally {
  await prisma.$disconnect();
}
