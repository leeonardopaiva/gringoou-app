'use client';

import { useEffect } from 'react';
import { captureUtmFromLocation } from '@/lib/utm-capture';

/** Registra os utm_* da URL de chegada (qualquer página, logado ou não). Não renderiza nada. */
export default function UtmCapture() {
  useEffect(() => {
    captureUtmFromLocation();
  }, []);
  return null;
}
