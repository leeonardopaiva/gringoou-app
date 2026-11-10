# Material para revisão jurídica — Privacidade e LGPD (Gringoou)

**Para:** advogado/a ou encarregado/a de dados (DPO) que revisará a Política de Privacidade e os Termos de Uso antes do lançamento público.
**Natureza do documento:** levantamento técnico do que a plataforma faz hoje com dados pessoais, escrito por quem desenvolveu o sistema. **Não é parecer jurídico.** Bases legais, prazos e redação final são sugestões a validar. Campos entre `[colchetes]` precisam ser preenchidos pela empresa.

Estado da política atual (`/politica-de-privacidade`, atualizada em 3 de agosto de 2026): 5 parágrafos genéricos (dados coletados, uso, compartilhamento, retenção/segurança, direitos). Não cita provedores, transferência internacional, prazos de retenção, cookies/armazenamento local, encarregado, nem os novos canais de exclusão e exportação.

---

## 1. O que mudou no produto (e precisa constar no texto)
1. **Exportação dos dados** pelo próprio usuário: menu da conta → Privacidade → "Baixar meus dados" (arquivo JSON com perfil, conteúdos, mensagens enviadas, favoritos, avaliações, solicitações de amizade; sem senha). Limite de 3 exportações por hora.
2. **Exclusão da conta** pelo próprio usuário (confirmando o @usuário). Conteúdos próprios são apagados; registros de pagamento, cobrança e impressões de anúncios permanecem **sem identificação** (o vínculo ao usuário é removido). Administradores só são removidos por outro administrador. Quem é o único responsável por uma conta de anúncios precisa transferi-la antes.
3. **Rastreio de origem (UTM):** a plataforma guarda no navegador (localStorage, 30 dias) os parâmetros `utm_*` de chegada e os anexa a eventos de interação (cliques em banners, buscas, recursos indisponíveis).
4. **Limitação de requisições** por IP/usuário (proteção contra abuso), com o IP tratado de forma transitória.

## 2. Inventário de dados pessoais
| Categoria | Dados | Onde ficam | Finalidade | Base legal sugerida (validar) |
| --- | --- | --- | --- | --- |
| Conta | nome, @usuário, e-mail, hash de senha, e-mail verificado, papel | Banco (Neon) | Autenticação, identificação | Execução de contrato |
| Perfil | foto, capa, bio, objetivo, interesses, gênero, idade, tempo no exterior, cidade de nascimento, localização e região | Banco | Personalizar conteúdo regional e perfil público | Execução de contrato; consentimento para campos opcionais/sensíveis a avaliar |
| Telefone | número, país, data de verificação | Banco; SMS via Twilio | Verificação de conta, prevenção a fraude | Legítimo interesse / execução de contrato |
| Conteúdo gerado | publicações, comentários, negócios, eventos, vagas, moradia, anúncios do marketplace, grupos | Banco; imagens no Cloudinary | Operar a comunidade | Execução de contrato |
| Mensagens | conversas do marketplace e mensagens diretas | Banco; **conteúdo trafega pelo Ably** (tempo real) | Comunicação entre usuários, moderação | Execução de contrato; legítimo interesse (moderação) |
| Anunciantes | conta de anúncios, campanhas, cobranças | Banco; pagamento no Stripe (dados de cartão ficam com o Stripe) | Veiculação e cobrança | Execução de contrato; obrigação legal (fiscal) |
| Interações | eventos de analytics (tipo, página, região, origem UTM, id do usuário quando logado), favoritos, avaliações | Banco | Medir desempenho de campanhas e produto | Legítimo interesse (avaliar se exige consentimento para anunciantes/terceiros) |
| Técnicos | país de acesso (cabeçalho da Vercel), IP (limite de requisições, transitório), erros (Sentry, sem dados pessoais por padrão), métricas de desempenho (Vercel Analytics / Speed Insights) | Vercel, Upstash, Sentry | Segurança, estabilidade | Legítimo interesse |
| Sessão e cookies | cookie de sessão (8 h), convite, portão de pré-lançamento | Navegador | Funcionamento essencial | Estritamente necessário |
| Localização aproximada | cidade/região; o mapa do marketplace mostra apenas **área aproximada** (raio de 800 m) | Banco; mapas via Mapbox | Reduzir exposição do endereço exato | Execução de contrato |

Dados sensíveis (art. 5º, II): não há campo explícito para origem racial, saúde, religião etc. **Avaliar** se gênero, idade e "objetivo no exterior" combinados com localização exigem tratamento mais cauteloso.

## 3. Operadores e transferência internacional
Todos recebem dados fora do Brasil ou podem receber. A empresa precisa **confirmar a região contratada** e o instrumento de transferência (cláusulas-padrão ou equivalente, conforme a regulamentação da ANPD).

| Provedor | Papel | Dados que recebe |
| --- | --- | --- |
| Vercel | Hospedagem, analytics de desempenho | Tráfego, IP, país, métricas |
| Neon (AWS us-east-1) | Banco de dados | Todos os dados da plataforma |
| Upstash | Limite de requisições | IP e id do usuário (efêmero) |
| Stripe | Pagamentos de anúncios | Dados de cobrança e cartão |
| Twilio | Verificação por SMS | Número de telefone |
| Brevo | E-mails transacionais (magic link, confirmações) | E-mail, nome |
| Cloudinary | Imagens enviadas | Fotos e capas |
| Mapbox | Mapas e busca de local | Local pesquisado; IP do visitante ao carregar o mapa |
| Ably | Mensagens em tempo real | **Conteúdo das mensagens** e identificadores de conversa |
| Sentry | Monitoramento de erros | Erros técnicos (envio de dados pessoais desativado) |
| Google (Gemini) e Anthropic (Claude) | Assistente de IA | Pergunta do usuário e resultados públicos da comunidade usados para responder |
| Google (login) | Login com Google | Nome, e-mail e foto do perfil Google |

