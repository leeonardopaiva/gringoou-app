export const AD_BUSINESS_CATEGORIES = [
  { value: 'Alimentacao & Bebidas', label: 'Alimentação & Bebidas', examples: ['Restaurante Brasileiro', 'Café', 'Padaria', 'Food Truck', 'Marmiteiro'] },
  { value: 'Servicos Domesticos & Encanamento', label: 'Serviços Domésticos & Encanamento', examples: ['Encanador', 'Eletricista', 'Limpeza', 'Handyman', 'HVAC'] },
  { value: 'Construcao & Reformas', label: 'Construção & Reformas', examples: ['Empreiteiro Geral', 'Telhados', 'Pintura', 'Paisagismo'] },
  { value: 'Imoveis & Moradia', label: 'Imoveis & Moradia', examples: ['Corretor de Imoveis', 'Administração de Imoveis', 'Alugueis'] },
  { value: 'Saude & Bem-Estar', label: 'Saude & Bem-Estar', examples: ['Dentista', 'Clínica', 'Personal Trainer', 'Spa', 'Salão de Beleza'] },
  { value: 'Servicos Profissionais', label: 'Serviços Profissionais', examples: ['Contabilidade', 'Advocacia', 'Serviços Financeiros', 'Seguros'] },
  { value: 'Automotivo', label: 'Automotivo', examples: ['Oficina Mecânica', 'Lava-jato', 'Guincho'] },
  { value: 'Varejo & Lojas Locais', label: 'Varejo & Lojas Locais', examples: ['Boutique', 'Mercado', 'Pet Shop'] },
  { value: 'Educacao & Aulas', label: 'Educação & Aulas', examples: ['Escola de Idiomas', 'Aulas Particulares', 'Aulas de Música'] },
  { value: 'Outros Servicos Locais', label: 'Outros Serviços Locais', examples: ['Outro serviço local'] },
] as const;

export const AD_BUSINESS_CATEGORY_VALUES = AD_BUSINESS_CATEGORIES.map((item) => item.value);
