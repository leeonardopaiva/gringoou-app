# Checklist de lançamento público

Pré-requisito: correções de segurança no ar (versão `d6aef92` ou posterior, conferida em `/api/health`).
Este documento cobre os itens que **não são código**. Marque cada um só depois de executado e registrado.

| # | Item | Responsável | Status |
| --- | --- | --- | --- |
| 1 | Upgrade do plano do Neon | Dono da conta | ☐ |
| 2 | Teste de restauração de backup | Dev + dono | ☐ |
| 3 | Revisão jurídica (ver `revisao-juridica-privacidade.md`) | Jurídico | ☐ |
| 4 | Teste de carga em Preview | Dev | ☐ |
| 5 | Monitor externo em `/api/health/ready` + alertas Sentry | Dev | ☐ |
| 6 | Smoke test manual (login, exportar dados, excluir conta de teste, 429 no login) | Dev | ☐ |

Regra de liberação: **sem os itens 1, 2 e 3 não abrir o cadastro sem convite nem fazer campanha paga.** O item 4 é obrigatório antes de qualquer campanha de mídia.

---

## 1. Upgrade do plano do Neon

Por quê: no plano Free o histórico de restauração é curto, a computação suspende por inatividade (primeira visita após pausa fica lenta) e há limites de armazenamento e computação.

1. console.neon.tech → botão **Upgrade** (a cobrança passa pela Vercel, pois o banco foi instalado pela integração).
2. Escolha o plano pago mais barato que ofereça **janela de restauração de pelo menos 7 dias** (confira a tabela de planos na hora: os limites mudam).
3. Projeto `emigrei-db` → **Settings → Compute**:
   - Se o plano permitir, **desative a suspensão por inatividade** na branch de produção (elimina o atraso da primeira requisição).
   - Defina autoscaling com mínimo baixo e **máximo de 2 a 4 CU** para absorver picos; ajuste depois do teste de carga.
4. **Settings → Storage / History**: confirme a janela de restauração ativada.
5. Confirme que `DATABASE_URL` usa o host **pooled** (`-pooler`) e `DIRECT_URL` o direto (usado só por migrations).
6. Defina um **alerta de gasto/uso** no painel de billing.

Registro: data do upgrade, plano, janela de restauração, limite de autoscaling: ____________________

---

## 2. Teste de restauração de backup

Objetivo: provar que um backup **restaura e abre**, e medir quanto tempo leva (RTO) e quanto dado se perde no pior caso (RPO). Não altera a produção: tudo é feito em uma branch separada.

1. Neon → `emigrei-db` → **Branches**. Anote a hora atual (UTC).
2. **Create branch** a partir da `main` escolhendo **um ponto no passado** (opção "Past data" / "Specific time"), por exemplo 1 hora atrás. Nome: `restore-test-AAAAMMDD`.
3. Abra o **SQL Editor** na branch `restore-test-...` e rode (somente leitura):

```sql
SELECT 'User' AS tabela, count(*) FROM "User"
UNION ALL SELECT 'CommunityPost', count(*) FROM "CommunityPost"
UNION ALL SELECT 'Business', count(*) FROM "Business"
UNION ALL SELECT 'Event', count(*) FROM "Event"
UNION ALL SELECT 'Job', count(*) FROM "Job"
UNION ALL SELECT 'MarketplaceItem', count(*) FROM "MarketplaceItem"
UNION ALL SELECT 'UtmRule', count(*) FROM "UtmRule"
UNION ALL SELECT 'migrations', count(*) FROM "_prisma_migrations";
```

4. Rode a **mesma consulta na `main`** e compare. As contagens devem ser iguais ou ligeiramente menores na branch restaurada (dados criados depois do ponto escolhido).
5. Confira que a última migration aplicada aparece na branch restaurada.
6. Cronometre: do passo 2 até a consulta responder. Esse é o **RTO** medido.
7. Apague a branch de teste ao terminar. **Nunca** execute "Restore" sobre a `main` neste teste.

Registro: data, ponto restaurado, contagens iguais? (sim/não), RTO medido, quem executou: ____________________

