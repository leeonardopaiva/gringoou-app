'use client';

import { useEffect, useState } from 'react';
import type { AdPlanInfo } from '@/lib/ads/plans';

/** Pacotes de anúncios vigentes (valores salvos no painel raiz). Vazio enquanto carrega. */
export function useAdPlans() {
  const [plans, setPlans] = useState<AdPlanInfo[] | null>(null);
  useEffect(() => {
    let ignore = false;
    void fetch('/api/ads/plans', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : { plans: [] }))
      .then((payload) => { if (!ignore) setPlans(Array.isArray(payload.plans) ? payload.plans : []); })
      .catch(() => { if (!ignore) setPlans([]); });
    return () => { ignore = true; };
  }, []);
  return plans;
}
