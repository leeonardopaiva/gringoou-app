import { NextResponse } from 'next/server';
import { requireModerationSession } from '@/lib/require-moderation';
import { newsArticleInputSchema } from '@/lib/news';
import { createNewsArticle, listNewsForModeration } from '@/lib/server/news-articles';

const parseDate = (value: string | null, endOfDay = false) => {
  if (!value) return null;
  const date = new Date(value.length <= 10 ? `${value}${endOfDay ? 'T23:59:59.999' : 'T00:00:00'}` : value);
  return Number.isNaN(date.getTime()) ? null : date;
};

/** Listagem editorial — apenas MODERATOR/ADMIN (validado no servidor). */
export async function GET(request: Request) {
  const { response } = await requireModerationSession();
  if (response) return response;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const result = await listNewsForModeration({
    status: status === 'DRAFT' || status === 'PUBLISHED' ? status : null,
    authorId: searchParams.get('authorId') || null,
    category: searchParams.get('category') || null,
    from: parseDate(searchParams.get('from')),
    to: parseDate(searchParams.get('to'), true),
    query: searchParams.get('q')?.trim() || null,
    page: Number(searchParams.get('page')) || 1,
  });
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const { session, response } = await requireModerationSession();
  if (response || !session) return response;

  const parsed = newsArticleInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }, { status: 400 });
  }
  const created = await createNewsArticle(parsed.data, session.user.id);
  return NextResponse.json({ id: created.id }, { status: 201 });
}
