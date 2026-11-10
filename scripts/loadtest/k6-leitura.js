// Teste de carga (somente LEITURA) com k6. Nunca faz POST/PUT/DELETE.
//
// ATENÇÃO: rode contra um deploy de PREVIEW (que usa branch de banco), nunca contra gringoou.com.
//
// Uso (PowerShell, raiz do projeto):
//   k6 run -e BASE_URL=https://SEU-PREVIEW.vercel.app -e PROFILE=smoke scripts/loadtest/k6-leitura.js
//   k6 run -e BASE_URL=... -e PROFILE=carga  -e COOKIE="next-auth.session-token=..." scripts/loadtest/k6-leitura.js
//
// Variáveis:
//   BASE_URL  (obrigatória) endereço do Preview, sem barra final.
//   PROFILE   smoke (1 min, 5 usuários) | carga (10 min, até 100) | estresse (15 min, até 300). Padrão: smoke.
//   COOKIE    cookie de sessão de uma conta de TESTE (opcional). Sem ele, só rotas públicas são testadas.
//   BYPASS    segredo "Protection Bypass for Automation" da Vercel, se o Preview tiver Deployment Protection.
//
// Os valores de COOKIE e BYPASS ficam só na sua linha de comando; não os salve em arquivos nem no git.
import http from 'k6/http';
import { check, group, sleep } from 'k6';

const BASE = (__ENV.BASE_URL || '').replace(/\/$/, '');
if (!BASE) throw new Error('Defina BASE_URL, por exemplo: -e BASE_URL=https://SEU-PREVIEW.vercel.app');
if (/^https?:\/\/(www\.)?gringoou\.com/i.test(BASE)) {
  throw new Error('BASE_URL aponta para produção. Use um deploy de Preview.');
}

const PROFILES = {
  smoke: [{ duration: '30s', target: 5 }, { duration: '30s', target: 5 }],
  carga: [
    { duration: '2m', target: 25 },
    { duration: '3m', target: 50 },
    { duration: '3m', target: 100 },
    { duration: '2m', target: 0 },
  ],
  estresse: [
    { duration: '3m', target: 100 },
    { duration: '4m', target: 200 },
    { duration: '4m', target: 300 },
    { duration: '2m', target: 300 },
    { duration: '2m', target: 0 },
  ],
};

// Perfis sob medida: -e PROFILE=alvo -e VUS=125 (sobe em 2 degraus, segura o pico 5 min, desce).
//                    -e PROFILE=pico  -e VUS=125 (salto brusco ao alvo, simula divulgação/post viral).
// Referência: 1 usuário virtual ≈ 8 pessoas reais (cerca de 1,7 req/s contra ~0,1-0,2 req/s de uma pessoa).
const VUS = Math.max(1, Number(__ENV.VUS || 60));
PROFILES.alvo = [
  { duration: '3m', target: Math.ceil(VUS / 2) },
  { duration: '3m', target: VUS },
  { duration: '5m', target: VUS },
  { duration: '2m', target: 0 },
];
PROFILES.pico = [
  { duration: '1m', target: Math.ceil(VUS / 10) },
  { duration: '20s', target: VUS },
  { duration: '4m', target: VUS },
  { duration: '1m', target: 0 },
];

export const options = {
  stages: PROFILES[__ENV.PROFILE || 'smoke'] || PROFILES.smoke,
  thresholds: {
    http_req_failed: ['rate<0.01'], // menos de 1% de erros
    'http_req_duration{kind:publico}': ['p(95)<800'],
    'http_req_duration{kind:autenticado}': ['p(95)<1200'],
    'http_req_duration{name:ready}': ['p(95)<600'],
    // Limites folgados só para o k6 listar cada rota separadamente no resumo (diagnóstico, não critério).
    'http_req_duration{name:health}': ['p(95)<60000'],
    'http_req_duration{name:landing}': ['p(95)<60000'],
    'http_req_duration{name:login}': ['p(95)<60000'],
  },
};

const headers = {};
if (__ENV.BYPASS) headers['x-vercel-protection-bypass'] = __ENV.BYPASS;
if (__ENV.COOKIE) headers.Cookie = __ENV.COOKIE;

// redirects: 0 -> nunca seguir redirecionamento: um 302 para a tela de login da Vercel (SSO) deve reprovar, não "passar".
const get = (path, tags) => {
  const res = http.get(`${BASE}${path}`, { headers, tags, redirects: 0 });
  check(res, { [`${path} 200`]: (r) => r.status === 200 });
  return res;
};

// Aquecimento: acorda o banco (branch de Preview suspensa) e as funções antes de medir.
// As requisições daqui não levam as tags de `kind`/`name`, então não entram nos limites acima.
export function setup() {
  // Confirma que estamos falando com o APP e não com a tela de proteção da Vercel.
  const probe = http.get(`${BASE}/api/health`, { headers, redirects: 0 });
  let appOk = false;
  try {
    appOk = probe.status === 200 && JSON.parse(probe.body).status === 'ok';
  } catch (error) {
    appOk = false;
  }
  if (!appOk) {
    throw new Error(
      `/api/health respondeu ${probe.status} e nao o JSON do app. ` +
        'Se for 302/401, o Preview tem Deployment Protection: gere o segredo em Vercel > Settings > Deployment Protection > ' +
        'Protection Bypass for Automation e rode com -e BYPASS=SEGREDO.',
    );
  }

  for (let i = 0; i < 6; i += 1) {
    http.get(`${BASE}/api/health/ready`, { headers, redirects: 0 });
    http.get(`${BASE}/landing`, { headers, redirects: 0 });
    http.get(`${BASE}/login`, { headers, redirects: 0 });
    sleep(1);
  }
}

export default function () {
  group('publico', () => {
    get('/api/health', { kind: 'publico', name: 'health' });
    get('/api/health/ready', { kind: 'publico', name: 'ready' });
    get('/landing', { kind: 'publico', name: 'landing' });
    get('/login', { kind: 'publico', name: 'login' });
  });

  if (__ENV.COOKIE) {
    group('autenticado', () => {
      for (const path of [
        '/api/regions',
        '/api/community/posts',
        '/api/businesses',
        '/api/events',
        '/api/jobs',
        '/api/marketplace',
        '/api/news',
        '/api/search/suggestions?q=bra',
      ]) {
        get(path, { kind: 'autenticado', name: path.split('?')[0] });
      }
    });
  }

  sleep(1 + Math.random() * 2); // pausa de 1 a 3 s, como um usuário real
}
