import { NextResponse } from 'next/server';
import { commitAdminImport, type AdminImportDraft } from '@/lib/admin-import';
import { requireAdminSession } from '@/lib/require-admin';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const { session, response } = await requireAdminSession();

  if (response) {
    return response;
  }

  const body = await request.json().catch(() => null);
  const draft = body?.draft as AdminImportDraft | undefined;

  if (!draft || !Array.isArray(draft.regions) || !Array.isArray(draft.businesses) || !Array.isArray(draft.events)) {
    return NextResponse.json({ error: 'Previa de importação inválida.' }, { status: 400 });
  }

  try {
    const result = await commitAdminImport(draft, session.user.id);

    return NextResponse.json({
      result,
      message: 'Importação concluída.',
    });
  } catch (error) {
    console.error('Failed to commit admin import:', error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Não foi possível concluir a importação.' },
      { status: 400 },
    );
  }
}
