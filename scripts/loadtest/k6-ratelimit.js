// Teste do limite global de escritas (middleware + Upstash). NÃO grava nada.
//
// Como funciona: envia ~200 requisições POST a uma rota que NÃO existe (/api/__teste-limite). O middleware
// conta a escrita ANTES de qualquer rota rodar, então nenhum código de negócio executa: a resposta normal é 404
// e, passando de 120 escritas por minuto por usuário, 429. Assim se confirma que o Upstash está ativo e o teto vale.
//
// ATENÇÃO:
//  - Somente em PREVIEW (o script recusa gringoou.com).
//  - A conta do COOKIE fica limitada por até 1 minuto após o teste. Não rode outros testes com o mesmo cookie ao mesmo tempo.
//
// Uso (PowerShell):
//   k6 run -e BASE_URL=https://SEU-PREVIEW.vercel.app -e BYPASS=SEGREDO -e COOKIE="__Secure-next-auth.session-token=VALOR" scripts/loadtest/k6-ratelimit.js
import http from 'k6/http';
import { check } from 'k6';
import { Counter } from 'k6/metrics';

const BASE = (__ENV.BASE_URL || '').replace(/\/$/, '');
if (!BASE) throw new Error('Defina BASE_URL com o endereço do Preview.');
if (/^https?:\/\/(www\.)?gringoou\.com/i.test(BASE)) throw new Error('BASE_URL aponta para produção. Use um Preview.');
if (!__ENV.COOKIE) throw new Error('Defina COOKIE com o cookie de sessão de uma conta de TESTE (o limite é por usuário).');

const headers = { 'Content-Type': 'application/json', Cookie: __ENV.COOKIE };
if (__ENV.BYPASS) headers['x-vercel-protection-bypass'] = __ENV.BYPASS;

// 404 (rota inexistente) e 429 (limite) são respostas esperadas; só o resto conta como falha.
http.setResponseCallback(http.expectedStatuses(404, 429));

const limited = new Counter('limite_429');
const allowed = new Counter('limite_permitidas');
const unexpected = new Counter('limite_inesperadas');

export const options = {
  scenarios: {
    rajada: { executor: 'per-vu-iterations', vus: 10, iterations: 20, maxDuration: '2m' },
  },
  thresholds: {
    limite_429: ['count>=10'], // com o teto de 120/min, 200 tentativas precisam gerar vários 429
    limite_inesperadas: ['count==0'],
  },
};

export function setup() {
  // 1) Estamos falando com o app (não com a tela de proteção da Vercel)?
  const probe = http.get(`${BASE}/api/health`, { headers: { 'x-vercel-protection-bypass': __ENV.BYPASS || '' }, redirects: 0 });
  let appOk = false;
  try {
    appOk = probe.status === 200 && JSON.parse(probe.body).status === 'ok';
  } catch (error) {
    appOk = false;
  }
  if (!appOk) throw new Error(`/api/health respondeu ${probe.status}. Preview protegido? Use -e BYPASS=SEGREDO.`);

  // 2) O cookie é válido? (rota de leitura autenticada)
  const session = http.get(`${BASE}/api/regions`, { headers, redirects: 0 });
  if (session.status !== 200) throw new Error(`Cookie inválido ou expirado (/api/regions respondeu ${session.status}).`);
}

export default function () {
  const res = http.post(`${BASE}/api/__teste-limite`, '{}', { headers, redirects: 0 });
  if (res.status === 429) {
    limited.add(1);
    check(res, { '429 veio do nosso middleware': (r) => String(r.body).includes('Muitas requisicoes') });
  } else if (res.status === 404) {
    allowed.add(1);
  } else {
    unexpected.add(1);
  }
}

export function handleSummary(data) {
  const count = (name) => (data.metrics[name] ? data.metrics[name].values.count : 0);
  const n429 = count('limite_429');
  const ok = count('limite_permitidas');
  const veredito =
    n429 >= 10
      ? 'LIMITE ATIVO: o teto de escritas está sendo aplicado.'
      : 'LIMITE NÃO DETECTADO: confirme o Upstash ativo, as variáveis UPSTASH_* em Preview e o Redeploy.';
  return {
    stdout: `\nPermitidas (404): ${ok}\nBloqueadas (429): ${n429}\nInesperadas: ${count('limite_inesperadas')}\n${veredito}\n`,
  };
}