Plano para um incidente real (resumo): (a) pôr `MAINTENANCE_MODE=true` na Vercel; (b) criar branch do ponto anterior ao dano; (c) validar contagens; (d) só então promover/restaurar e atualizar as URLs; (e) desligar a manutenção. Quem decide e quem executa: ____________________

---

## 4. Teste de carga em Preview

Arquivo: `scripts/loadtest/k6-leitura.js` (somente leitura, nenhuma escrita; recusa `gringoou.com`).

### Preparação
1. Instale o k6 (uma vez): `choco install k6` (ou `winget install k6`).
2. Gere um **deploy de Preview** (qualquer branch). Ele usa uma branch de banco, então não toca a produção. Anote a URL.
3. Se o Preview tiver Deployment Protection, gere o segredo em Vercel → Settings → Deployment Protection → **Protection Bypass for Automation**.
4. Para testar rotas autenticadas, crie uma **conta de teste** (nunca de usuário real), faça login no Preview e copie o cookie `next-auth.session-token` (DevTools → Application → Cookies). Ele expira em 8 horas.

### Execução (PowerShell, raiz do projeto)
Comece sempre pelo perfil pequeno:

```powershell
k6 run -e BASE_URL=https://SEU-PREVIEW.vercel.app -e PROFILE=smoke scripts/loadtest/k6-leitura.js
```

Se passar, suba:

```powershell
k6 run -e BASE_URL=https://SEU-PREVIEW.vercel.app -e PROFILE=carga -e BYPASS=SEGREDO -e COOKIE="next-auth.session-token=VALOR" scripts/loadtest/k6-leitura.js
k6 run -e BASE_URL=https://SEU-PREVIEW.vercel.app -e PROFILE=estresse -e BYPASS=SEGREDO -e COOKIE="next-auth.session-token=VALOR" scripts/loadtest/k6-leitura.js
```

Perfis: `smoke` (1 min, 5 usuários), `carga` (10 min, até 100), `estresse` (15 min, até 300). Não salve SEGREDO nem o cookie em arquivos.

### Critérios de aprovação
- Erros (`http_req_failed`) **abaixo de 1%**.
- p95 das rotas públicas **abaixo de 800 ms**, das autenticadas **abaixo de 1,2 s**, de `/api/health/ready` **abaixo de 600 ms**.
- Sem pico de erro 5xx no painel da Vercel durante o teste.

### O que observar durante o teste
- Neon → Monitoring: conexões ativas, CPU/CU e latência. Se as conexões encostarem no limite, ajuste o pooler/autoscaling.
- Vercel → Observability: duração e erros das funções.
- Upstash: comandos por segundo (o rate limit só atua em escritas, então não deve disparar).
- Sentry: novas falhas.

### Registro do resultado
| Perfil | Usuários máx. | Erros | p95 público | p95 autenticado | Gargalo observado |
| --- | --- | --- | --- | --- | --- |
| smoke | 5 | | | | |
| carga | 100 | | | | |
| estresse | 300 | | | | |

Capacidade segura = maior perfil que passou **sem** reprovar os critérios. Esse número define o tamanho da primeira campanha.

Limite deste teste: ele cobre leitura. Fluxos de escrita (publicar, mensagens, pagamento) devem ser testados separadamente e com cuidado, pois o rate limit global de escritas os limitará.

---

## 5. Monitoramento externo
- Monitor (UptimeRobot ou Better Stack) em `https://gringoou.com/api/health/ready`, a cada 1 minuto, alerta por e-mail se falhar 2 vezes.
- Sentry: alertas para "nova issue" e "aumento de taxa de erro".
- Vercel: alerta de falha de deploy em produção.

## 6. Smoke test manual (conta de teste)
- [ ] Login por senha, por magic link e por Google.
- [ ] Menu da conta → Privacidade → **Baixar meus dados** gera o JSON, sem hash de senha.
- [ ] Criar conta de teste → **Excluir minha conta** → sessão encerra e o login não funciona mais.
- [ ] 16 tentativas seguidas de senha errada → resposta "Muitas requisições" (429).
- [ ] `/admin` exibe o item **UTM** e salva uma regra.
- [ ] Pagamento de anúncio em modo teste do Stripe.
