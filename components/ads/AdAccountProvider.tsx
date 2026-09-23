'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

export type AdAccountSummary = {
  id: string;
  name: string;
  logoUrl: string | null;
  country: string;
  currency: string;
  timezone: string;
  businessId: string | null;
  publicPath: string | null;
  businessStatus: 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'REJECTED' | 'SUSPENDED' | null;
  role: 'BUSINESS_ADMIN' | 'ADMIN' | 'EDITOR' | 'VIEWER';
};

type AdAccountContextValue = {
  accounts: AdAccountSummary[];
  account: AdAccountSummary | null;
  maxAccounts: number;
  canCreateAccount: boolean;
  accountSwitchLocked: boolean;
  loading: boolean;
  setAccountSwitchLocked: (locked: boolean) => void;
  refreshAccounts: () => Promise<void>;
  selectAccount: (accountId: string) => Promise<void>;
};

const AdAccountContext = createContext<AdAccountContextValue | null>(null);

export function AdAccountProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { status } = useSession();
  const [accounts, setAccounts] = useState<AdAccountSummary[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [maxAccounts, setMaxAccounts] = useState(3);
  const [accountSwitchLocked, setAccountSwitchLocked] = useState(false);
  const [loading, setLoading] = useState(true);

  const refreshAccounts = useCallback(async () => {
    if (status !== 'authenticated') {
      setAccounts([]);
      setSelectedAccountId(null);
      setLoading(status === 'loading');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/api/ads/accounts', { cache: 'no-store' });
      if (!response.ok) throw new Error('Falha ao carregar contas comerciais.');
      const payload = await response.json();
      setAccounts(payload.accounts ?? []);
      setSelectedAccountId(payload.selectedAccountId ?? null);
      setMaxAccounts(payload.maxAccounts ?? 3);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void refreshAccounts();
  }, [refreshAccounts]);

  const selectAccount = useCallback(async (accountId: string) => {
    if (accountSwitchLocked) throw new Error('Aguarde a confirmacao do pagamento antes de trocar de conta.');
    const response = await fetch('/api/ads/accounts/select', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adAccountId: accountId }),
    });
    if (!response.ok) throw new Error('Nao foi possivel trocar a conta comercial.');
    setSelectedAccountId(accountId);
    router.refresh();
  }, [accountSwitchLocked, router]);

  const value = useMemo<AdAccountContextValue>(() => ({
    accounts,
    account: accounts.find((item) => item.id === selectedAccountId) ?? accounts[0] ?? null,
    maxAccounts,
    canCreateAccount: accounts.length < maxAccounts,
    accountSwitchLocked,
    loading,
    setAccountSwitchLocked,
    refreshAccounts,
    selectAccount,
  }), [accountSwitchLocked, accounts, loading, maxAccounts, refreshAccounts, selectAccount, selectedAccountId]);

  return <AdAccountContext.Provider value={value}>{children}</AdAccountContext.Provider>;
}

export function useAdAccount() {
  const context = useContext(AdAccountContext);
  if (!context) throw new Error('useAdAccount deve ser usado dentro de AdAccountProvider.');
  return context;
}
