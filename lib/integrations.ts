/**
 * Catálogo de integrações externas do Gringoou.
 *
 * Para plugar uma nova integração/API: adicione um item em INTEGRATIONS com as variáveis de ambiente
 * que ela exige. O painel Admin › Integrações passa a mostrar se ela está configurada (sem expor valores).
 */
export type IntegrationCategory = 'Autenticação' | 'Mensagens e e-mail' | 'Mídia' | 'Pagamentos' | 'Inteligência artificial' | 'Conteúdo' | 'Infraestrutura';

export type IntegrationDefinition = {
  id: string;
  name: string;
  category: IntegrationCategory;
  /** Para que serve no produto. */
  description: string;
  /** Variáveis obrigatórias: a integração só é "Configurada" quando todas existem. */
  requiredEnv: string[];
  /** Variáveis opcionais (ajustes finos). */
  optionalEnv?: string[];
  docsUrl?: string;
};

export const INTEGRATIONS: IntegrationDefinition[] = [
  {
    id: 'google-oauth',
    name: 'Login com Google',
    category: 'Autenticação',
    description: 'Permite entrar na plataforma com a conta Google.',
    requiredEnv: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
    docsUrl: 'https://console.cloud.google.com/apis/credentials',
  },
  {
    id: 'email-smtp',
    name: 'E-mail (SMTP)',
    category: 'Mensagens e e-mail',
    description: 'Envia links de acesso, confirmações e comunicados por e-mail.',
    requiredEnv: ['EMAIL_SERVER_HOST', 'EMAIL_SERVER_PORT', 'EMAIL_SERVER_USER', 'EMAIL_SERVER_PASSWORD', 'EMAIL_FROM'],
  },
  {
    id: 'twilio',
    name: 'Twilio (SMS)',
    category: 'Mensagens e e-mail',
    description: 'Verifica o telefone dos membros por SMS.',
    requiredEnv: ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_FROM_NUMBER'],
    optionalEnv: ['PHONE_VERIFICATION_ENABLED', 'PHONE_ALLOWED_COUNTRIES'],
    docsUrl: 'https://console.twilio.com',
  },
  {
    id: 'ably',
    name: 'Ably (tempo real)',
    category: 'Mensagens e e-mail',
    description: 'Entrega mensagens do chat e avisos em tempo real.',
    requiredEnv: ['ABLY_API_KEY'],
    docsUrl: 'https://ably.com/accounts',
  },
  {
    id: 'cloudinary',
    name: 'Cloudinary (imagens)',
    category: 'Mídia',
    description: 'Armazena e otimiza fotos de perfis, negócios, eventos e anúncios.',
    requiredEnv: ['NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME', 'NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET'],
    docsUrl: 'https://console.cloudinary.com',
  },
  {
    id: 'stripe',
    name: 'Stripe (pagamentos)',
    category: 'Pagamentos',
    description: 'Cobra as campanhas de anúncios e, futuramente, repasses a parceiros.',
    requiredEnv: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'],
    optionalEnv: ['NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'],
    docsUrl: 'https://dashboard.stripe.com',
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    category: 'Inteligência artificial',
    description: 'Assistente da comunidade e busca inteligente.',
    requiredEnv: ['GEMINI_API_KEY'],
    optionalEnv: ['GEMINI_MODEL', 'GEMINI_FALLBACK_MODELS'],
    docsUrl: 'https://aistudio.google.com',
  },
  {
    id: 'anthropic',
    name: 'Claude (Anthropic)',
    category: 'Inteligência artificial',
    description: 'Provedor alternativo de IA para o assistente.',
    requiredEnv: ['ANTHROPIC_API_KEY'],
    optionalEnv: ['CLAUDE_MODEL', 'AI_PROVIDER'],
    docsUrl: 'https://console.anthropic.com',
  },
  {
    id: 'news-api',
    name: 'Fontes de notícias',
    category: 'Conteúdo',
    description: 'Importa notícias de agências externas para o feed.',
    requiredEnv: ['NEWS_API_KEY'],
    optionalEnv: ['NEWSDATA_API_KEY'],
  },
  {
    id: 'upstash',
    name: 'Upstash Redis',
    category: 'Infraestrutura',
    description: 'Limita abusos (rate limit) de forma compartilhada entre servidores.',
    requiredEnv: ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'],
  },
];

export type IntegrationStatus = 'configured' | 'partial' | 'missing';

export type IntegrationState = IntegrationDefinition & {
  status: IntegrationStatus;
  missingEnv: string[];
};

/** Calcula o estado de cada integração a partir do ambiente do servidor (nunca devolve valores). */
export function getIntegrationStates(env: Record<string, string | undefined> = process.env): IntegrationState[] {
  return INTEGRATIONS.map((integration) => {
    const missingEnv = integration.requiredEnv.filter((name) => !env[name]?.trim());
    const status: IntegrationStatus =
      missingEnv.length === 0 ? 'configured' : missingEnv.length === integration.requiredEnv.length ? 'missing' : 'partial';
    return { ...integration, status, missingEnv };
  });
}
