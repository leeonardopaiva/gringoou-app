'use client';

import React from 'react';
import Link from 'next/link';
import { BriefcaseBusiness, CalendarDays, Copy, ExternalLink, Megaphone, Share2 } from 'lucide-react';
import { useToast } from '../feedback/ToastProvider';
import type { ProfessionalProfileSummary } from '../../types';

const formatBusinessStatus = (status: string) => {
  switch (status) {
    case 'PUBLISHED':
      return 'Publicado';
    case 'PENDING_REVIEW':
      return 'Em revisão';
    case 'REJECTED':
      return 'Rejeitado';
    case 'SUSPENDED':
      return 'Suspenso';
    case 'DRAFT':
      return 'Rascunho';
    default:
      return status;
  }
};

const formatEventStatus = (status: string) => {
  switch (status) {
    case 'PUBLISHED':
      return 'Publicado';
    case 'PENDING_REVIEW':
      return 'Em revisão';
    case 'REJECTED':
      return 'Rejeitado';
    case 'CANCELED':
      return 'Cancelado';
    case 'DRAFT':
      return 'Rascunho';
    default:
      return status;
  }
};

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));

type ProfessionalModePanelProps = {
  professionalProfile: ProfessionalProfileSummary;
  username?: string | null;
};

const ProfessionalModePanel: React.FC<ProfessionalModePanelProps> = ({
  professionalProfile,
  username,
}) => {
  const { showToast } = useToast();

  const publicProfessionalPath = username ? `/profissional/${username}` : null;
  const publicProfessionalUrl =
    typeof window === 'undefined' || !publicProfessionalPath
      ? publicProfessionalPath
      : `${window.location.origin}${publicProfessionalPath}`;

  const handleCopyProfessionalUrl = async () => {
    if (!publicProfessionalUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(publicProfessionalUrl);
      showToast('Link da vitrine profissional copiado.', 'success');
    } catch {
      showToast(publicProfessionalUrl, 'info', 5000);
    }
  };

  const handleShareProfessionalUrl = async () => {
    if (!publicProfessionalUrl) {
      return;
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Vitrine profissional',
          text: 'Confira minha vitrine profissional na Gringoou.',
          url: publicProfessionalUrl,
        });
        return;
      } catch {
        return;
      }
    }

    await handleCopyProfessionalUrl();
  };

  return (
    <div className="space-y-5">
      <section className="rounded-[32px] border border-blue-100 bg-[linear-gradient(135deg,rgba(15,76,129,0.08)_0%,rgba(13,110,253,0.04)_100%)] p-5 shadow-sm">
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-[24px] border border-white/80 bg-white p-4 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Negócios</p>
            <p className="mt-2 text-h2 font-bold text-foreground">{professionalProfile.businessCount}</p>
          </div>
          <div className="rounded-[24px] border border-white/80 bg-white p-4 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Eventos</p>
            <p className="mt-2 text-h2 font-bold text-foreground">{professionalProfile.eventCount}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/negocios"
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-brand-500 px-4 text-sm font-bold text-white shadow-sm"
          >
            Cadastrar negócio
          </Link>
          <Link
            href="/eventos"
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-brand-100 bg-surface px-4 text-sm font-bold text-brand-500"
          >
            Abrir eventos
          </Link>
          {username ? (
            <>
              <Link
                href={`/profissional/${username}`}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-brand-100 bg-surface px-4 text-sm font-bold text-brand-500"
              >
                Ver vitrine pública
              </Link>
              <button
                type="button"
                onClick={() => void handleCopyProfessionalUrl()}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-brand-100 bg-surface px-4 text-sm font-bold text-brand-500"
              >
                <Copy size={14} />
                Copiar link
              </button>
              <button
                type="button"
                onClick={() => void handleShareProfessionalUrl()}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-brand-100 bg-surface px-4 text-sm font-bold text-brand-500"
              >
                <Share2 size={14} />
                Compartilhar
              </button>
            </>
          ) : null}
        </div>
      </section>

      <section className="rounded-[32px] border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-slate-400">
          <BriefcaseBusiness size={16} />
          Negócios
        </div>
        {professionalProfile.businesses.length > 0 ? (
          <div className="mt-4 space-y-3">
            {professionalProfile.businesses.map((business) => (
              <div key={business.id} className="flex items-start gap-4 rounded-[24px] border border-blue-100/70 bg-blue-50/40 p-4">
                <img
                  src={business.imageUrl || `https://picsum.photos/seed/${business.id}/160`}
                  alt={business.name}
                  className="h-20 w-20 rounded-2xl object-cover"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-bold text-foreground">{business.name}</p>
                      <p className="mt-1 text-sm text-slate-500">{business.category}</p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-slate-600 shadow-sm">
                      {formatBusinessStatus(business.status)}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-slate-500">{business.locationLabel || 'Sem região definida'}</p>
                  <p className="mt-1 text-xs text-slate-400">Atualizado em {formatDateTime(business.updatedAt)}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      href={business.publicPath}
                      className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-surface px-3 py-2 text-xs font-bold text-brand-500"
                    >
                      Ver página pública
                      <ExternalLink size={14} />
                    </Link>
                    {business.status === 'PUBLISHED' ? (
                      <Link
                        href={`/ads/promover/${business.id}`}
                        className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-3 py-2 text-xs font-bold text-white"
                      >
                        <Megaphone size={14} />
                        Promover com Ads
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center text-sm font-medium text-slate-500">
            Nenhum negócio vinculado ainda. Cadastre o primeiro gratuitamente para ativar sua vitrine profissional.
          </div>
        )}
      </section>

      <section className="rounded-[32px] border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-slate-400">
          <CalendarDays size={16} />
          Eventos profissionais
        </div>
        {professionalProfile.events.length > 0 ? (
          <div className="mt-4 space-y-3">
            {professionalProfile.events.map((event) => (
              <div key={event.id} className="flex items-start gap-4 rounded-[24px] border border-blue-100/70 bg-blue-50/40 p-4">
                <img
                  src={event.imageUrl || `https://picsum.photos/seed/${event.id}/160`}
                  alt={event.title}
                  className="h-20 w-20 rounded-2xl object-cover"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-bold text-foreground">{event.title}</p>
                      <p className="mt-1 text-sm text-slate-500">{event.locationLabel || 'Sem região definida'}</p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-slate-600 shadow-sm">
                      {formatEventStatus(event.status)}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-slate-500">Começa em {formatDateTime(event.startsAt)}</p>
                  <Link
                    href={event.publicPath}
                    className="mt-4 inline-flex items-center gap-2 rounded-full border border-brand-100 bg-surface px-3 py-2 text-xs font-bold text-brand-500"
                  >
                    Abrir evento
                    <ExternalLink size={14} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center text-sm font-medium text-slate-500">
            Nenhum evento criado ainda. Use esta área para acompanhar suas próximas publicações profissionais.
          </div>
        )}
      </section>
    </div>
  );
};

export default ProfessionalModePanel;
