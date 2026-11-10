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

const get = (path, tags) => {
  const res = http.get(`${BASE}${path}`, { headers, tags });
  check(res, { [`${path} 200`]: (r) => r.status === 200 });
  return res;
};

// Aquecimento: acorda o banco (branch de Preview suspensa) e as funções antes de medir.
// As requisições daqui não levam as tags de `kind`/`name`, então não entram nos limites acima.
export function setup() {
  for (let i = 0; i < 6; i += 1) {
    http.get(`${BASE}/api/health/ready`, { headers });
    http.get(`${BASE}/landing`, { headers });
    http.get(`${BASE}/login`, { headers });
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