Decisão para o jurídico: o texto deve dizer que a pergunta digitada no assistente é enviada a provedores de IA e que **não se deve inserir dados sensíveis** na pergunta?

## 4. Lacunas da política atual (a corrigir)
1. Identificação do **controlador** (razão social, CNPJ, endereço) e do **encarregado** (nome e e-mail de contato, art. 41).
2. **Finalidades e bases legais** por categoria (tabela da seção 2).
3. **Lista de operadores** e **transferência internacional** (seção 3).
4. **Prazos de retenção.** Hoje **não há rotina automática de exclusão**: eventos de analytics, linhas de mensagens apagadas (mantidas para moderação) e registros financeiros ficam indefinidamente. É necessário definir prazos (ver seção 6).
5. **Direitos do titular** (art. 18) com os canais reais: exportação e exclusão in-app, mais e-mail para os demais pedidos (correção, oposição, revogação de consentimento, informação sobre compartilhamento).
6. **Armazenamento no dispositivo** (cookie de sessão e localStorage de UTM) e aviso/consentimento adequado.
7. **Crianças e adolescentes** (art. 14): **o cadastro não valida idade mínima** (existe apenas o campo "idade" opcional). Definir idade mínima nos Termos e se haverá verificação.
8. **Segurança:** descrição genérica das medidas e **procedimento de incidente** (comunicação à ANPD e aos titulares; confirmar prazo vigente).
9. **Conteúdo gerado por usuários e moderação:** regras, denúncia, remoção, e o que acontece com o conteúdo na exclusão da conta.
10. **Assistente de IA:** aviso de que as respostas são geradas automaticamente, podem conter erros, e de que a pergunta é processada por terceiros.
11. **Anúncios e personalização:** existe o campo "personalização de anúncios" no perfil; descrever o que ele controla.
12. Histórico de versões e data de vigência.

## 5. Minuta de trechos novos (para o jurídico reescrever)
> **Controlador.** [RAZÃO SOCIAL], CNPJ [CNPJ], com sede em [ENDEREÇO], é a controladora dos dados pessoais tratados nesta plataforma. Encarregado de dados: [NOME], [E-MAIL].

> **Seus direitos.** Você pode, a qualquer momento: (i) baixar uma cópia dos seus dados em **Menu da conta → Privacidade → Baixar meus dados**; (ii) excluir sua conta em **Menu da conta → Privacidade → Excluir minha conta**; (iii) solicitar correção, informação sobre compartilhamento, oposição ao tratamento ou revogação de consentimento pelo e-mail [E-MAIL DO ENCARREGADO]. Responderemos em até [PRAZO].

> **O que acontece quando você exclui a conta.** Seu perfil, publicações, comentários, mensagens e demais conteúdos são removidos. Registros de pagamento e de veiculação de anúncios são mantidos **sem identificação pessoal** para cumprir obrigações legais e fiscais por [PRAZO].

> **Compartilhamento e transferência internacional.** Usamos prestadores de serviço para hospedagem, banco de dados, pagamentos, SMS, e-mail, imagens, mapas, mensagens em tempo real, monitoramento e inteligência artificial. Alguns estão fora do Brasil, em [PAÍSES]. Adotamos [INSTRUMENTO DE TRANSFERÊNCIA]. A lista atual está em [LINK].

> **Assistente de inteligência artificial.** As perguntas que você digita no assistente e resultados públicos da comunidade são enviados a provedores de IA para gerar a resposta. As respostas podem conter erros. Não informe dados sensíveis ou de terceiros.

> **Origem de acesso e medição.** Registramos a origem da sua chegada (parâmetros de campanha, como `utm_source`) por até 30 dias no seu navegador e a associamos a interações na plataforma para medir o resultado de divulgações e anúncios.

> **Idade mínima.** O uso da plataforma é permitido a pessoas com [IDADE] anos ou mais.

## 6. Decisões que dependem do jurídico e da empresa
| Pergunta | Impacto no produto |
| --- | --- |
| Prazo de retenção de eventos de analytics (ex.: 12 ou 24 meses)? | Criar rotina agendada de exclusão |
| Prazo de retenção de mensagens apagadas e de registros financeiros? | Rotina de anonimização/exclusão |
| Analytics com UTM exige consentimento explícito (banner)? | Implementar banner e só gravar após aceite |
| Idade mínima e como verificar? | Campo obrigatório de data de nascimento no cadastro |
| Preciso de RIPD (relatório de impacto)? | Documento adicional |
| Contratos/DPAs com cada operador da seção 3? | Coletar e arquivar |
| Prazo e canal de resposta a pedidos de titulares | Texto da política e caixa de e-mail |

## 7. O que o desenvolvimento pode entregar depois da decisão
- Rotinas de retenção/anonimização automáticas.
- Banner de consentimento e registro do aceite.
- Verificação de idade mínima no cadastro.
- Publicação da nova política (página `/politica-de-privacidade`) e dos Termos revisados, com aviso aos usuários existentes e novo aceite, se o jurídico exigir.
