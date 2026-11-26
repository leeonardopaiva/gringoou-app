import { LEGAL_CONTACTS, LEGAL_ENTITY, LEGAL_ROLES, LEGAL_UPDATED_AT } from '@/lib/legal/company';

export type LegalSection = { id: string; title: string; paragraphs: string[] };

export type LegalDocument = {
  title: string;
  updatedAt: string;
  /** Texto que vale para todos. */
  sections: LegalSection[];
  /** Adendos por região: complementam o texto geral para quem está naquela jurisdição. */
  regional: LegalSection[];
};

const { name: COMPANY, address: ADDRESS, registryId: REGISTRY } = LEGAL_ENTITY;
const { privacy: PRIVACY_EMAIL, legal: LEGAL_EMAIL, abuse: ABUSE_EMAIL } = LEGAL_CONTACTS;

// Parágrafos opcionais: só aparecem quando o cargo/documento existe.
const euRepresentativeParagraph = LEGAL_ROLES.euRepresentative
  ? [
      `Nosso representante na União Europeia (art. 27 do GDPR) é ${LEGAL_ROLES.euRepresentative.name}, ${LEGAL_ROLES.euRepresentative.address}, e-mail ${LEGAL_ROLES.euRepresentative.email}.`,
    ]
  : [];

const dpoParagraph = LEGAL_ROLES.dpo
  ? [`Nosso encarregado pelo tratamento de dados (DPO) é ${LEGAL_ROLES.dpo.name}, e-mail ${LEGAL_ROLES.dpo.email}.`]
  : [];

const dmcaParagraph = LEGAL_ROLES.dmcaAgent
  ? [`Agente designado para avisos de direitos autorais (DMCA): ${LEGAL_ROLES.dmcaAgent.name}, e-mail ${LEGAL_ROLES.dmcaAgent.email}.`]
  : [];

