import { NextResponse } from 'next/server';
import { previewAdminImportWorkbook } from '@/lib/admin-import';
import { requireAdminSession } from '@/lib/require-admin';

export const runtime = 'nodejs';

const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request) {
  const { response } = await requireAdminSession();

  if (response) {
    return response;
  }

  const formData = await request.formData();
  const file = formData.get('file');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Envie um arquivo XLSX valido.' }, { status: 400 });
  }

  if (!file.name.toLowerCase().endsWith('.xlsx')) {
    return NextResponse.json({ error: 'Use o modelo em formato .xlsx.' }, { status: 400 });
  }

  // XLSX é um zip: limitar o tamanho evita estouro de memória ao descompactar.
  if (file.size > MAX_IMPORT_BYTES) {
    return NextResponse.json({ error: 'O arquivo excede 5 MB. Divida a importacao em partes menores.' }, { status: 413 });
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const preview = await previewAdminImportWorkbook(Buffer.from(arrayBuffer));

    return NextResponse.json(preview);
  } catch (error) {
    console.error('Failed to preview admin import:', error);

    return NextResponse.json(
      { error: 'Nao foi possivel ler o XLSX. Baixe o modelo novamente e confira as abas.' },
      { status: 400 },
    );
  }
}
