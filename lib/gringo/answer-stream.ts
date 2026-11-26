/**
 * O Gringo responde em duas partes na mesma resposta: primeiro o texto que a pessoa lê (enviado aos
 * poucos, enquanto o modelo escreve) e, depois da linha ###META, um JSON com as referências e as
 * perguntas de continuidade. Este separador corta o texto no marcador mesmo que ele chegue partido
 * entre dois pedaços.
 */
export const META_MARKER = '###META';

export class AnswerSplitter {
  private buffer = '';
  private answer = '';
  private meta = '';
  private inMeta = false;

  /** Recebe um pedaço do modelo e devolve o trecho do texto da resposta que já pode ser mostrado. */
  push(chunk: string): string {
    if (this.inMeta) {
      this.meta += chunk;
      return '';
    }

    this.buffer += chunk;
    const index = this.buffer.indexOf(META_MARKER);
    if (index >= 0) {
      const emit = this.buffer.slice(0, index).replace(/\s+$/, '');
      this.meta = this.buffer.slice(index + META_MARKER.length);
      this.buffer = '';
      this.inMeta = true;
      this.answer += emit;
      return emit;
    }

    // Guarda o final do buffer: pode ser o começo do marcador.
    const safe = this.buffer.length - (META_MARKER.length - 1);
    if (safe <= 0) return '';
    // Também retém o espaço/quebra de linha final: ele só vale se vier mais texto depois.
    const emit = this.buffer.slice(0, safe).replace(/\s+$/, '');
    this.buffer = this.buffer.slice(emit.length);
    this.answer += emit;
    return emit;
  }

  /** Fim do texto do modelo: devolve o que sobrou da resposta e o JSON (bruto) das referências. */
  finish(): { tail: string; answer: string; meta: string } {
    let tail = '';
    if (!this.inMeta) {
      tail = this.buffer.replace(/\s+$/, '');
      this.answer += tail;
      this.buffer = '';
    }
    return { tail, answer: this.answer.trim(), meta: this.meta.trim() };
  }
}

export function parseGringoMeta(raw: string): { referenceIds: string[]; followUps: string[] } {
  const cleaned = raw.replace(/^```(?:json)?\s*|\s*```$/gi, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end <= start) return { referenceIds: [], followUps: [] };
  try {
    const parsed = JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>;
    const strings = (value: unknown) => (Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []);
    return { referenceIds: strings(parsed.referenceIds), followUps: strings(parsed.followUps) };
  } catch {
    return { referenceIds: [], followUps: [] };
  }
}
