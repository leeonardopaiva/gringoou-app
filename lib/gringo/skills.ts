/**
 * Skills do Gringo: cada uma é um "modo de ajudar" com instruções próprias. O Gringo escolhe a skill
 * pela pergunta e pelo tipo dos resultados (sem chamar outro modelo, para responder rápido).
 *
 * Para criar uma skill nova: adicione um item em GRINGO_SKILLS com `id`, `match` (palavras da pergunta),
 * `guidance` (como ajudar nesse assunto) e, se precisar de resultados reais, `needsResults: true`.
 */

export type GringoSkillId =
  | 'negocios'
  | 'vagas'
  | 'moradia'
  | 'eventos'
  | 'pessoas-grupos'
  | 'imigracao'
  | 'primeiros-passos'
  | 'escrever-mensagem'
  | 'app-ajuda'
  | 'geral';

export type GringoSkill = {
  id: GringoSkillId;
  name: string;
  /** Palavras que indicam esta skill na pergunta (sem acentos, minúsculas). */
  match: RegExp;
  /** Tipos de resultado da busca que reforçam esta skill. */
  contextTypes?: string[];
  /** Sem resultados reais, esta skill não tem como responder bem (negócios, vagas, moradia...). */
  needsResults: boolean;
  guidance: string;
};

