'use client';

import { useEffect, useState } from 'react';

let cached: Promise<boolean> | null = null;

/** Indica se a pessoa logada é administradora raiz (consulta o servidor uma vez por carregamento). */
export function useRootAdmin() {
  const [root, setRoot] = useState<boolean | null>(null);
  useEffect(() => {
    let ignore = false;
    cached ??= fetch('/api/admin/root-status', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : { root: false }))
      .then((payload) => Boolean(payload?.root))
      .catch(() => false);
    void cached.then((value) => { if (!ignore) setRoot(value); });
    return () => { ignore = true; };
  }, []);
  return root;
}
