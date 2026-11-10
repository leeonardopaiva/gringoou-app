'use client';

import { useEffect, useState } from 'react';

let cached: Promise<boolean> | null = null;

/** Indica se a pessoa logada pode gerenciar UTM (administrador ou com a permissão dedicada). Consulta o servidor uma vez. */
export function useUtmAccess() {
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    let ignore = false;
    cached ??= fetch('/api/admin/utm', { cache: 'no-store' }).then((response) => response.ok).catch(() => false);
    void cached.then((value) => { if (!ignore) setAllowed(value); });
    return () => { ignore = true; };
  }, []);
  return allowed;
}
