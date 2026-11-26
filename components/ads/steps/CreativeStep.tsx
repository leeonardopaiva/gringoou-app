'use client';

import CloudinaryImageField from '@/components/forms/CloudinaryImageField';
import { formatInternationalPhone } from '@/lib/phone';
import { Badge, Button, Card, Input, Select, Textarea } from '@/components/ui';
import type { AdWizardData } from '@/lib/ads/validation';
import type { AdFieldErrors, PatchAdWizard } from '../types';
import { useLanguage } from '@/components/i18n/LanguageProvider';

const CTA_OPTIONS = ['Saiba mais', 'Fale conosco', 'Comprar agora', 'Ver oferta', 'Participar'];

export function CreativeStep({ state, errors, patch }: { state: AdWizardData; errors: AdFieldErrors; patch: PatchAdWizard }) {
  const { tx } = useLanguage();
  const destinationLabel = state.goal === 'WHATSAPP' ? 'WhatsApp com DDI' : state.goal === 'MARKETPLACE' ? 'ID do item' : 'URL de destino';

  return (
    <div>
      <div className="mb-5 flex items-center gap-3"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#078cf5] text-xs font-bold text-white">2</span><h2 className="text-[17px] font-extrabold text-ink-4">{tx('Criativo & Preview')}</h2></div>
      <div className="grid gap-6 lg:grid-cols-[1fr_230px]">
      <Card className="space-y-5 border border-slate-200 p-6 shadow-xs">
        <label className="block space-y-2"><span className="text-body-sm font-bold">{tx('Título')}</span><Input value={state.headline} maxLength={70} onChange={(event) => patch({ headline: event.target.value })} state={errors.headline ? 'error' : 'default'} helperText={errors.headline ?? `${state.headline.length}/70 caracteres`} /></label>
        <label className="block space-y-2"><span className="text-body-sm font-bold">{tx('Descrição')}</span><Textarea value={state.description} maxLength={600} onChange={(event) => patch({ description: event.target.value })} state={errors.description ? 'error' : 'default'} helperText={errors.description ?? `${state.description.length}/600 caracteres`} /></label>
        <div><span className="mb-2 block text-body-sm font-bold">{tx('Imagem')}</span><CloudinaryImageField value={state.imageUrl} onChange={(imageUrl) => patch({ imageUrl })} folder="banners" cropAspect={4 / 3} height={220} error={errors.imageUrl} /></div>
        <label className="block space-y-2"><span className="text-body-sm font-bold">{tx('Chamada para ação')}</span><Select value={state.ctaLabel} onChange={(event) => patch({ ctaLabel: event.target.value })}>{CTA_OPTIONS.map((cta) => <option key={cta}>{cta}</option>)}</Select></label>
        <label className="block space-y-2"><span className="text-body-sm font-bold">{destinationLabel}</span><Input value={state.destination} {...(state.goal === 'WHATSAPP' ? { type: 'tel' as const, inputMode: 'tel' as const, maxLength: 24 } : {})} placeholder={state.goal === 'WHATSAPP' ? '+1 (555) 123-4567' : state.goal === 'EXTERNAL_URL' ? 'https://seusite.com' : tx('ID do item no marketplace')} onChange={(event) => patch({ destination: state.goal === 'WHATSAPP' ? formatInternationalPhone(event.target.value) : event.target.value })} state={errors.destination ? 'error' : 'default'} helperText={errors.destination} /></label>
      </Card>
      <div className="lg:sticky lg:top-8 lg:self-start">
        <p className="mb-3 text-center text-[9px] font-extrabold uppercase tracking-wide text-slate-400">{tx('Preview no app')}</p>
        <div className="mx-auto max-w-[220px] rounded-[2rem] bg-[#102f40] p-2 shadow-xl">
          <Card className="rounded-[1.5rem] p-3" aria-label={tx('Preview do anúncio')}>
            <Badge tone="neutro">{tx('Patrocinado')}</Badge>
            <div className="mt-4 aspect-[4/3] overflow-hidden rounded-2xl bg-brand-100">{state.imageUrl ? <img src={state.imageUrl} alt={tx('Preview do anúncio')} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-body-sm text-muted-foreground">{tx('Sua imagem aparecera aqui')}</div>}</div>
            <Card.Title className="mt-4">{state.headline || tx('Título do seu anúncio')}</Card.Title>
            <Card.Description className="mt-2 whitespace-pre-wrap">{state.description || tx('A descrição do anúncio aparecera neste espaco.')}</Card.Description>
            <Button className="mt-5" fullWidth>{state.ctaLabel}</Button>
          </Card>
        </div>
        <p className="mx-auto mt-3 max-w-[190px] text-center text-[9px] leading-relaxed text-slate-400">{tx('Assim o anúncio aparecera no feed dos usuários')}</p>
      </div>
      </div>
    </div>
  );
}
