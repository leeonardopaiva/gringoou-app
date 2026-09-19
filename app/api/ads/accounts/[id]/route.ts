import { AdAccountRole } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { AD_BUSINESS_CATEGORY_VALUES } from '@/lib/ads/categories';
import { getServerAuthSession } from '@/lib/auth';
import { normalizeInternationalPhone } from '@/lib/phone';
import { prisma } from '@/lib/prisma';
import { normalizeHttpUrlInput } from '@/lib/url';

type RouteContext = { params: Promise<{ id: string }> };
const updateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  websiteUrl: z.preprocess(
    (value) => typeof value === 'string' && value.trim() ? normalizeHttpUrlInput(value) : null,
    z.string().url().nullable(),
  ),
  phone: z.string().trim().min(8).max(30),
  businessAddress: z.string().trim().max(300).nullable(),
  businessCategory: z.enum(AD_BUSINESS_CATEGORY_VALUES as [string, ...string[]]),
  subcategories: z.array(z.string().trim().min(1).max(80)).max(20),
  country: z.string().trim().length(2),
  timezone: z.string().trim().min(2).max(80),
  logoUrl: z.string().url().nullable(),
  useWebsitePhotos: z.boolean(),
});

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 });
  const { id } = await context.params;
  const membership = await prisma.adAccountUser.findUnique({
    where: { adAccountId_userId: { adAccountId: id, userId: session.user.id } },
    select: { role: true, adAccount: { select: { businessId: true } } },
  });
  if (!membership || (membership.role !== AdAccountRole.BUSINESS_ADMIN && membership.role !== AdAccountRole.ADMIN)) {
    return NextResponse.json({ error: 'Apenas administradores podem editar a conta.' }, { status: 403 });
  }
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados invalidos.' }, { status: 400 });
  const account = await prisma.$transaction(async (tx) => {
    const updatedAccount = await tx.adAccount.update({
      where: { id },
      data: { ...parsed.data, phone: normalizeInternationalPhone(parsed.data.phone), country: parsed.data.country.toUpperCase() },
    });

    if (membership.adAccount.businessId) {
      await tx.business.update({
        where: { id: membership.adAccount.businessId },
        data: { imageUrl: parsed.data.logoUrl },
      });
    }

    return updatedAccount;
  });
  return NextResponse.json({ account });
}
