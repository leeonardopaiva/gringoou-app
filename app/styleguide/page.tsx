'use client';

import React, { useState } from 'react';
import {
  Download,
  ArrowRight,
  Search,
  Laptop,
  MoreHorizontal,
  User as UserIcon,
  Settings,
  CreditCard,
  LogOut,
  Building2,
  CalendarDays,
  Users,
  Home,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Avatar, AvatarGroup } from '../../components/ui/Avatar';
import { Card } from '../../components/ui/Card';
import { Alert } from '../../components/ui/Alert';
import { Input, Textarea, Select, Checkbox, Toggle } from '../../components/ui/Input';
import { Modal, ConfirmModal } from '../../components/ui/Modal';
import { Dropdown } from '../../components/ui/Dropdown';
import { Skeleton } from '../../components/ui/Skeleton';
import { Spinner } from '../../components/ui/Spinner';
import { Tabs } from '../../components/ui/Tabs';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { Pagination } from '../../components/ui/Pagination';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { Autocomplete } from '../../components/ui/Autocomplete';
import { GringoouLogo } from '../../components/icons/GringoouLogo';
import { TrendsCarousel } from '../../components/app/TrendsCarousel';
import { SidebarMenu, SidebarMenuItem } from '../../components/navigation/SidebarMenu';
import PostCard from '../../components/community/PostCard';
import { ContentColumn } from '../../components/ui/ContentColumn';
import { CharacterCounter } from '../../components/ui/CharacterCounter';
import { FeedCard } from '../../components/ui/FeedCard';

const Section: React.FC<{
  index: string;
  eyebrow: string;
  title: string;
  code?: string;
  children: React.ReactNode;
}> = ({ index, eyebrow, title, code, children }) => (
  <section className="mx-auto max-w-4xl px-6 py-10">
    <p className="text-caption font-bold uppercase tracking-wide text-brand-500">
      {index} — {eyebrow}
    </p>
    <h2 className="mb-5 mt-1 text-h2 font-extrabold text-text">{title}</h2>
    <div className="rounded-card border border-slate-200 bg-white p-6 shadow-sm">{children}</div>
    {code && (
      <pre className="mt-4 overflow-x-auto rounded-2xl bg-[#0f2b3d] p-4 text-xs leading-relaxed text-slate-100">
        <code>{code.trim()}</code>
      </pre>
    )}
  </section>
);

const Row: React.FC<{ label?: string; children: React.ReactNode; className?: string }> = ({
  label,
  children,
  className,
}) => (
  <div className={className}>
    {label && <p className="mb-2 text-caption font-bold uppercase tracking-wide text-slate-400">{label}</p>}
    <div className="flex flex-wrap items-center gap-3">{children}</div>
  </div>
);

