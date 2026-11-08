'use client';

import { InfoTip } from '@/components/ui/InfoTip';
import React, { useEffect, useState } from 'react';
import { Eye, KeyRound, Mail, Plus, Save, Trash2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { useToast } from '../feedback/ToastProvider';

type SavedTemplate = {
  id: string;
  name: string;
  html: string;
  updatedAt: string;
};

const STORAGE_KEY = 'gringoou_marketing_templates';
const SETTINGS_KEY = 'gringoou_marketing_settings';

const DEFAULT_TEMPLATE = `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f4f6fb;color:#0f2b63;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:24px;">
      <tr><td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;">
          <tr><td style="background:#0086ff;padding:24px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;">Gringoou</h1>
          </td></tr>
          <tr><td style="padding:32px;">
            <h2 style="margin:0 0 12px;font-size:18px;">Olá!</h2>
            <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#4a5672;">
              Cole aqui o conteúdo do seu e-mail de marketing.
            </p>
            <a href="#" style="display:inline-block;background:#0086ff;color:#ffffff;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:bold;">
              Saiba mais
            </a>
          </td></tr>
          <tr><td style="padding:16px 32px;text-align:center;color:#8a94a8;font-size:12px;">
            Voce esta recebendo este e-mail porque faz parte da comunidade Gringoou.
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

const MarketingSection: React.FC = () => {
  const { showToast } = useToast();
  const [templates, setTemplates] = useState<SavedTemplate[]>([]);
  const [name, setName] = useState('');
  const [html, setHtml] = useState(DEFAULT_TEMPLATE);
  const [preview, setPreview] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [provider, setProvider] = useState('resend');
  const [apiKey, setApiKey] = useState('');
  const [fromEmail, setFromEmail] = useState('');

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) setTemplates(JSON.parse(stored));
      const settings = window.localStorage.getItem(SETTINGS_KEY);
      if (settings) {
        const parsed = JSON.parse(settings);
        setProvider(parsed.provider ?? 'resend');
        setApiKey(parsed.apiKey ?? '');
        setFromEmail(parsed.fromEmail ?? '');
      }
    } catch {
      setTemplates([]);
    }
  }, []);

  const saveSettings = () => {
    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify({ provider, apiKey, fromEmail }));
      showToast('Configuração do serviço de e-mail salva.', 'success');
    } catch {
      showToast('Não foi possível salvar a configuração.', 'error');
    }
  };

  const persist = (next: SavedTemplate[]) => {
    setTemplates(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // storage indisponível
    }
  };

  const saveTemplate = () => {
    if (!name.trim()) {
      showToast('Informe um nome para o template.', 'error');
      return;
    }
    const now = new Date().toISOString();
    if (selectedId) {
      persist(templates.map((t) => (t.id === selectedId ? { ...t, name: name.trim(), html, updatedAt: now } : t)));
      showToast('Template atualizado.', 'success');
    } else {
      persist([{ id: crypto.randomUUID(), name: name.trim(), html, updatedAt: now }, ...templates]);
      showToast('Template salvo.', 'success');
    }
    setSelectedId(null);
    setName('');
  };

  const loadTemplate = (template: SavedTemplate) => {
    setSelectedId(template.id);
    setName(template.name);
    setHtml(template.html);
    setPreview(false);
  };

  const deleteTemplate = (id: string) => {
    persist(templates.filter((t) => t.id !== id));
    if (selectedId === id) {
      setSelectedId(null);
      setName('');
      setHtml(DEFAULT_TEMPLATE);
    }
    showToast('Template removido.', 'success');
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-5 sm:p-8">
      <div>
        <h1 className="flex items-center gap-1.5 text-2xl font-extrabold tracking-tight text-[#132F40]">E-mail marketing<InfoTip text="Crie e edite templates de e-mail. O envio em massa exige um serviço de e-mail transacional." /></h1>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <KeyRound size={16} className="text-brand-500" />
          <h2 className="text-sm font-bold text-slate-700">Serviço de e-mail (envio em massa)</h2>
        </div>
        <p className="mt-1 text-xs text-slate-400">
          Configure o provedor e a chave de API. Em produção, recomenda-se armazenar a chave no servidor (variável de ambiente).
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">Provedor</label>
            <select
              value={provider}
              onChange={(event) => setProvider(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
            >
              <option value="resend">Resend</option>
              <option value="sendgrid">SendGrid</option>
              <option value="ses">Amazon SES</option>
              <option value="nodemailer">SMTP (Nodemailer)</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder="chave da API"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">E-mail remetente</label>
            <input
              type="email"
              value={fromEmail}
              onChange={(event) => setFromEmail(event.target.value)}
              placeholder="no-reply@gringoou.com"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
            />
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <Button size="sm" iconLeft={<Save size={15} />} onClick={saveSettings}>
            Salvar configuração
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-700">Templates salvos</h2>
            <Button size="xs" variant="ghost" iconLeft={<Plus size={14} />} onClick={() => { setSelectedId(null); setName(''); setHtml(DEFAULT_TEMPLATE); setPreview(false); }}>
              Novo
            </Button>
          </div>
          {templates.length === 0 ? (
            <EmptyState icon={<Mail size={24} />} title="Nenhum template" description="Crie um template de e-mail para começar." />
          ) : (
            <ul className="space-y-2">
              {templates.map((template) => (
                <li key={template.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-white px-3 py-2">
                  <button type="button" onClick={() => loadTemplate(template)} className="min-w-0 flex-1 text-left">
                    <p className="truncate text-sm font-semibold text-slate-700">{template.name}</p>
                    <p className="text-xs text-slate-400">{new Date(template.updatedAt).toLocaleDateString('pt-BR')}</p>
                  </button>
                  <button type="button" onClick={() => deleteTemplate(template.id)} aria-label="Excluir template" className="ml-2 text-slate-400 hover:text-red-600">
                    <Trash2 size={15} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Nome do template"
              className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
            />
            <div className="flex gap-2">
              <Button variant="secondary" iconLeft={<Eye size={15} />} onClick={() => setPreview((current) => !current)}>
                {preview ? 'Editar' : 'Prévia'}
              </Button>
              <Button iconLeft={<Save size={15} />} onClick={saveTemplate}>
                Salvar
              </Button>
            </div>
          </div>

          {preview ? (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <iframe title="Prévia do e-mail" sandbox="" srcDoc={html} className="h-[560px] w-full" />
            </div>
          ) : (
            <textarea
              value={html}
              onChange={(event) => setHtml(event.target.value)}
              spellCheck={false}
              className="h-[560px] w-full rounded-2xl border border-slate-200 bg-white p-4 font-mono text-xs text-slate-700 focus:border-brand-300 focus:outline-none"
            />
          )}

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <p className="font-bold">Envio em massa</p>
            <p className="mt-1">
              O envio de campanhas requer um serviço de e-mail transacional/bulk (ex.: Resend, SendGrid, Amazon SES).
              Nenhum serviço de envio em massa está integrado ainda. Este editor salva os templates localmente para
              revisão e homologação.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketingSection;