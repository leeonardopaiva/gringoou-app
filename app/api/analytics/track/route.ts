import { NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { analyticsEventSchema } from '@/lib/validators';

export async function POST(request: Request) {
  const session = await getServerAuthSession();
  const body = await request.json().catch(() => null);
  const parsed = analyticsEventSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Evento invalido.' },
      { status: 400 },
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.analyticsEvent.create({
      data: {
        ...parsed.data,
        regionKey: parsed.data.regionKey || session?.user?.regionKey || null,
        userId: session?.user?.id || null,
      },
    });

    if (parsed.data.type === 'banner_click' && parsed.data.targetType === 'banner') {
      const banner = await tx.banner.findUnique({
        where: { id: parsed.data.targetKey },
        select: {
          id: true,
          adAccountId: true,
          billingMode: true,
          bidCents: true,
        },
      });

      if (banner?.adAccountId && banner.billingMode === 'CPC' && banner.bidCents > 0) {
        const amountCents = banner.bidCents;

        await tx.banner.update({
          where: { id: banner.id },
          data: {
            spentCents: {
              increment: amountCents,
            },
          },
          select: { id: true },
        });
        await tx.adCharge.create({
          data: {
            bannerId: banner.id,
            userId: session?.user?.id || null,
            amountCents,
            billingMode: 'CPC',
            sourceType: 'click',
          },
          select: { id: true },
        });
      }
    }
  });

  return NextResponse.json({ ok: true });
}
