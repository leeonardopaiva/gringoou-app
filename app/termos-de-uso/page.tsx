import LegalPage from '@/components/legal/LegalPage';

export default function TermsPage() {
  return <LegalPage title="Termos de Uso" updatedAt="3 de agosto de 2026" sections={[
    { title: '1. Aceitação', paragraphs: ['Ao criar uma conta ou utilizar a Gringoou, você declara que leu e concorda com estes termos e com a Política de Privacidade.'] },
    { title: '2. Uso da plataforma', paragraphs: ['Você deve fornecer informações verdadeiras, proteger suas credenciais e utilizar os recursos de forma licita e respeitosa.', 'Conteúdos, vagas e anúncios de moradia sao de responsabilidade de seus autores e podem ser moderados quando violarem estas regras.'] },
    { title: '3. Publicações e negócios', paragraphs: ['A Gringoou pode revisar, limitar ou remover conteúdos enganosos, ilegais ou prejudiciais. Empresas e recrutadores devem possuir autorização para divulgar oportunidades.'] },
    { title: '4. Responsabilidades', paragraphs: ['A plataforma aproxima membros da comunidade, mas não e parte de contratos celebrados entre usuários, anunciantes, empregadores ou proprietários.'] },
    { title: '5. Contato e alterações', paragraphs: ['Estes termos podem ser atualizados para refletir mudanças legais ou de produto. O uso continuado após a atualização representa aceitação da nova versão.'] },
  ]} />;
}