export function getTermsDocument(): LegalDocument {
  return {
    title: 'Termos de Uso',
    updatedAt: LEGAL_UPDATED_AT,
    sections: [
      {
        id: 'who',
        title: '1. Quem somos e aceitação',
        paragraphs: [
          `O Gringoou é uma plataforma de comunidade para brasileiros que vivem fora do Brasil, operada pela ${COMPANY}, ${ADDRESS} (registro ${REGISTRY}).`,
          'Ao criar uma conta ou usar o Gringoou, você declara que leu e concorda com estes Termos e com a Política de Privacidade.',
        ],
      },
      {
        id: 'eligibility',
        title: '2. Quem pode usar e sua conta',
        paragraphs: [
          'O Gringoou é destinado a pessoas com 18 anos ou mais. Não permitimos contas de menores de idade.',
          'Você deve fornecer informações verdadeiras, manter suas credenciais em segurança e responder pelo que acontece na sua conta. Cada pessoa pode ter uma conta, e cada telefone confirmado pode estar ligado a uma única conta.',
          'Para proteger a comunidade, confirmamos o seu telefone por SMS antes de liberar o uso da plataforma.',
        ],
      },
      {
        id: 'regions',
        title: '3. Regiões e disponibilidade',
        paragraphs: [
          'O Gringoou é liberado aos poucos, por país e por região. Você vê o conteúdo da região em que escolheu estar, e só pode escolher regiões do país em que vive, a menos que sua localização de acesso mostre que você está em outro país.',
          'Podemos limitar ou bloquear o acesso por país ou região, por motivos legais, de segurança ou de operação. Não é permitido usar meios para burlar essa localização.',
        ],
      },
      {
        id: 'content',
        title: '4. Conteúdo e conduta',
        paragraphs: [
          'Você é responsável pelo que publica. Não publique conteúdo ilegal, enganoso, discriminatório, que incentive violência, que viole direitos de terceiros ou que exponha dados pessoais de outras pessoas sem autorização.',
          'Você mantém os direitos sobre o seu conteúdo e nos dá uma licença não exclusiva, gratuita e mundial para exibi-lo, armazená-lo e distribuí-lo dentro do Gringoou, apenas para operar e divulgar a plataforma. A licença termina quando você remove o conteúdo ou a conta, salvo o que já tiver sido compartilhado por outras pessoas ou o que precisarmos manter por obrigação legal.',
          'Podemos revisar, limitar ou remover conteúdos e contas que violem estes Termos, e informaremos o motivo sempre que a lei exigir ou quando for possível.',
        ],
      },
      {
        id: 'marketplace',
        title: '5. Negócios, vagas, moradia e marketplace',
        paragraphs: [
          'O Gringoou aproxima membros da comunidade, mas não é parte dos contratos entre usuários, anunciantes, empregadores, proprietários, vendedores e compradores, e não garante a veracidade dos anúncios nem o resultado de negociações.',
          'Empresas e recrutadores devem ter autorização para divulgar as oportunidades. Desconfie de pedidos de pagamento antecipado e verifique as informações antes de fechar qualquer negócio.',
        ],
      },
      {
        id: 'ads',
        title: '6. Anúncios e pagamentos',
        paragraphs: [
          'Os anúncios pagos são revisados antes de serem publicados e podem ser recusados. Os pagamentos são processados pela Stripe; não armazenamos os dados completos do seu cartão.',
          'Valores, reembolsos e cancelamentos seguem as condições mostradas no momento da compra e os direitos que a lei do seu país garante a consumidores. Os preços podem não incluir impostos locais, quando aplicáveis.',
        ],
      },
      {
        id: 'reports',
        title: '7. Denúncias e moderação',
        paragraphs: [
          `Para denunciar conteúdo ilegal ou que viole estes Termos, use o botão de denúncia disponível nos conteúdos ou escreva para ${ABUSE_EMAIL}, indicando onde o conteúdo está, o motivo da denúncia e seu contato. Analisamos os avisos e tomamos as providências cabíveis.`,
          `Se um conteúdo seu for removido ou sua conta for limitada, você pode pedir a revisão da decisão pelo e-mail ${LEGAL_EMAIL}.`,
        ],
      },
      {
        id: 'ip',
        title: '8. Propriedade intelectual e direitos autorais',
        paragraphs: [
          'A marca, o código e o design do Gringoou pertencem à Gringoou LLC. Você não pode copiar, revender ou explorar a plataforma além do uso normal permitido.',
          `Se você acredita que um conteúdo viola direitos autorais seus, envie um aviso para ${ABUSE_EMAIL} com a identificação da obra, a localização do conteúdo e seus dados de contato.`,
          ...dmcaParagraph,
        ],
      },
      {
        id: 'termination',
        title: '9. Suspensão e encerramento',
        paragraphs: [
          'Você pode encerrar sua conta quando quiser, no menu da conta, em Privacidade. Podemos suspender ou encerrar contas que violem estes Termos, coloquem pessoas em risco ou usem a plataforma para fraude ou abuso.',
        ],
      },
      {
        id: 'liability',
        title: '10. Limitação de responsabilidade',
        paragraphs: [
          'O Gringoou é oferecido como está e pode ter interrupções. Na medida permitida pela lei, a Gringoou LLC não responde por danos indiretos, lucros cessantes ou por atos de usuários e terceiros.',
          'Nada nestes Termos exclui ou limita direitos que a lei do seu país garante a consumidores e que não podem ser afastados por contrato.',
        ],
      },
      {
        id: 'law',
        title: '11. Lei aplicável e foro',
        paragraphs: [
          'Estes Termos são regidos pelas leis do Estado de Connecticut, Estados Unidos. Disputas serão levadas aos tribunais competentes de Connecticut.',
          'Se você é consumidor e vive em outro país, isso não retira os direitos imperativos da lei do seu país nem o direito de propor ação no foro que essa lei garantir a você.',
        ],
      },
      {
        id: 'changes',
        title: '12. Alterações',
        paragraphs: [
          'Podemos atualizar estes Termos para refletir mudanças legais ou do produto. Quando a mudança for relevante, avisaremos com antecedência razoável (em regra, 30 dias) por e-mail ou na plataforma. O uso depois da atualização representa a aceitação da nova versão.',
        ],
      },
      {
        id: 'contact',
        title: '13. Contato',
        paragraphs: [`Dúvidas sobre estes Termos: ${LEGAL_EMAIL}. Correspondência: ${COMPANY}, ${ADDRESS}.`],
      },
    ],
    regional: [
      {
        id: 'eu',
        title: 'União Europeia e Portugal',
        paragraphs: [
          'Os direitos que a lei de proteção ao consumidor da União Europeia e de Portugal garante a você continuam valendo, inclusive o direito de recorrer aos tribunais do país onde você vive e aos meios de resolução de litígios de consumo.',
          'Para usuários empresariais (negócios e anunciantes), avisamos com antecedência sobre mudanças nas condições de uso e descrevemos nestes Termos como o conteúdo é moderado e ordenado.',
        ],
      },
      {
        id: 'ca',
        title: 'Canadá',
        paragraphs: [
          'Se você vive no Canadá, os direitos de proteção ao consumidor da sua província continuam valendo. Estes Termos estão disponíveis em português; a versão em inglês (e em francês, quando o serviço for oferecido no Quebec) será disponibilizada antes da abertura da região.',
        ],
      },
      {
        id: 'br',
        title: 'Brasil',
        paragraphs: [
          'Se você vive no Brasil, o Código de Defesa do Consumidor e a legislação brasileira se aplicam no que for imperativo, inclusive quanto ao foro do consumidor.',
        ],
      },
      {
        id: 'us',
        title: 'Estados Unidos',
        paragraphs: [
          'Nos Estados Unidos, estes Termos são regidos pelas leis de Connecticut. Direitos que as leis do seu estado garantam e que não possam ser afastados por contrato continuam valendo.',
        ],
      },
    ],
  };
}

