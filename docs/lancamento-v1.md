# Lançamento controlado da V1

## Configuração na Vercel

Configure as variáveis existentes de banco, autenticação, Brevo, Stripe, Cloudinary, Mapbox e IA para **Production**. Mantenha `DEV_AUTH_ENABLED=false`, `NEXT_PUBLIC_DEV_AUTH_ENABLED=false`, `EMAIL_TEST_ENABLED=false` e `NEXT_PUBLIC_ADS_SMOKE_TEST_MODE=false`.

As novas chaves operacionais aceitam `false` para pausar apenas a funcionalidade indicada. Ausência ou `true` mantém o comportamento atual:

| Variável | Efeito quando `false` |
| --- | --- |
| `REGISTRATION_ENABLED` | Pausa cadastro pessoal e de Ads, criação por magic link e primeira entrada pelo Google. Contas existentes continuam entrando. |
| `AI_ASSISTANT_ENABLED` | Pausa a resposta gerada pelo assistente. |
| `ADS_CHECKOUT_ENABLED` | Pausa a criação de novos pagamentos de anúncios. Webhooks continuam ativos para concluir pagamentos anteriores. |
| `MAINTENANCE_MODE` | Quando `true`, restringe a aplicação aos administradores. |

Para Sentry, configure `SENTRY_DSN` e `NEXT_PUBLIC_SENTRY_DSN` com o DSN do projeto. Sem DSN, o SDK fica desativado. Para subir sourcemaps privados, configure `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` e `SENTRY_PROJECT`. As taxas de amostragem opcionais estão em `.env.example`. Replay mascara texto e bloqueia mídia; mantenha a amostragem de sessão em zero até revisar a política de privacidade.

Ative **Web Analytics** e **Speed Insights** no painel da Vercel. O componente Analytics está no layout raiz. Speed Insights amostra 20% das visitas; Web Vitals também são registrados nos logs do projeto.

## Verificações antes do push

```powershell
npm run typecheck
npm run build
npx playwright install chromium
npm run test:e2e -- --project=chromium
```

O teste E2E usa `127.0.0.1:3100`, inicia o build de produção local e verifica saúde, headers, redirecionamento de área privada e bloqueio dos endpoints de desenvolvimento. Rode `npm run build` antes. Os projetos `mobile-chrome` e `mobile-safari` exigem os navegadores Playwright correspondentes; emule mobile somente depois de instalar seus binários. Não execute a suíte contra produção com dados reais sem revisar as variáveis de ambiente e o alvo.

## Smoke test após o deploy

1. Abra `/api/health` e confirme `status: ok` e a versão do commit. Esse endpoint mede apenas disponibilidade do servidor; não testa banco ou integrações.
2. Confira `Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options` e `Referrer-Policy` na resposta HTTPS.
3. Confirme que `/api/dev/email-preview` e `/api/dev/magic-link` retornam 404 em produção.
4. Cadastre uma conta piloto e verifique e-mail, magic link, senha e Google.
5. Teste publicação, feed paginado, mudança de região, upload, IA, moderação e pagamentos Stripe em ambiente de teste.
6. Confirme eventos no Sentry, Analytics e Speed Insights. Configure alertas no Sentry para novas falhas e aumento de erros.
7. Valide backup e restauração da Neon em uma branch de teste, entrega Brevo, webhook Stripe e limites de custos dos provedores.

## Pendências de risco

O relatório `npm audit` caiu de 19 para 10 avisos após atualizações compatíveis. Os restantes envolvem dependências transitivas de Prisma, Next/PostCSS, NextAuth/Nodemailer e ExcelJS/uuid. Requerem atualização maior ou correção upstream; não execute `npm audit fix --force` na semana de lançamento. Reavalie cada pacote e seu caminho de exploração antes de ampliar o público.

A política CSP inicial ainda permite scripts inline, necessários para a renderização atual do Next e integrações. Ela reduz algumas superfícies, mas não substitui uma CSP com nonce. Teste Google, Stripe, Cloudinary e Mapbox no Preview e ajuste domínios específicos se o navegador apontar bloqueios.

Os testes automatizados incluídos são de fumaça e não cobrem os fluxos autenticados ou pagamentos. Faça o checklist manual com contas separadas de usuário, moderador, admin e anunciante antes de liberar convites externos.

## Primeira semana

Comece com equipe interna e uma região piloto. Mantenha um responsável por observar logs, Sentry, fila de moderação, Brevo, Stripe e custos da IA. Amplie convites gradualmente. Se ocorrer falha em uma integração, altere a flag correspondente na Vercel e faça redeploy; use `MAINTENANCE_MODE=true` para incidente amplo.
