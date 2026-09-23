'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import { Bell, BriefcaseBusiness, Check, ChevronDown, ExternalLink, LogOut, Menu, Plus, Settings, Users } from 'lucide-react';
import { Avatar } from '@/components/ui';
import { useAdAccount } from '@/components/ads/AdAccountProvider';
import GringoouLogo from '@/components/icons/GringoouLogo';

type AdsTopbarProps = { onMenuToggle: () => void };

export function AdsTopbar({ onMenuToggle }: AdsTopbarProps) {
  const { data: session } = useSession();
  const { account, accounts, accountSwitchLocked, canCreateAccount, maxAccounts, selectAccount } = useAdAccount();
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const userName = session?.user?.name || 'Anunciante';
  const userEmail = session?.user?.email || 'Conta pessoal';
  const accountId = account?.id ?? session?.user?.id ?? '-';
  const triggerAvatar = account?.logoUrl || session?.user?.image || null;

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  async function changeAccount(accountIdToSelect: string) {
    await selectAccount(accountIdToSelect);
    setOpen(false);
  }

  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-slate-200 bg-white">
      <div className="flex h-[72px] items-center justify-between gap-4 px-4 md:justify-end md:px-7 md:pl-[calc(1.75rem+272px)]">
        <div className="flex items-center gap-3 md:hidden">
          <button type="button" onClick={onMenuToggle} aria-label="Abrir menu" className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-[#132f40]"><Menu size={21} /></button>
          <GringoouLogo size={28} />
        </div>
        <div className="flex items-center gap-3">
          <button type="button" aria-label="Notificacoes" className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"><Bell size={18} /></button>
          <div ref={menuRef} className="relative">
            <button type="button" aria-label="Abrir menu da conta" aria-expanded={open} onClick={() => setOpen((value) => !value)} className="flex items-center gap-2 rounded-full bg-slate-50 py-1 pl-1 pr-3 transition hover:bg-slate-100">
              <Avatar src={triggerAvatar} name={account?.name ?? userName} size="md" />
              <div className="hidden min-w-0 text-left sm:block"><strong className="block max-w-[180px] truncate text-sm text-[#132f40]">{account?.name ?? userName}</strong><span className="block max-w-[180px] truncate text-[11px] text-slate-400">Account ID: {accountId.slice(0, 10)}...</span></div>
              <ChevronDown size={16} className="text-slate-500" />
            </button>
            {open ? (
              <div className="absolute right-0 top-[calc(100%+10px)] w-[330px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-950/10">
                <div className="p-4"><p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Conectado como</p><div className="mt-3 flex items-center gap-3 rounded-xl p-2"><Avatar src={session?.user?.image} name={userName} size="md" /><span className="min-w-0 flex-1"><strong className="block truncate text-sm text-slate-900">{userName}</strong><span className="block truncate text-xs text-slate-500">{userEmail}</span></span></div></div>
                <div className="border-t border-slate-100 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Contas de negócio ({accounts.length})</p>
                  <div className="mt-2 space-y-1">{accounts.map((item) => (
                    <div key={item.id} className="flex items-center gap-1 rounded-xl p-1 hover:bg-brand-50">
                      <button type="button" disabled={accountSwitchLocked} onClick={() => void changeAccount(item.id)} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg p-2 text-left disabled:cursor-not-allowed disabled:opacity-50"><Avatar src={item.logoUrl} name={item.name} size="md" /><span className="min-w-0 flex-1"><strong className="block truncate text-sm text-slate-900">{item.name}</strong><span className="block truncate text-xs text-slate-500">Conta Ads · ID: {item.id.slice(0, 12)}...</span></span>{item.id === account?.id ? <Check size={18} className="shrink-0 text-brand-500" /> : <BriefcaseBusiness size={18} className="shrink-0 text-slate-300" />}</button>
                      {item.publicPath ? <Link href={item.publicPath} onClick={() => setOpen(false)} aria-label={`Abrir página pública de ${item.name}`} title="Abrir página pública" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-white hover:text-brand-600"><ExternalLink size={16} /></Link> : null}
                    </div>
                  ))}</div>
                  {accountSwitchLocked ? <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">Confirmando pagamento. A troca de conta foi pausada.</p> : null}
                  {!accountSwitchLocked && canCreateAccount ? (
                    <Link href="/ads/accounts/new" onClick={() => setOpen(false)} className="mt-3 flex items-center gap-2 rounded-xl border border-dashed border-brand-200 px-3 py-2.5 text-sm font-bold text-brand-600 hover:bg-brand-50"><Plus size={17} />Criar nova conta de negócio</Link>
                  ) : !accountSwitchLocked ? <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">Limite de {maxAccounts} contas atingido.</p> : null}
                </div>
                <div className="border-t border-slate-100 p-2">
                  <Link href="/ads/settings" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"><Settings size={17} />Configurações do negócio</Link>
                  <Link href="/inicio" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"><Users size={17} />Voltar à comunidade</Link>
                  <button type="button" onClick={() => void signOut({ callbackUrl: '/login' })} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"><LogOut size={17} />Sair</button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
