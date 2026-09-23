'use client';

import React from 'react';
import { BriefcaseBusiness, CalendarDays, ExternalLink, ImagePlus, Megaphone, MoreHorizontal, Plus } from 'lucide-react';
import { Dropdown } from '../ui/Dropdown';
import type { ProfessionalProfileSummary } from '../../types';

const formatBusinessStatus = (status: string) => ({
  PUBLISHED: 'Publicado',
  PENDING_REVIEW: 'Em revisão',
  REJECTED: 'Rejeitado',
  SUSPENDED: 'Suspenso',
  DRAFT: 'Rascunho',
}[status] || status);

const formatEventStatus = (status: string) => ({
  PUBLISHED: 'Publicado',
  PENDING_REVIEW: 'Em revisão',
  REJECTED: 'Rejeitado',
  CANCELED: 'Cancelado',
  DRAFT: 'Rascunho',
}[status] || status);

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));

const menuTrigger = (label: string) => (
  <span className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:border-brand-200 hover:text-brand-500" aria-label={label} title={label}>
    <MoreHorizontal size={18} />
  </span>
);

type ProfessionalModePanelProps = {
  professionalProfile: ProfessionalProfileSummary;
  username: string;
  onEditAvatar: () => void;
  onEditCover: () => void;
};

const ProfessionalModePanel: React.FC<ProfessionalModePanelProps> = ({ professionalProfile, username, onEditAvatar, onEditCover }) => {
  const navigate = (path: string) => window.location.assign(path);

  return (
    <div className="space-y-8">
      <section className="border-b border-slate-200 bg-slate-50 px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-3 py-1 text-[11px] font-bold text-brand-700">
              <BriefcaseBusiness size={14} /> Você é proprietário
            </div>
            <h2 className="mt-2 text-xl font-bold text-slate-900">Edição do perfil profissional</h2>
            <p className="mt-0.5 text-sm text-slate-500">Atualize a vitrine pública que reúne seus negócios e eventos.</p>
            <p className="mt-3 text-sm font-semibold text-slate-700">
              {professionalProfile.businessCount} {professionalProfile.businessCount === 1 ? 'negócio' : 'negócios'} · {professionalProfile.eventCount} {professionalProfile.eventCount === 1 ? 'evento' : 'eventos'}
            </p>
          </div>
          <div className="shrink-0">
            <Dropdown
              trigger={menuTrigger('Ações do perfil profissional')}
              sections={[
                {
                  heading: 'Perfil profissional',
                  items: [
                    { label: 'Ver página pública', icon: <ExternalLink size={16} />, onClick: () => navigate(`/profissional/${username}`) },
                    { label: 'Editar foto', icon: <ImagePlus size={16} />, onClick: onEditAvatar },
                    { label: 'Editar capa', icon: <ImagePlus size={16} />, onClick: onEditCover },
                  ],
                },
                {
                  heading: 'Publicações',
                  items: [
                    { label: 'Cadastrar negócio', icon: <Plus size={16} />, onClick: () => navigate('/negocios?create=1') },
                    { label: 'Abrir eventos', icon: <CalendarDays size={16} />, onClick: () => navigate('/eventos') },
                  ],
                },
              ]}
            />
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-slate-400">
          <BriefcaseBusiness size={16} />
          Negócios
        </div>
        {professionalProfile.businesses.length > 0 ? (
          <div className="mt-3 divide-y divide-slate-100">
            {professionalProfile.businesses.map((business) => (
              <article key={business.id} className="flex items-start gap-3 py-4 first:pt-1">
                <img src={business.imageUrl || `https://picsum.photos/seed/${business.id}/160`} alt={business.name} className="h-16 w-16 shrink-0 rounded-2xl object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-base font-bold text-foreground">{business.name}</p>
                      <p className="mt-0.5 truncate text-sm text-slate-500">{business.category} · {business.locationLabel || 'Sem região definida'}</p>
                    </div>
                    <span className="shrink-0 text-xs font-semibold text-slate-500">{formatBusinessStatus(business.status)}</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-400">Atualizado em {formatDateTime(business.updatedAt)}</p>
                </div>
                <Dropdown
                  trigger={menuTrigger(`Ações de ${business.name}`)}
                  sections={[{ items: [
                    { label: 'Ver página pública', icon: <ExternalLink size={16} />, onClick: () => navigate(business.publicPath) },
                    { label: 'Gerenciar negócio', icon: <BriefcaseBusiness size={16} />, onClick: () => navigate(`/negocios/${business.slug || business.id}/gerenciar`) },
                    ...(business.status === 'PUBLISHED' ? [{ label: 'Promover com Ads', icon: <Megaphone size={16} />, onClick: () => navigate(`/ads/promover/${business.id}`) }] : []),
                  ]}]}
                />
              </article>
            ))}
          </div>
        ) : <p className="mt-3 py-5 text-sm text-slate-500">Nenhum negócio vinculado ainda.</p>}
      </section>

      <section>
        <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-slate-400">
          <CalendarDays size={16} />
          Eventos profissionais
        </div>
        {professionalProfile.events.length > 0 ? (
          <div className="mt-3 divide-y divide-slate-100">
            {professionalProfile.events.map((event) => (
              <article key={event.id} className="flex items-start gap-3 py-4 first:pt-1">
                <img src={event.imageUrl || `https://picsum.photos/seed/${event.id}/160`} alt={event.title} className="h-16 w-16 shrink-0 rounded-2xl object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-base font-bold text-foreground">{event.title}</p>
                      <p className="mt-0.5 truncate text-sm text-slate-500">{event.locationLabel || 'Sem região definida'}</p>
                    </div>
                    <span className="shrink-0 text-xs font-semibold text-slate-500">{formatEventStatus(event.status)}</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-400">Começa em {formatDateTime(event.startsAt)}</p>
                </div>
                <Dropdown trigger={menuTrigger(`Ações de ${event.title}`)} sections={[{ items: [
                  { label: 'Abrir evento', icon: <ExternalLink size={16} />, onClick: () => navigate(event.publicPath) },
                ] }]} />
              </article>
            ))}
          </div>
        ) : <p className="mt-3 py-5 text-sm text-slate-500">Nenhum evento profissional criado ainda.</p>}
      </section>
    </div>
  );
};

export default ProfessionalModePanel;
