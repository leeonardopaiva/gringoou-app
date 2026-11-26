'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { useLanguage } from '@/components/i18n/LanguageProvider';

type ImageLightboxProps = {
  open: boolean;
  src: string;
  alt: string;
  onClose: () => void;
};

export function ImageLightbox({ open, src, alt, onClose }: ImageLightboxProps) {
  const { tx } = useLanguage();
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={tx('Imagem ampliada')}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-scrim/95 p-3 sm:p-6"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
        aria-label={tx('Fechar imagem ampliada')}
      >
        <X size={24} />
      </button>
      <img
        src={src}
        alt={alt}
        className="h-full w-full object-contain"
        onClick={(event) => event.stopPropagation()}
      />
    </div>
  );
}
