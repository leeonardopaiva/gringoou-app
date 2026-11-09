import { AdAccountRole, BusinessStatus } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { AD_ACCOUNT_COOKIE, MAX_AD_ACCOUNTS_PER_USER } from '@/lib/ads/account';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

const schema = z.object({ businessId: z.string().cuid() });

/**
 * Abre o painel do negócio: usa a conta de anúncios vinculada ou cria uma automaticamente
 * (sem cobrança) a partir dos dados da página. Quem gerencia a página ganha acesso ao painel.
 */
export async function POST(request: Request) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Negócio inválido.' }, { status: 400 });
  const userId = session.user.id;

  const business = await prisma.business.findFirst({
    where: { id: parsed.data.businessId, OR: [{ createdById: userId }, { members: { some: { userId } } }] },
    select: {
      id: true, name: true, category: true, phone: true, website: true, address: true, imageUrl: true, status: true, createdById: true,
      adAccount: { select: { id: true } },
    },
  });
  if (!business) return NextResponse.json({ error: 'Você não gerencia este negócio.' }, { status: 403 });

  const role = business.createdById === userId ? AdAccountRole.BUSINESS_ADMIN : AdAccountRole.ADMIN;
  let accountId = business.adAccount?.id ?? null;
  if (!accountId) {
    if (business.status !== BusinessStatus.PUBLISHED) {
      return NextResponse.json({ error: 'O painel fica disponível depois que a página do negócio for aprovada.' }, { status: 409 });
    }
    const count = await prisma.adAccountUser.count({ where: { userId } });
    if (count >= MAX_AD_ACCOUNTS_PER_USER) {
      return NextResponse.json({ error: `Você pode gerenciar no máximo ${MAX_AD_ACCOUNTS_PER_USER} contas de negócio.` }, { status: 409 });
    }
    const created = await prisma.adAccount.create({
      data: {
        name: business.name,
        websiteUrl: business.website || undefined,
        phone: business.phone || undefined,
        businessAddress: business.address || undefined,
        businessCategory: business.category,
        subcategories: [],
        logoUrl: business.imageUrl || undefined,
        businessId: business.id,
        users: { create: { userId, role } },
      },
      select: { id: true },
    }).catch(() => null);
    if (!created) {
      // Outra requisição criou a conta ao mesmo tempo: usa a existente.
      const existing = await prisma.adAccount.findUnique({ where: { businessId: business.id }, select: { id: true } });
      if (!existing) return NextResponse.json({ error: 'Não foi possível abrir o painel agora.' }, { status: 500 });
      accountId = existing.id;
    } else {
      accountId = created.id;
    }
    await prisma.user.update({ where: { id: userId }, data: { isAdvertiser: true } }).catch(() => undefined);
  }

  // Quem gerencia a página também acessa o painel (sincroniza o vínculo).
  await prisma.adAccountUser.upsert({
    where: { adAccountId_userId: { adAccountId: accountId, userId } },
    update: {},
    create: { adAccountId: accountId, userId, role },
  });

  const response = NextResponse.json({ adAccountId: accountId });
  response.cookies.set(AD_ACCOUNT_COOKIE, accountId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}