export default function StyleguidePage() {
  const [toggleOn, setToggleOn] = useState(true);
  const [toggleOff, setToggleOff] = useState(false);
  const [tab, setTab] = useState('dia');
  const [underlineTab, setUnderlineTab] = useState('geral');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [city, setCity] = useState('');

  return (
    <div className="min-h-screen bg-bg pb-24">
      <header className="sticky top-0 z-10 flex items-center justify-between bg-[#0f2b3d] px-6 py-3 text-white">
        <div className="flex items-center gap-3">
          <GringoouLogo size={22} className="brightness-0 invert" />
          <span className="text-caption font-semibold uppercase tracking-widest text-white/60">/ Styleguide</span>
        </div>
        <span className="text-caption text-white/50">Gringoou Design System · v1.0</span>
      </header>

      <Section
        index="01"
        eyebrow="Botões"
        title="Buttons"
        code={`
import { Button } from '@/components/ui/Button';

<Button variant="primary">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="dark">Dark</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="yellow">Yellow CTA</Button>
<Button variant="success">Success</Button>
<Button disabled>Disabled</Button>

<Button size="xs" /> <Button size="sm" /> <Button size="md" />
<Button size="lg" /> <Button size="xl" fullWidth />

<Button iconLeft={<Plus size={16} />}>Adicionar</Button>
<Button iconOnly aria-label="Buscar"><Search size={18} /></Button>
<Button loading>Confirmar</Button>
        `}
      >
        <div className="space-y-6">
          <Row label="Variantes">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="dark">Dark</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="yellow">Yellow CTA</Button>
            <Button variant="success">Success</Button>
            <Button disabled>Disabled</Button>
          </Row>

          <Row label="Tamanhos">
            <Button size="xs">XS</Button>
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
            <Button size="xl">XLarge</Button>
          </Row>

          <Row label="Com ícones & full width">
            <Button iconLeft={<span className="text-lg leading-none">+</span>}>Adicionar</Button>
            <Button variant="secondary" iconLeft={<Download size={16} />}>
              Download
            </Button>
            <Button variant="ghost" iconRight={<ArrowRight size={16} />}>
              Próximo
            </Button>
            <Button iconOnly aria-label="Buscar">
              <Search size={18} />
            </Button>
          </Row>

          <Button fullWidth size="xl" iconLeft={<span>✓</span>}>
            Confirmar e continuar
          </Button>
        </div>
      </Section>

      <Section
        index="02"
        eyebrow="Inputs & Forms"
        title="Form Controls"
        code={`
import { Input, Textarea, Select, Checkbox, Toggle } from '@/components/ui/Input';

<Input placeholder="Digite aqui..." />
<Input prefixIcon={<Search size={16} />} placeholder="Pesquisar..." />
<Input state="success" helperText="Nome válido" defaultValue="João Silva" />
<Input state="error" helperText="E-mail inválido" defaultValue="user@" />
<Input disabled placeholder="Somente leitura" />

<Textarea placeholder="Escreva sua mensagem..." />
<Select><option>Marketplace</option></Select>
<Checkbox label="Aceito os termos de uso" defaultChecked />
<Toggle checked={value} onChange={setValue} label="Notificações ativadas" />
        `}
      >
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-4">
            <div>
              <p className="mb-1.5 text-caption font-bold text-slate-500">Progresso</p>
              <ProgressBar value={65} label="Conclusao do perfil" />
            </div>
            <div>
              <p className="mb-1.5 text-caption font-bold text-slate-500">Autocomplete</p>
              <Autocomplete
                value={city}
                onChange={setCity}
                options={['Sao Paulo, SP', 'Rio de Janeiro, RJ', 'Salvador, BA', 'Recife, PE']}
                placeholder="Busque uma cidade"
              />
            </div>
            <div>
              <p className="mb-1.5 text-caption font-bold text-slate-500">Input padrão</p>
              <Input placeholder="Digite aqui..." />
            </div>
            <div>
              <p className="mb-1.5 text-caption font-bold text-slate-500">Com ícone prefixo</p>
              <Input prefixIcon={<Search size={16} />} placeholder="Pesquisar..." />
            </div>
            <div>
              <p className="mb-1.5 text-caption font-bold text-slate-500">Estado — sucesso</p>
              <Input state="success" helperText="Nome válido" defaultValue="João Silva" />
            </div>
            <div>
              <p className="mb-1.5 text-caption font-bold text-slate-500">Estado — erro</p>
              <Input state="error" helperText="E-mail inválido" defaultValue="user@" />
            </div>
            <div>
              <p className="mb-1.5 text-caption font-bold text-slate-500">Desabilitado</p>
              <Input disabled placeholder="Somente leitura" />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <p className="mb-1.5 text-caption font-bold text-slate-500">Textarea</p>
              <Textarea placeholder="Escreva sua mensagem..." rows={3} />
            </div>
            <div>
              <p className="mb-1.5 text-caption font-bold text-slate-500">Select</p>
              <Select defaultValue="marketplace">
                <option value="marketplace">Marketplace</option>
                <option value="comunidade">Comunidade</option>
              </Select>
            </div>
            <Checkbox label="Aceito os termos de uso" defaultChecked />
            <Checkbox label="Receber notificações" />
            <Toggle checked={toggleOn} onChange={setToggleOn} label="Notificações ativadas" />
            <Toggle checked={toggleOff} onChange={setToggleOff} label="Modo escuro" />
          </div>
        </div>
      </Section>

      <Section
        index="03"
        eyebrow="Badges & Tags"
        title="Badges & Tags"
        code={`
import { Badge } from '@/components/ui/Badge';

<Badge tone="primary">Primary</Badge>
<Badge tone="success">Sucesso</Badge>
<Badge tone="destaque">Destaque</Badge>
<Badge tone="erro">Erro</Badge>
<Badge tone="neutro">Neutro</Badge>
<Badge.Novo /> <Badge.Pro />

<Badge dot="online" /> <Badge dot="ausente" /> <Badge dot="offline" />
<Badge tone="primary" variant="outline">Outline</Badge>
<Badge tone="primary" count={3} /> <Badge tone="erro" count={12} />
        `}
      >
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone="primary">Primary</Badge>
          <Badge tone="success">Sucesso</Badge>
          <Badge tone="destaque">Destaque</Badge>
          <Badge tone="erro">Erro</Badge>
          <Badge tone="neutro">Neutro</Badge>
          <Badge.Novo />
          <Badge.Pro />
          <span className="mx-1 h-5 w-px bg-slate-200" />
          <span className="inline-flex items-center gap-1 text-caption text-slate-500">
            <Badge dot="online" /> Online
          </span>
          <span className="inline-flex items-center gap-1 text-caption text-slate-500">
            <Badge dot="ausente" /> Ausente
          </span>
          <span className="inline-flex items-center gap-1 text-caption text-slate-500">
            <Badge dot="offline" /> Offline
          </span>
          <Badge tone="primary" variant="outline">
            Outline
          </Badge>
          <Badge tone="primary" count={3} />
          <Badge tone="erro" count={12} />
        </div>
      </Section>

      <Section
        index="04"
        eyebrow="Alertas & Notificações"
        title="Alerts & Toasts"
        code={`
import { Alert } from '@/components/ui/Alert';
import { useToast } from '@/components/feedback/ToastProvider';

<Alert tone="info" title="Informação" description="Uma atualização está disponível." onClose={fn} />
<Alert tone="success" title="Sucesso" description="Seu perfil foi atualizado." onClose={fn} />
<Alert tone="atencao" title="Atenção" description="Seu plano vence em 3 dias." onClose={fn} />
<Alert tone="erro" title="Erro" description="Não foi possível processar o pagamento." onClose={fn} />

const { showToast } = useToast();
showToast('Salvo com sucesso', 'success', 4000, { actionLabel: 'Desfazer', onAction: fn });
        `}
      >
        <div className="space-y-3">
          <Alert tone="info" title="Informação" description="Uma atualização está disponível para o seu plano." onClose={() => {}} />
          <Alert tone="success" title="Sucesso" description="Seu perfil foi atualizado com sucesso." onClose={() => {}} />
          <Alert tone="atencao" title="Atenção" description="Seu plano vence em 3 dias. Renove para manter o acesso." onClose={() => {}} />
          <Alert tone="erro" title="Erro" description="Não foi possível processar o pagamento." onClose={() => {}} />

          <p className="pb-1 pt-3 text-caption font-bold uppercase tracking-wide text-slate-400">Toast Notifications</p>
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-3 rounded-3xl bg-text px-4 py-3 text-white shadow-lg">
              <span className="text-body-sm font-medium">Salvo com sucesso</span>
              <button className="text-body-sm font-bold text-brand-300 hover:text-white">Desfazer</button>
            </div>
            <div className="flex items-center gap-3 rounded-3xl border border-amber-100 bg-amber-50 px-4 py-3 text-amber-700 shadow-lg">
              <span className="text-body-sm font-medium">Ação requer atenção</span>
              <button className="text-body-sm font-bold">OK</button>
            </div>
          </div>
        </div>
      </Section>

      <Section
        index="05"
        eyebrow="Cards"
        title="Card Components"
        code={`
import { Card } from '@/components/ui/Card';

<Card>
  <Card.Media src="..." badge={<Badge>Marketplace</Badge>} />
  <Card.Title>MacBook Pro 14"</Card.Title>
  <Card.Description>Produto em excelente estado.</Card.Description>
  <Card.Footer>
    <span className="text-h3 font-extrabold text-brand-500">US$ 12,499</span>
    <Button size="sm">Ver mais</Button>
  </Card.Footer>
</Card>

<Card><Card.Stat label="Usuários ativos" value="24.831" progress={68} /></Card>
<Card><Card.Profile avatar={<Avatar .../>} name="Maria Souza" role="Diretora" /></Card>
        `}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <Card.Media badge={<Badge tone="primary">Marketplace</Badge>}>
              <div className="flex h-full w-full items-center justify-center text-brand-500/40">
                <Laptop size={48} />
              </div>
            </Card.Media>
            <Card.Title>MacBook Pro 14&quot;</Card.Title>
            <Card.Description>Produto em excelente estado, acompanha carregador.</Card.Description>
            <Card.Footer>
              <span className="text-h3 font-extrabold text-brand-500">US$ 12,499</span>
              <Button size="sm">Ver mais</Button>
            </Card.Footer>
          </Card>

          <Card>
            <Card.Stat
              label="Usuários ativos"
              value="24.831"
              icon={<UserIcon size={18} />}
              delta={<Badge tone="success">+12,4%</Badge>}
              caption="vs. mês anterior"
              progress={68}
            />
          </Card>

          <Card>
            <Card.Profile
              avatar={<Avatar name="Maria Souza" size="lg" />}
              name="Maria Souza"
              role="Diretora de Marketing"
              badge={<Badge.Pro />}
              action={
                <Button size="sm" variant="secondary">
                  Seguir
                </Button>
              }
            />
          </Card>
        </div>
      </Section>

      <Section
        index="06"
        eyebrow="Avatares"
        title="Avatar & User"
        code={`
import { Avatar, AvatarGroup } from '@/components/ui/Avatar';

<Avatar name="Ana Lima" size="xs" /> <Avatar name="Carlos" size="sm" />
<Avatar name="Diego" size="md" status="online" />
<Avatar name="Luiza" size="lg" status="ausente" />
<Avatar name="João" size="xl" status="offline" />
<AvatarGroup avatars={members} max={4} totalCount={28} />
        `}
      >
        <Row>
          <Avatar name="Ana Lima" size="xs" />
          <Avatar name="Diego Melo" size="sm" />
          <Avatar name="Rafa" size="md" />
          <Avatar name="Luiza Prado" size="lg" status="online" />
          <Avatar name="João Silva" size="xl" status="ausente" />
          <Avatar name="Bia" size="md" status="offline" />
          <span className="mx-2 h-8 w-px bg-slate-200" />
          <AvatarGroup
            size="sm"
            max={4}
            totalCount={28}
            avatars={[
              { name: 'Ana' },
              { name: 'Bruno' },
              { name: 'Carla' },
              { name: 'Diego' },
              { name: 'Eva' },
            ]}
          />
        </Row>
      </Section>

      <Section
        index="07"
        eyebrow="Navegação & Tabs"
        title="Navigation"
        code={`
import { Tabs } from '@/components/ui/Tabs';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Pagination } from '@/components/ui/Pagination';

<Tabs variant="pill" items={[{label:'Dia',value:'dia'}, ...]} value={tab} onChange={setTab} />
<Tabs variant="underline" items={[...]} value={tab} onChange={setTab} />
<Breadcrumb items={[{label:'Início',href:'/'}, {label:'Marketplace',href:'/marketplace'}, {label:'Detalhes do produto'}]} />
<Pagination page={page} totalPages={9} onChange={setPage} />
        `}
      >
        <div className="space-y-6">
          <div>
            <p className="mb-2 text-caption font-bold uppercase tracking-wide text-slate-400">Pill Tabs</p>
            <Tabs
              variant="pill"
              value={tab}
              onChange={setTab}
              items={[
                { label: 'Dia', value: 'dia' },
                { label: 'Semana', value: 'semana' },
                { label: 'Mês', value: 'mes' },
              ]}
            />
          </div>
          <div>
            <p className="mb-2 text-caption font-bold uppercase tracking-wide text-slate-400">Underline Tabs</p>
            <Tabs
              variant="underline"
              value={underlineTab}
              onChange={setUnderlineTab}
              items={[
                { label: 'Visão geral', value: 'geral' },
                { label: 'Anúncios', value: 'anuncios' },
                { label: 'Comunidade', value: 'comunidade' },
                { label: 'Configurações', value: 'config' },
              ]}
            />
          </div>
          <div>
            <p className="mb-2 text-caption font-bold uppercase tracking-wide text-slate-400">Breadcrumb</p>
            <Breadcrumb
              items={[
                { label: 'Início', href: '/' },
                { label: 'Marketplace', href: '/marketplace' },
                { label: 'Detalhes do produto' },
              ]}
            />
          </div>
          <div>
            <p className="mb-2 text-caption font-bold uppercase tracking-wide text-slate-400">Pagination</p>
            <Pagination page={page} totalPages={9} onChange={setPage} />
          </div>
        </div>
      </Section>

      <Section
        index="08"
        eyebrow="Loading States"
        title="Skeletons & Loaders"
        code={`
import { Skeleton } from '@/components/ui/Skeleton';
import { Spinner } from '@/components/ui/Spinner';

<Skeleton.Card />
<Spinner size="xs" /> <Spinner size="sm" /> <Spinner size="md" /> <Spinner size="lg" />
<Button loading>Carregando...</Button>
        `}
      >
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-caption font-bold uppercase tracking-wide text-slate-400">Skeleton Card</p>
            <Skeleton.Card className="max-w-xs" />
          </div>
          <div>
            <p className="mb-2 text-caption font-bold uppercase tracking-wide text-slate-400">Spinners</p>
            <div className="flex items-center gap-4">
              <Spinner size="xs" />
              <Spinner size="sm" />
              <Spinner size="md" />
              <Spinner size="lg" />
              <Button loading>Carregando...</Button>
            </div>
          </div>
        </div>
      </Section>

      <Section
        index="09"
        eyebrow="Modais & Dropdowns"
        title="Modal & Dropdown"
        code={`
import { Modal, ConfirmModal } from '@/components/ui/Modal';
import { Dropdown } from '@/components/ui/Dropdown';

<ConfirmModal
  open={open} onClose={close} onConfirm={fn}
  title="Confirmar ação"
  description="Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita."
  confirmLabel="Excluir" destructive
/>

<Dropdown
  trigger={<Avatar name="Você" size="sm" />}
  sections={[{ heading: 'Minha conta', items: [
    { label: 'Perfil', icon: <User size={16} />, onClick: fn },
    { label: 'Configurações', icon: <Settings size={16} />, onClick: fn },
    { label: 'Plano & Fatura', icon: <CreditCard size={16} />, onClick: fn },
  ]}, { items: [{ label: 'Sair', icon: <LogOut size={16} />, onClick: fn, destructive: true }] }]}
/>
        `}
      >
        <Row>
          <Button variant="secondary" onClick={() => setModalOpen(true)}>
            Abrir modal
          </Button>
          <Button variant="secondary" onClick={() => setConfirmOpen(true)}>
            Abrir confirmação
          </Button>
          <Dropdown
            trigger={
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-body-sm font-semibold text-text">
                <Avatar name="Você" size="xs" />
                Menu <MoreHorizontal size={14} />
              </span>
            }
            sections={[
              {
                heading: 'Minha conta',
                items: [
                  { label: 'Perfil', icon: <UserIcon size={16} />, onClick: () => {} },
                  { label: 'Configurações', icon: <Settings size={16} />, onClick: () => {} },
                  { label: 'Plano & Fatura', icon: <CreditCard size={16} />, onClick: () => {} },
                ],
              },
              {
                items: [{ label: 'Sair', icon: <LogOut size={16} />, onClick: () => {}, destructive: true }],
              },
            ]}
          />
        </Row>
      </Section>

      <Section index="10" eyebrow="Componentes do produto" title="Trends & busca fullscreen">
        <div className="space-y-6">
          <TrendsCarousel
            items={[
              { href: '/businesses', category: 'Negócios', title: 'Mercado Brasileiro Central', description: 'Alimentação · Boston', icon: Building2 },
              { href: '/community', category: 'Comunidade', title: 'Dicas para quem acabou de chegar', description: 'Por Maria Souza', icon: Users },
              { href: '/events', category: 'Eventos', title: 'Encontro da comunidade', description: 'Sábado · 18h', icon: CalendarDays },
            ]}
          />
          <Button variant="secondary" onClick={() => setFullscreenOpen(true)}>Abrir busca fullscreen</Button>
          <div className="max-w-xs rounded-card bg-bg p-4">
            <p className="mb-3 text-caption font-bold uppercase tracking-wide text-muted-foreground">Sidebar navigation</p>
            <SidebarMenu label="Exemplo de navegação lateral">
              <SidebarMenuItem label="Home" icon={<Home size={18} />} active />
              <SidebarMenuItem label="Comunidade" icon={<Users size={18} />} />
              <SidebarMenuItem label="Negócios" icon={<Building2 size={18} />} badge="3" />
            </SidebarMenu>
          </div>
          <div className="max-w-lg bg-bg p-4">
            <p className="mb-3 text-caption font-bold uppercase tracking-wide text-muted-foreground">Community post & media thumbnail</p>
            <PostCard.Root>
              <PostCard.Header
                authorImage="/assets/logo26.png"
                authorName="Comunidade Gringoou"
                createdAt={new Date().toISOString()}
                locationLabel="Boston, MA"
              />
              <PostCard.Body
                postId="styleguide-post"
                content="A imagem usa uma miniatura compacta e pode ser ampliada em um modal fullscreen."
                imageUrl="https://picsum.photos/seed/gringoou-styleguide/900/600"
              />
            </PostCard.Root>
          </div>
        </div>
      </Section>

      <Section
        index="11"
        eyebrow="Conteudo social"
        title="Feed cards & content columns"
        code={`
import { ContentColumn, FeedCard, CharacterCounter } from '@/components/ui';

<ContentColumn size="feed">
  <FeedCard.Root variant="sponsored">
    <FeedCard.Header />
    <FeedCard.Content text={description} />
    <FeedCard.Media src={imageUrl} alt={headline} />
    <FeedCard.Headline>{headline}</FeedCard.Headline>
    <FeedCard.CTA>Saiba mais</FeedCard.CTA>
  </FeedCard.Root>
</ContentColumn>
        `}
      >
        <div className="space-y-6 rounded-card bg-bg p-4">
          <div className="flex flex-wrap gap-3 text-caption font-semibold text-slate-500">
            <span>Feed: 600px</span>
            <span>Leitura: 720px</span>
            <span>Wide: 1120px</span>
            <CharacterCounter current={428} max={600} className="ml-auto" />
          </div>
          <ContentColumn size="feed">
            <FeedCard.Root variant="sponsored">
              <FeedCard.Header
                avatarUrl="/assets/logo26.png"
                avatarAlt="Gringoou"
                title="Mercado Brasileiro Central"
                subtitle="Boston, MA"
                badge={<FeedCard.SponsoredBadge />}
              />
              <FeedCard.Content text="Produtos brasileiros perto de voce, atendimento em portugues e entrega na regiao. Passe para conhecer as novidades desta semana." />
              <FeedCard.Media src="https://picsum.photos/seed/gringoou-feed-card/900/675" alt="Produtos do mercado" />
              <FeedCard.Headline>Sabores do Brasil perto da sua comunidade</FeedCard.Headline>
              <div className="px-5 pb-4 pt-3">
                <FeedCard.CTA>Saiba mais</FeedCard.CTA>
              </div>
            </FeedCard.Root>
          </ContentColumn>
        </div>
      </Section>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Exemplo de modal" description="Este é o componente Modal padrão do design system.">
        <p className="text-body-sm text-slate-500">Conteúdo livre pode ser passado como children.</p>
      </Modal>

      <ConfirmModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => setConfirmOpen(false)}
        title="Confirmar ação"
        description="Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        destructive
      />

      <Modal
        open={fullscreenOpen}
        onClose={() => setFullscreenOpen(false)}
        title="O que você procura?"
        description="Exemplo do padrão fullscreen usado pela busca assistida."
        fullscreen
      >
        <Input placeholder="Descreva o que você precisa..." />
      </Modal>

      <footer className="mx-auto max-w-4xl px-6 pb-10 pt-4 text-center text-caption text-slate-400">
        Gringoou Design System — components/ui · fonte Sora · tokens em app/globals.css
      </footer>
    </div>
  );
}
