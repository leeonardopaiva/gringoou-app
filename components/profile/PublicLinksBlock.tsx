'use client';

import Link from 'next/link';
import { Copy, ExternalLink, Link2, Share2 } from 'lucide-react';
import { useToast } from '@/components/feedback/ToastProvider';

export type PublicLinkItem = {
  id: string;
  label: string;
  path: string;
};

export function PublicLinksBlock({ links }: { links: PublicLinkItem[] }) {
  const { showToast } = useToast();

  const absoluteUrl = (path: string) =>
    typeof window === 'undefined' ? path : new URL(path, window.location.origin).toString();

  const copy = async (item: PublicLinkItem) => {
    const url = absoluteUrl(item.path);
    try {
      await navigator.clipboard.writeText(url);
      showToast(`Link de ${item.label.toLowerCase()} copiado.`, 'success');
    } catch {
      showToast(url, 'info', 5000);
    }
  };

  const share = async (item: PublicLinkItem) => {
    const url = absoluteUrl(item.path);
    if (navigator.share) {
      try {
        await navigator.share({ title: item.label, url });
        return;
      } catch {
        return;
      }
    }
    await copy(item);
  };

  if (!links.length) return null;

  return (
    <section className="py-2">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          <Link2 size={17} />
        </span>
        <div>
          <h3 className="text-sm font-bold text-foreground">Links públicos</h3>
          <p className="text-xs text-slate-500">Abra, copie ou compartilhe suas páginas.</p>
        </div>
      </div>

      <div className="mt-4 divide-y divide-slate-100">
        {links.map((item) => (
          <div key={item.id} className="flex min-w-0 items-center gap-3 py-3 first:pt-0 last:pb-0">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-slate-800">{item.label}</p>
              <p className="truncate text-xs text-slate-400">{item.path}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Link href={item.path} title={`Abrir ${item.label}`} aria-label={`Abrir ${item.label}`} className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-brand-50 hover:text-brand-600">
                <ExternalLink size={16} />
              </Link>
              <button type="button" title={`Copiar link de ${item.label}`} aria-label={`Copiar link de ${item.label}`} onClick={() => void copy(item)} className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-brand-50 hover:text-brand-600">
                <Copy size={16} />
              </button>
              <button type="button" title={`Compartilhar ${item.label}`} aria-label={`Compartilhar ${item.label}`} onClick={() => void share(item)} className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-brand-50 hover:text-brand-600">
                <Share2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
