import { NextResponse } from 'next/server';
import { requireModerationSession } from '@/lib/require-moderation';
import { newsArticleInputSchema } from '@/lib/news';
import { deleteNewsArticle, updateNewsArticle } from '@/lib/server/news-articles';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const { response } = await requireModerationSession();
  if (response) return response;

  const parsed = newsArticleInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }, { status: 400 });
  }
  const { id } = await params;
  const updated = await updateNewsArticle(id, parsed.data);
  if (!updated) return NextResponse.json({ error: 'Notícia não encontrada.' }, { status: 404 });
  return NextResponse.json({ id: updated.id });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { response } = await requireModerationSession();
  if (response) return response;

  const { id } = await params;
  const removed = await deleteNewsArticle(id);
  if (!removed) return NextResponse.json({ error: 'Notícia não encontrada.' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