export function getPrivacyDocument(): LegalDocument {
  return {
    title: 'Política de Privacidade',
    updatedAt: LEGAL_UPDATED_AT,
    sections: [
      {
        id: 'controller',
        title: '1. Quem é o responsável pelos seus dados',
        paragraphs: [
          `O responsável pelo tratamento dos seus dados pessoais é a ${COMPANY}, ${ADDRESS} (registro ${REGISTRY}).`,
          `Contato para assuntos de privacidade e pedidos sobre seus dados: ${PRIVACY_EMAIL}.`,
          ...euRepresentativeParagraph,
          ...dpoParagraph,
        ],
      },
      {
        id: 'data',
        title: '2. Dados que coletamos',
        paragraphs: [
          'Conta e perfil: nome, nome público, e-mail, senha (guardada de forma cifrada) e as informações que você escolhe informar, como idade, gênero, tempo no exterior, cidade natal, foto, biografia e interesses.',
          'Telefone e localização: o telefone confirmado por SMS e o país dele; a região que você escolhe; e o país do seu acesso, identificado pelo endereço IP, usado para liberar regiões e para segurança.',
          'Conteúdo e interações: publicações, comentários, mensagens, anúncios, negócios, eventos, vagas e moradias que você cria, além de curtidas, favoritos e denúncias.',
          'Uso e dispositivo: registros técnicos (como IP, tipo de navegador e páginas acessadas), necessários para segurança, prevenção de abuso e funcionamento do serviço.',
          'Pagamentos: se você compra anúncios, a Stripe processa os dados de pagamento. Recebemos apenas a confirmação e dados básicos da transação.',
          'Não pedimos dados sensíveis, como origem racial ou étnica, religião ou saúde. Evite incluí-los em campos livres do seu perfil ou das suas publicações.',
        ],
      },
      {
        id: 'purposes',
        title: '3. Para que usamos e em que base legal',
        paragraphs: [
          'Prestar o serviço (execução do contrato): criar e manter sua conta, mostrar o conteúdo da sua região, permitir publicações, mensagens e anúncios.',
          'Segurança e prevenção de abuso (interesse legítimo): confirmar o telefone, limitar abusos, detectar fraude, moderar conteúdo e proteger a comunidade.',
          'Cumprir obrigações legais: responder a autoridades e manter registros quando a lei exigir.',
          'Comunicações do serviço (execução do contrato): avisos sobre sua conta, segurança e mudanças nestes textos.',
          'Consentimento: só quando pedirmos, por exemplo para cookies ou comunicações não essenciais. Você pode retirar o consentimento a qualquer momento.',
        ],
      },
      {
        id: 'phone',
        title: '4. Verificação de telefone e localização',
        paragraphs: [
          'Enviamos um código por SMS, por meio da Twilio, para confirmar que o telefone é seu. Usamos o telefone e o país dele para controle de segurança e para liberar a região correta. Não usamos o telefone para marketing.',
        ],
      },
      {
        id: 'sharing',
        title: '5. Com quem compartilhamos',
        paragraphs: [
          'Não vendemos dados pessoais. Compartilhamos dados com fornecedores que nos prestam serviços e só para a finalidade do serviço: hospedagem (Vercel), banco de dados (Neon), SMS (Twilio), pagamentos (Stripe), imagens (Cloudinary), mensagens em tempo real (Ably), mapas (Mapbox), controle de abuso (Upstash), login (Google) e envio de e-mails.',
          'Os recursos de inteligência artificial (assistente e busca) enviam o texto que você digita a provedores de IA (Google e Anthropic) para gerar a resposta. Não envie dados confidenciais ao assistente.',
          'Também podemos compartilhar dados quando a lei exigir, para cumprir ordem de autoridade ou para proteger direitos e a segurança de pessoas.',
        ],
      },
      {
        id: 'transfers',
        title: '6. Transferências internacionais',
        paragraphs: [
          'Nossa empresa e vários fornecedores estão nos Estados Unidos, e seus dados podem ser tratados fora do país onde você vive. Quando a lei exige, usamos salvaguardas reconhecidas, como cláusulas contratuais-padrão ou mecanismos de adequação.',
        ],
      },
      {
        id: 'retention',
        title: '7. Por quanto tempo guardamos',
        paragraphs: [
          'Guardamos os dados enquanto sua conta estiver ativa. Quando você exclui a conta, removemos ou anonimizamos seus dados pessoais, exceto o que precisarmos manter por obrigação legal, segurança, prevenção de fraude ou defesa de direitos, pelo tempo necessário.',
        ],
      },
      {
        id: 'rights',
        title: '8. Seus direitos',
        paragraphs: [
          'Você pode pedir acesso, correção, exclusão, portabilidade, restrição e oposição ao tratamento dos seus dados, e retirar consentimentos dados.',
          `No menu da sua conta, em Privacidade, você pode exportar seus dados e excluir sua conta. Para outros pedidos, escreva para ${PRIVACY_EMAIL}. Respondemos em até 30 dias, ou no prazo que a lei do seu país determinar.`,
          'Você também pode reclamar à autoridade de proteção de dados do seu país.',
        ],
      },
      {
        id: 'cookies',
        title: '9. Cookies e armazenamento no aparelho',
        paragraphs: [
          'Usamos apenas cookies e armazenamento essenciais: manter você conectado, proteger o acesso e guardar preferências do aparelho, como tema e idioma. Medimos o uso com eventos próprios, sem enviar dados a redes de publicidade.',
          'Se passarmos a usar cookies não essenciais (como análise de terceiros ou publicidade), pediremos o seu consentimento antes.',
        ],
      },
      {
        id: 'security',
        title: '10. Segurança e incidentes',
        paragraphs: [
          'Usamos controles técnicos e organizacionais para reduzir riscos de acesso indevido, como conexão cifrada, senhas protegidas e controle de acesso. Se houver um incidente que ofereça risco aos seus dados, avisaremos você e as autoridades nos prazos que a lei exigir.',
        ],
      },
      {
        id: 'children',
        title: '11. Menores de idade',
        paragraphs: ['O Gringoou é destinado a maiores de 18 anos. Se identificarmos uma conta de menor, vamos encerrá-la e excluir os dados.'],
      },
      {
        id: 'changes',
        title: '12. Alterações e contato',
        paragraphs: [
          `Quando mudarmos esta Política de forma relevante, avisaremos por e-mail ou na plataforma. Dúvidas: ${PRIVACY_EMAIL}.`,
        ],
      },
    ],
    regional: [
      {
        id: 'eu',
        title: 'União Europeia e Portugal (GDPR)',
        paragraphs: [
          'Para quem está na União Europeia, tratamos os dados conforme o Regulamento Geral sobre a Proteção de Dados (GDPR) e a lei portuguesa de execução (Lei n.º 58/2019). As bases legais são as descritas na seção 3.',
          'Além dos direitos da seção 8, você tem o direito de apresentar queixa à autoridade de controlo: em Portugal, a Comissão Nacional de Proteção de Dados (CNPD, www.cnpd.pt); em outro país da UE, a autoridade do país onde você vive ou trabalha.',
          'Seus dados são transferidos para os Estados Unidos com as salvaguardas descritas na seção 6.',
          ...euRepresentativeParagraph,
        ],
      },
      {
        id: 'ca',
        title: 'Canadá (PIPEDA e leis provinciais)',
        paragraphs: [
          'Para quem está no Canadá, tratamos os dados conforme a PIPEDA e as leis provinciais aplicáveis, com consentimento claro, coleta limitada ao necessário e acesso aos seus dados mediante pedido.',
          'Seus dados são tratados fora do Canadá, nos Estados Unidos e em outros países onde nossos fornecedores operam, e podem estar sujeitos às leis e ao acesso de autoridades desses países.',
          `Responsável pelo cumprimento da privacidade: ${PRIVACY_EMAIL}. Você pode reclamar ao Office of the Privacy Commissioner of Canada ou à autoridade da sua província.`,
        ],
      },
      {
        id: 'br',
        title: 'Brasil (LGPD)',
        paragraphs: [
          'Para titulares de dados no Brasil, aplicamos a Lei Geral de Proteção de Dados (Lei n.º 13.709/2018). Você tem os direitos do art. 18 da LGPD, inclusive confirmação do tratamento, acesso, correção, anonimização, portabilidade e eliminação.',
          'Você pode reclamar à Autoridade Nacional de Proteção de Dados (ANPD).',
          ...dpoParagraph,
        ],
      },
      {
        id: 'us',
        title: 'Estados Unidos',
        paragraphs: [
          'Nos Estados Unidos, respeitamos os direitos de privacidade das leis estaduais aplicáveis. Não vendemos dados pessoais nem os compartilhamos para publicidade comportamental entre contextos.',
          `Você pode enviar pedidos para ${PRIVACY_EMAIL}. Responderemos no prazo da lei do seu estado.`,
        ],
      },
    ],
  };
}
