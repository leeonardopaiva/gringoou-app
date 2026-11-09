/**
 * Seed de dados FICTÍCIOS para desenvolvimento local.
 *
 * Trava de segurança: só executa se DATABASE_URL apontar para localhost/127.0.0.1.
 * É idempotente: se já existir usuário, não faz nada (use `npm run db:local:reset` para recriar).
 */
import { randomBytes, scrypt as nodeScrypt } from 'node:crypto';
import { promisify } from 'node:util';
import { PrismaClient } from '@prisma/client';

const scrypt = promisify(nodeScrypt);

const url = process.env.DATABASE_URL ?? '';
let host = '';
try {
  host = new URL(url).hostname;
} catch {
  /* url inválida */
}
if (host !== 'localhost' && host !== '127.0.0.1') {
  console.error(`[seed] RECUSADO: DATABASE_URL aponta para "${host || 'desconhecido'}", não para localhost.`);
  console.error('[seed] Este seed só roda em banco local. Use "npm run db:local".');
  process.exit(1);
}

const prisma = new PrismaClient();

const hashPassword = async (password) => {
  const salt = randomBytes(16).toString('hex');
  const key = await scrypt(password, salt, 64);
  return `${salt}:${key.toString('hex')}`;
};

const img = (seed, w = 600, h = 450) => `https://picsum.photos/seed/${seed}/${w}/${h}`;
const daysFromNow = (d) => new Date(Date.now() + d * 86_400_000);
const hoursAgo = (h) => new Date(Date.now() - h * 3_600_000);

