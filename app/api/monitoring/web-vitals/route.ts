import { NextResponse } from 'next/server';
import { z } from 'zod';

const webVitalSchema = z.object({
  id: z.string().max(160),
  name: z.enum(['CLS', 'FCP', 'FID', 'INP', 'LCP', 'TTFB']),
  value: z.number().finite(),
  rating: z.enum(['good', 'needs-improvement', 'poor']).optional(),
  delta: z.number().finite().optional(),
  navigationType: z.string().max(80).optional(),
  path: z.string().max(300),
});

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = webVitalSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: 'Métrica inválida.' }, { status: 400 });

  console.info('[web-vital]', JSON.stringify(parsed.data));
  return NextResponse.json({ ok: true });
}
