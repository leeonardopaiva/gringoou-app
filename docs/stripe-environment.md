# Stripe environment

O Gringoou Ads processa contratos avulsos em dolar americano (USD) com PaymentIntents e Payment Element.

## Desenvolvimento local

Adicione ao `.env.local` (nunca versione esse arquivo):

```dotenv
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_SECRET_KEY="rk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
NEXTAUTH_URL="http://localhost:3000"
```

- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: chave publica do sandbox. Pode ser enviada ao navegador.
- `STRIPE_SECRET_KEY`: prefira uma restricted key (`rk_test_...`) com acesso minimo a PaymentIntents. Nunca use esta chave no cliente.
- `STRIPE_WEBHOOK_SECRET`: valor temporario exibido por `stripe listen`; ele pertence somente ao listener local atual.
- `NEXTAUTH_URL`: origem local usada nos links de retorno e notificacoes.

Inicie o encaminhamento local em outro terminal:

```powershell
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copie o novo `whsec_...` impresso pelo comando para `STRIPE_WEBHOOK_SECRET` e reinicie o Next.js sempre que o segredo mudar.

Se o `stripe listen` falhar com `api_key_expired`, a chave temporaria criada pelo `stripe login` (validade de 90 dias) expirou. Rode `stripe login` de novo ou passe uma chave permanente do modo teste: `stripe listen --api-key "sk_test_..." --forward-to localhost:3000/api/webhooks/stripe`.

Localmente use sempre chaves de **teste** (`pk_test` + `sk_test`). A chave publica e a secreta precisam ser do mesmo modo, e uma chave live em `dev:local` gera cobrancas reais.

O app tambem nao depende so do webhook: ao voltar do pagamento, a pagina `/ads/anuncio-em-analise` consulta o Stripe e confirma o pagamento. Por isso o fluxo local funciona mesmo sem `stripe listen`.

## Preview e producao

Configure variaveis separadas no provedor de hospedagem (apos alterar, faca um novo deploy):

```dotenv
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_..."
STRIPE_SECRET_KEY="rk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
NEXTAUTH_URL="https://<dominio-de-producao>"
```

O `STRIPE_WEBHOOK_SECRET` de producao e obtido no endpoint criado no Stripe (Developers → Webhooks, **com o modo de teste desligado**) para:

```text
<NEXTAUTH_URL>/api/webhooks/stripe
```

A URL do endpoint precisa ser **identica** a `NEXTAUTH_URL`, com ou sem `www`. O Stripe nao segue redirecionamentos, entao um endpoint cadastrado em um host que redireciona para o outro faz todos os avisos falharem. Se o endpoint for recriado, o `whsec_` muda e o Vercel deve ser atualizado.

Se uma `rk_live_...` for usada, ela precisa de leitura de PaymentIntents e, para o diagnostico completo, de Webhook Endpoints e Events.

Eventos usados pelo sistema:

- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `payment_intent.canceled`
- `charge.refunded`

Se o endpoint tambem receber Checkout Sessions, mantenha `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed` e `checkout.session.expired`.

## Diagnostico e recuperacao (administrador raiz)

Em **Admin → Integracoes** o card "Stripe: diagnostico e teste" faz consultas somente de leitura: formato e modo das chaves (so o prefixo e os 4 ultimos caracteres), conexao com o Stripe, endpoint do webhook e eventos cadastrados, entrega dos eventos recentes, campanhas paradas e pacotes ativos. Nenhuma chave e gravada no painel; os valores ficam apenas no ambiente.

Campanha paga que nao apareceu em **Admin → Anuncios → Pendentes**: use "Verificar pagamentos pendentes" (em Integracoes ou em Anuncios). Ele consulta o Stripe campanha por campanha e envia para revisao so as que tiverem PaymentIntent `succeeded`; para as demais mostra o motivo. Pagamentos feitos com chave de outro modo (teste x live) nao sao encontrados (`No such payment_intent`).

Regra do sistema: pagamento negado, cancelado, pendente ou com valor diferente do contrato nunca avanca; a campanha segue como rascunho e o usuario ve "Pagamento nao aprovado".

## Seguranca das chaves

Use chaves diferentes para desenvolvimento, preview e producao. Marque as chaves privadas e o signing secret como variaveis sensiveis, restrinja o acesso por ambiente e rotacione qualquer chave que tenha sido compartilhada em chat, log ou commit.