export const GRINGO_SKILLS: GringoSkill[] = [
  {
    id: 'imigracao',
    name: 'Imigração e documentos',
    match: /\b(visto|visa|green ?card|cidadania|asilo|passaporte|imigracao|imigrante|documento|documentos|itin|ssn|permissao de trabalho|work permit|residencia|deportacao|uscis|consulado|naturaliza)/,
    needsResults: false,
    guidance:
      'Skill Imigração e documentos: oriente em termos gerais e com calma, sem dar parecer jurídico. As regras mudam por país, estado e caso: diga isso, indique o site oficial do órgão competente e sugira um advogado ou organização de apoio ao imigrante quando o caso for sério. Nunca afirme prazos, taxas ou leis específicos se não tiver certeza. Se houver resultados da comunidade (advogados, despachantes, grupos), cite como pontos de partida, não como recomendação.',
  },
  {
    id: 'primeiros-passos',
    name: 'Primeiros passos no país',
    match: /\b(acabei de chegar|cheguei|chegando|primeiros passos|comecar do zero|recem chegad|mudando para|me mudei|novo no pais|nova no pais|o que fazer ao chegar)/,
    needsResults: false,
    guidance:
      'Skill Primeiros passos: a pessoa acabou de chegar ou vai chegar. Acolha primeiro. Monte um caminho curto e prático (moradia temporária, telefone e internet, conta no banco, transporte, documentos, comunidade), em ordem de urgência, sem despejar tudo. Avise que os detalhes variam por país e estado e pergunte onde ela está para personalizar. Use resultados da comunidade (grupos, negócios, eventos) como próximos passos concretos.',
  },
  {
    id: 'escrever-mensagem',
    name: 'Ajuda para escrever e traduzir',
    match: /\b(escreve|escrever|redija|redigir|me ajuda a escrever|mensagem para|carta|curriculo|resume|e-?mail para|traduz|traduzir|como digo|como falo|como se diz)/,
    needsResults: false,
    guidance:
      'Skill Escrever e traduzir: a pessoa quer um texto pronto (mensagem para o senhorio, e-mail de candidatura, currículo, resposta em outro idioma). Entregue o texto pronto para copiar, curto e educado, no idioma que ela precisa para o destinatário, e depois uma frase explicando o essencial em português se o texto estiver em outro idioma. Não invente dados pessoais: deixe [entre colchetes] o que ela precisa preencher.',
  },
  {
    id: 'vagas',
    name: 'Vagas de emprego',
    match: /\b(vaga|vagas|emprego|empregos|trabalho|trabalhar|contratando|contrata|job|jobs|servico de|freela|freelancer|curriculo)/,
    contextTypes: ['job'],
    needsResults: true,
    guidance:
      'Skill Vagas: destaque as vagas mais compatíveis com o que a pessoa procura (função, região, tipo). Se faltar informação importante (experiência, documentação para trabalhar), pergunte uma coisa só. Não prometa contratação nem salário que não esteja na vaga. Se houver sinal de golpe (pagar para trabalhar, promessa exagerada), avise com cuidado.',
  },
  {
    id: 'moradia',
    name: 'Moradia',
    match: /\b(moradia|morar|aluguel|alugar|quarto|apartamento|casa para|vaga em quarto|imovel|imoveis|housing|rent|roommate|dividir apartamento|republica)/,
    contextTypes: ['housing'],
    needsResults: true,
    guidance:
      'Skill Moradia: compare custo-benefício e localização entre as opções reais (perto de trabalho, transporte, comunidade). Lembre uma vez, de forma leve, de nunca pagar sinal ou depósito antes de visitar e confirmar o contrato. Não invente preço nem disponibilidade.',
  },
  {
    id: 'eventos',
    name: 'Eventos',
    match: /\b(evento|eventos|festa|show|encontro|feira|churrasco|culto|missa|festival|o que fazer no fim de semana|programacao)/,
    contextTypes: ['event'],
    needsResults: true,
    guidance:
      'Skill Eventos: mostre o que acontece primeiro e o que combina com o pedido, com data, local e o que a pessoa precisa saber. Sem data nos resultados, diga que não tem a data confirmada.',
  },
  {
    id: 'pessoas-grupos',
    name: 'Pessoas e grupos',
    match: /\b(grupo|grupos|comunidade de|conhecer gente|amigos|fazer amizade|networking|conhecer brasileiros|pessoas que|alguem que|igreja|time de)/,
    contextTypes: ['group', 'person', 'post'],
    needsResults: true,
    guidance:
      'Skill Pessoas e grupos: ajude a pessoa a se conectar. Sugira grupos e perfis públicos relacionados ao interesse dela e à região, e diga por que combinam. Mencione só nome público, username, região e interesses que estejam nos resultados; nunca exponha dados pessoais.',
  },
  {
    id: 'negocios',
    name: 'Negócios e serviços',
    match: /\b(restaurante|mercado|padaria|salao|barbeiro|cabeleireir|dentista|medico|advogado|contador|despachante|mecanico|loja|negocio|negocios|servico|servicos|encanador|eletricista|marmita|comida brasileira|remessa|cambio|frete|transporte|mudanca|babysitter|baba)/,
    contextTypes: ['business'],
    needsResults: true,
    guidance:
      'Skill Negócios: indique as melhores opções reais para o que a pessoa precisa, priorizando a mesma região. Compare em poucas palavras (avaliação, localização, especialidade) e diga como entrar em contato quando o link existir.',
  },
  {
    id: 'app-ajuda',
    name: 'Ajuda com o Gringoou',
    match: /\b(como uso o gringoou|como funciona o gringoou|como eu (publico|anuncio|crio)|nao consigo|como mudo (meu|minha)|como editar|como excluir|como apagar|como faco para (publicar|anunciar|criar)|gringoou)/,
    needsResults: false,
    guidance:
      'Skill Ajuda com o Gringoou: explique como usar o app em passos curtos. Só afirme o que tiver certeza que existe; se não souber, diga e oriente a usar o botão de sugestão do menu ou falar com o suporte.',
  },
];

export const GERAL_SKILL: GringoSkill = {
  id: 'geral',
  name: 'Conversa geral',
  match: /$^/,
  needsResults: false,
  guidance:
    'Skill Conversa geral: ajude no que a pessoa pediu usando os resultados da comunidade quando fizerem sentido. Se a pergunta for só um desabafo ou conversa, responda com empatia e ofereça ajuda concreta no fim.',
};

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/** Escolhe a skill pela pergunta; em empate, pelo tipo de resultado mais frequente. */
export function pickGringoSkill(query: string, contextTypes: string[] = []): GringoSkill {
  const text = normalize(query);
  const byQuestion = GRINGO_SKILLS.find((skill) => skill.match.test(text));
  if (byQuestion) return byQuestion;

  const counts = new Map<string, number>();
  contextTypes.forEach((type) => counts.set(type, (counts.get(type) ?? 0) + 1));
  const dominant = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  return GRINGO_SKILLS.find((skill) => dominant && skill.contextTypes?.includes(dominant)) ?? GERAL_SKILL;
}