async function main() {
  if ((await prisma.user.count()) > 0) {
    console.log('[seed] Banco já possui dados. Nada a fazer (use db:local:reset para recriar).');
    return;
  }

  // ---------- Regiões ----------
  const regions = [
    { key: 'orlando-fl', label: 'Orlando, FL', city: 'Orlando', state: 'FL', lat: 28.5383, lng: -81.3792 },
    { key: 'miami-fl', label: 'Miami, FL', city: 'Miami', state: 'FL', lat: 25.7617, lng: -80.1918 },
    { key: 'boston-ma', label: 'Boston, MA', city: 'Boston', state: 'MA', lat: 42.3601, lng: -71.0589 },
    { key: 'newark-nj', label: 'Newark, NJ', city: 'Newark', state: 'NJ', lat: 40.7357, lng: -74.1724 },
  ];
  await prisma.region.createMany({
    data: regions.map((r) => ({ ...r, countryCode: 'US', aliases: [r.city.toLowerCase()] })),
  });

  // ---------- Usuários (senha: senha123) ----------
  const passwordHash = await hashPassword('senha123');
  const base = {
    passwordHash,
    emailVerified: new Date(),
    phoneVerifiedAt: new Date(),
    phoneCountry: 'US',
    accessCountry: 'US',
    onboardingCompleted: true,
    regionKey: 'orlando-fl',
    locationLabel: 'Orlando, FL',
    preferredLanguage: 'pt-BR',
  };
  const mk = (name, username, role, extra = {}) =>
    prisma.user.create({
      data: {
        ...base,
        name,
        username,
        email: `${username}@gringoou.local`,
        phone: `+1407555${String(1000 + Math.floor(Math.random() * 8999))}`,
        image: `https://i.pravatar.cc/150?u=${username}`,
        bio: 'Usuário fictício para desenvolvimento local.',
        role,
        ...extra,
      },
    });

  const admin = await mk('Admin Gringoou', 'admin', 'ADMIN');
  const moderator = await mk('Marina Moderadora', 'moderadora', 'MODERATOR');
  const ana = await mk('Ana Souza', 'ana', 'USER');
  const bruno = await mk('Bruno Lima', 'bruno', 'USER', { regionKey: 'miami-fl', locationLabel: 'Miami, FL' });
  const carla = await mk('Carla Mendes', 'carla', 'BUSINESS_OWNER');
  const diego = await mk('Diego Alves', 'diego', 'USER', { regionKey: 'boston-ma', locationLabel: 'Boston, MA' });
  const sellers = [ana, bruno, carla, diego];

  // ---------- Marketplace (todos os status, para testar moderação) ----------
  const titles = [
    ['iPhone 13 128GB', 'Eletrônicos', 45000, 'LIKE_NEW'],
    ['Sofá cinza 3 lugares', 'Móveis', 30000, 'GOOD'],
    ['Geladeira Frost Free', 'Eletrodomésticos', 40000, 'GOOD'],
    ['Bicicleta aro 29', 'Esportes', 22000, 'FAIR'],
    ['Coleção de livros em português', 'Livros', 6000, 'GOOD'],
    ['Furadeira Bosch', 'Ferramentas', 8000, 'LIKE_NEW'],
    ['Carrinho de bebê', 'Brinquedos', 15000, 'GOOD'],
    ['Mesa de jantar 6 cadeiras', 'Móveis', 35000, 'GOOD'],
    ['Notebook Dell i5', 'Eletrônicos', 38000, 'FAIR'],
    ['Jaqueta de inverno', 'Roupas', 5000, 'LIKE_NEW'],
    ['Honda Civic 2015', 'Automóveis', 950000, 'GOOD'],
    ['Cadeira gamer', 'Móveis', 12000, 'NEW'],
    ['Micro-ondas 20L', 'Eletrodomésticos', 4000, 'GOOD'],
    ['Violão Giannini', 'Outros', 9000, 'GOOD'],
    ['Kit panelas antiaderentes', 'Eletrodomésticos', 0, 'NEW'],
    ['Tênis de corrida tam. 42', 'Esportes', 7000, 'LIKE_NEW'],
  ];
  const statusPlan = [
    'ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE',
    'ACTIVE', 'ACTIVE', 'PENDING_REVIEW', 'PENDING_REVIEW', 'PENDING_REVIEW', 'REJECTED', 'SOLD', 'UNAVAILABLE',
  ];
  const items = [];
  for (let i = 0; i < titles.length; i++) {
    const [title, category, priceCents, condition] = titles[i];
    const owner = sellers[i % sellers.length];
    const region = regions[i % regions.length];
    const status = statusPlan[i];
    const item = await prisma.marketplaceItem.create({
      data: {
        title,
        description: `${title} em ótimo estado. Retirada combinada pelo chat. Anúncio fictício de desenvolvimento.`,
        category,
        priceCents: priceCents === 0 ? null : priceCents,
        isFree: priceCents === 0,
        condition,
        locationLabel: `${region.city}, ${region.state}`,
        regionKey: region.key,
        imageUrl: img(`market-${i}`),
        galleryUrls: [img(`market-${i}-b`), img(`market-${i}-c`)],
        status,
        createdById: owner.id,
        // Determinístico: 3 de cada 4 anúncios têm coordenadas; 1 em cada 4 fica SEM (testa o caso sem mapa).
        latitude: i % 4 === 3 ? null : Number((region.lat + ((i % 5) - 2) * 0.004).toFixed(4)),
        longitude: i % 4 === 3 ? null : Number((region.lng + ((i % 5) - 2) * 0.004).toFixed(4)),
        createdAt: hoursAgo(i * 7 + 1),
        ...(status === 'REJECTED'
          ? { moderationReason: 'Fotos não mostram o item real.', moderatedById: moderator.id, moderatedAt: hoursAgo(3) }
          : {}),
      },
    });
    if (status === 'REJECTED') {
      await prisma.marketplaceModerationLog.create({
        data: { itemId: item.id, moderatorId: moderator.id, decision: 'REJECT', reason: 'Fotos não mostram o item real.' },
      });
    }
    items.push(item);
  }

  // ---------- Conversas de Marketplace ----------
  const target = items.find((i) => i.status === 'ACTIVE' && i.createdById === ana.id) ?? items[0];
  const conversation = await prisma.marketplaceConversation.create({
    data: { itemId: target.id, buyerId: bruno.id, sellerId: target.createdById, lastMessageAt: hoursAgo(1) },
  });
  const chat = [
    [bruno.id, 'Oi! Ainda está disponível?', 5],
    [target.createdById, 'Olá! Sim, está disponível.', 4],
    [bruno.id, 'Aceita US$ 20 a menos? Retiro hoje.', 3],
    [target.createdById, 'Consigo fazer um desconto menor. Pode ser?', 1],
  ];
  for (const [senderId, content, h] of chat) {
    await prisma.marketplaceMessage.create({
      data: { conversationId: conversation.id, senderId, content, createdAt: hoursAgo(h) },
    });
  }

  // ---------- Posts da comunidade ----------
  const posts = [
    'Alguém sabe um bom lugar para comprar pão de queijo em Orlando?',
    'Churrasco no domingo no parque! Quem vai?',
    'Dica: o DMV agende com antecedência, as filas estão enormes.',
    'Procuro dentista que fale português na região.',
    'Feira brasileira neste sábado com comidas típicas e música ao vivo.',
    'Vendi meu carro pela comunidade, super recomendo anunciar aqui!',
    'Alguém para dividir aluguel perto do centro?',
    'Recomendação de contador brasileiro para declarar imposto?',
  ];
  for (let i = 0; i < posts.length; i++) {
    const author = [ana, bruno, carla, diego][i % 4];
    await prisma.communityPost.create({
      data: {
        content: posts[i],
        authorId: author.id,
        regionKey: author.regionKey ?? 'orlando-fl',
        locationLabel: author.locationLabel ?? 'Orlando, FL',
        createdAt: hoursAgo(i * 4 + 1),
      },
    });
  }

  // ---------- Negócios ----------
  const businesses = [
    ['Padaria Sabor do Brasil', 'padaria-sabor-do-brasil', 'Alimentação', '123 Colonial Dr'],
    ['Studio Bella Beleza', 'studio-bella-beleza', 'Beleza', '45 Orange Ave'],
    ['Contabilidade Mendes', 'contabilidade-mendes', 'Serviços', '900 Main St'],
    ['Mercado Tropical', 'mercado-tropical', 'Mercado', '77 Kirkman Rd'],
    ['Barbearia Carioca', 'barbearia-carioca', 'Beleza', '12 Park Ave'],
    ['Auto Mecânica do Zé', 'auto-mecanica-do-ze', 'Automotivo', '300 Vineland Rd'],
  ];
  for (const [name, slug, category, address] of businesses) {
    await prisma.business.create({
      data: {
        name, slug, category, address,
        locationLabel: 'Orlando, FL',
        regionKey: 'orlando-fl',
        status: 'PUBLISHED',
        createdById: carla.id,
        ratingAverage: 4 + Math.random(),
        ratingCount: 5 + Math.floor(Math.random() * 40),
      },
    });
  }

  // Conta de anúncios da Carla (para testar o painel do negócio sem passar pelo cadastro).
  const carlaBusiness = await prisma.business.findFirst({ where: { createdById: carla.id }, orderBy: { createdAt: 'asc' } });
  if (carlaBusiness) {
    await prisma.adAccount.create({
      data: {
        name: carlaBusiness.name,
        businessId: carlaBusiness.id,
        businessAddress: carlaBusiness.address,
        businessCategory: carlaBusiness.category,
        subcategories: [],
        country: 'US', currency: 'USD', timezone: 'America/New_York',
        users: { create: { userId: carla.id, role: 'BUSINESS_ADMIN' } },
      },
    });
  }

  // ---------- Eventos ----------
  const events = [
    ['Feira Brasileira de Orlando', 'Feira', 3],
    ['Noite de Samba', 'Música', 6],
    ['Encontro de Empreendedores', 'Networking', 9],
    ['Festa Junina', 'Festa', 14],
    ['Futebol de domingo', 'Esporte', 2],
    ['Workshop de Imigração', 'Educação', 20],
  ];
  for (const [title, category, days] of events) {
    await prisma.event.create({
      data: {
        title,
        slug: `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${days}`,
        description: `${title} organizado pela comunidade. Evento fictício de desenvolvimento.`,
        venueName: 'Centro Comunitário',
        category,
        startsAt: daysFromNow(days),
        locationLabel: 'Orlando, FL',
        regionKey: 'orlando-fl',
        status: 'PUBLISHED',
        createdById: carla.id,
      },
    });
  }

  // ---------- Vagas ----------
  const jobs = [
    ['Atendente de padaria', 'Padaria Sabor do Brasil', 'Tempo integral'],
    ['Auxiliar de limpeza', 'CleanPro Services', 'Meio período'],
    ['Cabeleireira', 'Studio Bella Beleza', 'Tempo integral'],
    ['Motorista de entregas', 'Mercado Tropical', 'Tempo integral'],
    ['Assistente administrativo', 'Contabilidade Mendes', 'Tempo integral'],
    ['Barista', 'Café Brasil', 'Meio período'],
    ['Pedreiro', 'Construtora Aliança', 'Contrato'],
    ['Cuidador(a) de idosos', 'Home Care Plus', 'Tempo integral'],
  ];
  for (const [title, company, employmentType] of jobs) {
    await prisma.job.create({
      data: {
        title, company, employmentType,
        description: `${title} na ${company}. Vaga fictícia para desenvolvimento local, com benefícios e horário flexível.`,
        locationLabel: 'Orlando, FL',
        regionKey: 'orlando-fl',
        createdById: carla.id,
      },
    });
  }

  // ---------- Moradia ----------
  const housing = [
    ['Quarto mobiliado perto do centro', 'Quarto', '$ 800/mês'],
    ['Apartamento 2 quartos', 'Apartamento', '$ 1.800/mês'],
    ['Casa 3 quartos com quintal', 'Casa', '$ 2.600/mês'],
    ['Studio recém-reformado', 'Studio', '$ 1.300/mês'],
    ['Vaga em quarto compartilhado', 'Quarto', '$ 500/mês'],
    ['Townhouse 3 quartos', 'Casa', '$ 2.900/mês'],
  ];
  for (const [index, [title, propertyType, price]] of housing.entries()) {
    await prisma.housing.create({
      data: {
        title, propertyType, price,
        description: `${title}. Anúncio fictício de desenvolvimento local.`,
        locationLabel: 'Orlando, FL',
        regionKey: 'orlando-fl',
        imageUrl: `https://picsum.photos/seed/gringoou-housing-${index + 1}/600/400`,
        createdById: ana.id,
      },
    });
  }

  // ---------- Notícias editoriais ----------
  const news = [
    ['Novas regras de visto para trabalhadores sazonais', 'Mudanças podem facilitar a entrada de brasileiros no próximo ano fiscal.', 'immigration', 'orlando-fl', 'Portal Imigrante', 1],
    ['Feira brasileira reúne milhares de pessoas', 'Evento reuniu comida, música e negócios da comunidade em Orlando.', 'community', 'orlando-fl', 'Gringoou Notícias', 5],
    ['Dólar fecha a semana em alta frente ao real', 'Entenda o impacto para quem envia dinheiro ao Brasil.', 'economy', null, 'Mercado & Câmbio', 9],
    ['Festival de cinema brasileiro chega a Boston', 'Programação inclui clássicos e estreias com debates.', 'culture', 'boston-ma', 'Cultura BR', 26],
    ['Guia: como renovar a carteira de motorista na Flórida', 'Passo a passo com documentos exigidos e prazos.', 'headlines', 'orlando-fl', 'Portal Imigrante', 50],
  ];
  for (const [title, subtitle, category, regionKey, source, hoursAgo] of news) {
    await prisma.newsArticle.create({
      data: {
        title, subtitle, category, regionKey, source,
        externalUrl: 'https://example.com/noticia-ficticia',
        status: 'PUBLISHED',
        publishedAt: new Date(Date.now() - hoursAgo * 3600 * 1000),
        authorId: moderator.id,
      },
    });
  }
  await prisma.newsArticle.create({
    data: {
      title: 'Rascunho: nova linha de ônibus ligará bairros brasileiros',
      subtitle: 'Matéria ainda em edição.', category: 'community', regionKey: 'orlando-fl', source: 'Gringoou Notícias',
      externalUrl: 'https://example.com/rascunho-ficticio', status: 'DRAFT', authorId: moderator.id,
    },
  });

  // ---------- Banners fixos da Home ----------
  const banners = [
    ['Bem-vindo ao Gringoou', 'Conecte-se com a comunidade brasileira perto de você.', 'Conhecer', '/community', null],
    ['Feira Brasileira de Orlando', 'Comida, música e negócios da comunidade neste fim de semana.', 'Ver eventos', '/events', 'orlando-fl'],
    ['Venda e compre no Marketplace', 'Anuncie o que você não usa mais e encontre ofertas na sua região.', 'Abrir Marketplace', '/marketplace', null],
  ];
  for (const [index, [name, description, ctaLabel, targetUrl, regionKey]] of banners.entries()) {
    await prisma.banner.create({
      data: {
        name, headline: name, description, ctaLabel, targetUrl, regionKey,
        imageUrl: `https://picsum.photos/seed/gringoou-banner-${index + 1}/1200/480`,
        type: 'LINK', placement: 'HOME',
        isActive: true, campaignStatus: 'ACTIVE', moderationStatus: 'APPROVED',
      },
    });
  }

  console.log('[seed] Dados fictícios criados.');
  console.log('[seed] Logins (senha: senha123): admin@gringoou.local, moderadora@gringoou.local,');
  console.log('[seed]   ana@gringoou.local, bruno@gringoou.local, carla@gringoou.local, diego@gringoou.local');
}

main()
  .catch((error) => {
    console.error('[seed] Falhou:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
