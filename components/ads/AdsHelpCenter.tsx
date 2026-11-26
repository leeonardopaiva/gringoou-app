'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Search } from 'lucide-react';
import { useLanguage } from '@/components/i18n/LanguageProvider';

const sections = [
  { title: 'Top articles', articles: ['Como criar sua conta comercial', 'Especificações de criativos', 'Primeiros passos para anunciar'] },
  { title: 'Gestão de Contas', articles: ['Editar dados da empresa', 'Convidar usuários e definir roles', 'Alternar entre contas comerciais'] },
  { title: 'Formatos de Anúncios', articles: ['Campanhas para WhatsApp', 'Campanhas para URL externa', 'Promover Marketplace e Moradia'] },
  { title: 'Segmentação', articles: ['Selecionar uma região', 'Como funciona a prioridade dos planos', 'Boas práticas de alcance local'] },
  { title: 'Faturamento e Pagamentos', articles: ['Pagamento seguro com Stripe', 'Status de pagamento e moderação', 'Reembolsos e campanhas pausadas'] },
];
const frequent = ['best practices', 'billing', 'campaigns', 'getting started'];

export function AdsHelpCenter() {
  const { tx } = useLanguage();
  const [query, setQuery] = useState('');
  const normalized = query.trim().toLowerCase();
  const filtered = useMemo(() => sections.map((section) => ({ ...section, articles: section.articles.filter((article) => !normalized || article.toLowerCase().includes(normalized) || section.title.toLowerCase().includes(normalized)) })).filter((section) => section.articles.length), [normalized]);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <section className="relative overflow-hidden rounded-[32px] bg-[#12364a] bg-[linear-gradient(90deg,rgba(10,43,65,.94),rgba(0,125,235,.68)),url('/landing/hero.jpg')] bg-cover bg-center px-6 py-16 text-center shadow-sm sm:px-12">
        <h1 className="text-3xl font-extrabold text-white sm:text-4xl">{tx('Como podemos ajudar?')}</h1>
        <div className="mx-auto mt-7 flex max-w-2xl items-center gap-3 rounded-full bg-surface px-5 shadow-xl"><Search className="text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={tx('Buscar na ajuda...')} className="h-14 w-full bg-transparent text-sm text-ink-2 outline-none placeholder:text-slate-400" /></div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
        <div className="space-y-3">
          {filtered.length ? filtered.map((section, index) => (
            <details key={section.title} open={index === 0} className="group rounded-2xl border border-slate-200 bg-surface p-5 shadow-sm">
              <summary className="flex cursor-pointer list-none items-center justify-between text-base font-extrabold text-ink">{section.title}<ChevronDown className="text-slate-400 transition group-open:rotate-180" size={18} /></summary>
              <div className="mt-4 divide-y divide-slate-100">{section.articles.map((article) => <button key={article} type="button" className="block w-full py-3 text-left text-sm font-medium text-slate-600 hover:text-brand-600">{article}</button>)}</div>
            </details>
          )) : <div className="rounded-2xl border border-slate-200 bg-surface p-8 text-center text-sm text-slate-500">{tx('Nenhum artigo encontrado.')}</div>}
        </div>
        <aside className="self-start rounded-3xl border border-slate-200 bg-surface p-6 shadow-sm lg:sticky lg:top-24"><h2 className="text-lg font-extrabold text-ink">{tx('Buscas frequentes')}</h2><div className="mt-5 flex flex-wrap gap-2">{frequent.map((item) => <button key={item} type="button" onClick={() => setQuery(item)} className="rounded-full bg-brand-50 px-3 py-2 text-xs font-bold text-brand-700 hover:bg-brand-100">{item}</button>)}</div><p className="mt-7 text-sm leading-6 text-slate-500">{tx('Ainda precisa de ajuda? Nossa equipe pode orientar sobre campanhas, criativos e faturamento.')}</p><a href="mailto:ads@gringoou.com" className="mt-4 inline-flex text-sm font-bold text-brand-600">{tx('Falar com o suporte')}</a></aside>
      </div>

      <footer className="grid gap-6 rounded-3xl bg-navy p-8 text-white sm:grid-cols-3"><div><p className="font-extrabold">{tx('Documentação')}</p><Link href="/ads/wizard" className="mt-3 block text-sm text-white/70">{tx('Criar campanha')}</Link><Link href="/ads/reports" className="mt-2 block text-sm text-white/70">{tx('Relatórios')}</Link></div><div><p className="font-extrabold">{tx('Conta')}</p><Link href="/ads/settings" className="mt-3 block text-sm text-white/70">{tx('Configurações')}</Link><Link href="/terms" className="mt-2 block text-sm text-white/70">{tx('Termos de Uso')}</Link></div><div><p className="font-extrabold">{tx('Suporte')}</p><a href="mailto:ads@gringoou.com" className="mt-3 block text-sm text-white/70">{tx('ads@gringoou.com')}</a><Link href="/privacy" className="mt-2 block text-sm text-white/70">{tx('Privacidade')}</Link></div></footer>
    </div>
  );
}
