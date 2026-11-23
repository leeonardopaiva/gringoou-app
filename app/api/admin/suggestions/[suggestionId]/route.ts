import { SuggestionStatus } from '@prisma/client';
import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/require-admin';
import { prisma } from '@/lib/prisma';
import { adminSuggestionSchema } from '@/lib/validators';

type RouteContext = {
  params: Promise<{ suggestionId: string }>;
};

export async function PUT(request: Request, context: RouteContext) {
  const { response } = await requireAdminSession();

  if (response) {
    return response;
  }

  const body = await request.json();
  const parsed = adminSuggestionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Dados inválidos para a sugestão.' },
      { status: 400 },
    );
  }

  const { suggestionId } = await context.params;

  const suggestion = await prisma.suggestion.findUnique({
    where: { id: suggestionId },
    select: { id: true },
  });

  if (!suggestion) {
    return NextResponse.json({ error: 'Sugestão não encontrada.' }, { status: 404 });
  }

  const updatedSuggestion = await prisma.suggestion.update({
    where: { id: suggestionId },
    data: {
      status: parsed.data.status,
    },
    select: {
      id: true,
      status: true,
    },
  });

  return NextResponse.json({
    suggestion: updatedSuggestion,
    message:
      updatedSuggestion.status === SuggestionStatus.REVIEWED
        ? 'Sugestão marcada como revisada.'
        : 'Sugestão reaberta para análise.',
  });
}
