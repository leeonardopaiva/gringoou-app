/**
 * Mensagens de erro para o usuário final.
 *
 * Regra do produto: o usuário nunca vê erro técnico ("Failed to fetch", "Unexpected token",
 * "TypeError", códigos HTTP, nomes de biblioteca). Quem precisa do detalhe é o desenvolvedor, e
 * ele continua no console do navegador. Aqui o erro vira uma frase clara e natural.
 *
 * Uso: `showToast(getUserErrorMessage(error, 'Não foi possível salvar agora.'), 'error')`.
 * Mensagens que já são frases nossas, em português, passam como estão.
 */

export const NETWORK_ERROR_MESSAGE = 'Não conseguimos conectar agora. Confira sua internet e tente novamente.';
export const DEFAULT_ERROR_MESSAGE = 'Algo deu errado. Tente novamente em instantes.';

// Falhas de rede e de tempo limite, como cada navegador as descreve (Chrome, Firefox, Safari).
const NETWORK_PATTERN =
  /failed to fetch|networkerror|network request failed|network error|load failed|fetch failed|the internet connection appears|internet connection|timed? ?out|aborted|err_|econn|enotfound/i;

// Erros de código, de formato ou de servidor que não dizem nada a quem usa o app.
const TECHNICAL_PATTERN =
  /unexpected (token|end)|is not valid json|\bjson\b|\bundefined\b|\bnull\b|cannot (read|set|access)|is not a function|is not defined|typeerror|referenceerror|syntaxerror|rangeerror|internal server error|status code|\bhttp (status|error)\b|\bhttp \d{3}\b|\bstack\b|prisma|invocation|\bat \w+ \(|\[object|nextauth|csrf|credentialssignin|callback/i;

// Palavras comuns em mensagens técnicas em inglês. Nossas frases são em português.
const ENGLISH_PATTERN =
  /\b(the|is|are|was|not|failed|error|invalid|unable|cannot|could|please|try|again|requests?|responses?|server|many|too|network|unexpected|required|missing|found|unauthorized|forbidden|denied|expired)\b/i;

/** Verdadeiro quando o texto parece técnico ou em inglês, e não uma frase pensada para o usuário. */
export function isTechnicalMessage(message: string) {
  return NETWORK_PATTERN.test(message) || TECHNICAL_PATTERN.test(message) || ENGLISH_PATTERN.test(message);
}

const readMessage = (error: unknown) => {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error && typeof (error as { message: unknown }).message === 'string') {
    return (error as { message: string }).message;
  }
  return '';
};

/**
 * Converte um erro (ou texto de erro) em algo que o usuário entende.
 * - Falha de conexão -> mensagem de internet.
 * - Texto técnico ou em inglês -> o `fallback` que você passou (a frase da ação, ex.: "Não foi possível salvar").
 * - Frase nossa em português -> como está.
 * O erro original continua no console, para quem desenvolve.
 */
export function getUserErrorMessage(error: unknown, fallback: string = DEFAULT_ERROR_MESSAGE): string {
  const raw = readMessage(error).trim();
  if (!raw) return fallback;

  if (NETWORK_PATTERN.test(raw)) {
    logTechnical(error);
    return NETWORK_ERROR_MESSAGE;
  }

  if (isTechnicalMessage(raw)) {
    logTechnical(error);
    return fallback;
  }

  return raw;
}

/** Para textos já prontos (por exemplo, o que a API devolveu): troca por um fallback se for técnico. */
export function sanitizeUserMessage(message: unknown, fallback: string = DEFAULT_ERROR_MESSAGE) {
  return getUserErrorMessage(message, fallback);
}

function logTechnical(error: unknown) {
  // Só o desenvolvedor vê: o console do navegador. Nada disso aparece na tela.
  if (typeof console !== 'undefined') console.error('[erro técnico, oculto do usuário]', error);
}
