import LegalPage from '@/components/legal/LegalPage';

export default function PrivacyPage() {
  return <LegalPage title="Política de Privacidade" updatedAt="3 de agosto de 2026" sections={[
    { title: '1. Dados coletados', paragraphs: ['Coletamos dados de conta, perfil, localização informada, interações e conteúdos necessários para operar e personalizar a comunidade.'] },
    { title: '2. Como usamos os dados', paragraphs: ['Usamos os dados para autenticar usuários, entregar conteúdo regional, prevenir abusos, oferecer suporte e melhorar a experiência da plataforma.'] },
    { title: '3. Compartilhamento', paragraphs: ['Não vendemos dados pessoais. Podemos compartilhar dados com provedores essenciais de infraestrutura, sempre limitados a finalidade do serviço e sujeitos a medidas de segurança.'] },
    { title: '4. Retenção e segurança', paragraphs: ['Mantemos dados pelo período necessário para prestar o serviço e cumprir obrigações legais. Aplicamos controles técnicos e organizacionais para reduzir riscos de acesso indevido.'] },
    { title: '5. Seus direitos', paragraphs: ['Você pode solicitar acesso, correção ou exclusão de dados, conforme a legislação aplicável, pelos canais oficiais de atendimento da Gringoou.'] },
  ]} />;
}
