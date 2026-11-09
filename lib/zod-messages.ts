import { z } from 'zod';

/**
 * Mensagens de validação em português claro, sem termos técnicos.
 * Valem como padrão para qualquer campo que não defina a própria mensagem (as mensagens escritas nos
 * schemas continuam tendo prioridade). Carregado uma vez no servidor (instrumentation) e nos arquivos de validação.
 */
type Issue = { code: string; input?: unknown; origin?: string; minimum?: number | bigint; maximum?: number | bigint; format?: string; expected?: string };

const isEmpty = (value: unknown) => value === undefined || value === null || value === '';

export function friendlyZodMessage(issue: Issue): string | undefined {
  switch (issue.code) {
    case 'invalid_type':
      if (isEmpty(issue.input)) return 'Preencha este campo.';
      if (issue.expected === 'number') return 'Informe um número válido.';
      return 'O valor informado não é válido. Confira e tente de novo.';
    case 'too_small': {
      const min = Number(issue.minimum);
      if (issue.origin === 'string') return min <= 1 ? 'Preencha este campo.' : `Use pelo menos ${min} caracteres.`;
      if (issue.origin === 'array' || issue.origin === 'set') return `Selecione pelo menos ${min}.`;
      if (issue.origin === 'date') return 'A data informada é muito antiga.';
      return `O valor deve ser de no mínimo ${min}.`;
    }
    case 'too_big': {
      const max = Number(issue.maximum);
      if (issue.origin === 'string') return `Use no máximo ${max} caracteres.`;
      if (issue.origin === 'array' || issue.origin === 'set') return `Selecione no máximo ${max}.`;
      if (issue.origin === 'date') return 'A data informada é muito distante.';
      return `O valor deve ser de no máximo ${max}.`;
    }
    case 'invalid_format':
      if (issue.format === 'email') return 'Informe um e-mail válido.';
      if (issue.format === 'url') return 'Informe um link válido, começando com https://.';
      if (issue.format === 'cuid' || issue.format === 'cuid2' || issue.format === 'uuid') return 'Não foi possível identificar o item. Atualize a página e tente de novo.';
      return 'O formato informado não é válido. Confira e tente de novo.';
    case 'invalid_value':
      return 'Escolha uma das opções disponíveis.';
    case 'not_multiple_of':
      return 'O valor informado não é válido.';
    default:
      return undefined;
  }
}

let configured = false;
export function configureFriendlyZodMessages() {
  if (configured) return;
  configured = true;
  z.config({ customError: (issue) => friendlyZodMessage(issue as unknown as Issue) });
}

configureFriendlyZodMessages();
