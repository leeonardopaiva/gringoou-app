'use client';

import React, { useRef, useState } from 'react';
import { Camera, LoaderCircle } from 'lucide-react';
import { cloudinaryConfig, getCloudinaryFolderPath, isCloudinaryEnabled, type CloudinaryFolder } from '@/lib/cloudinary';
import { useToast } from '@/components/feedback/ToastProvider';
import { cn } from '@/lib/cn';

type ImageUploadButtonProps = {
  folder: CloudinaryFolder;
  /** Recebe o endereço da imagem enviada; deve salvar e devolver erro (texto) se falhar. */
  onUploaded: (url: string) => Promise<string | null | void> | string | null | void;
  label?: string;
  className?: string;
  size?: 'sm' | 'md';
};

/**
 * Ícone pequeno e translúcido para trocar foto/capa direto sobre a imagem (como LinkedIn/Facebook):
 * abre o seletor de arquivo, envia e entrega o endereço. Posicione-o com `className` (absolute + canto).
 */
export const ImageUploadButton: React.FC<ImageUploadButtonProps> = ({ folder, onUploaded, label = 'Atualizar imagem', className, size = 'md' }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const { showToast } = useToast();

  if (!isCloudinaryEnabled) return null;

  const handleFile = async (file?: File) => {
    if (!file || busy) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      showToast('Use uma imagem JPG, PNG ou WebP.', 'error');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast('A imagem deve ter no máximo 10 MB.', 'error');
      return;
    }
    setBusy(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', cloudinaryConfig.uploadPreset);
      formData.append('folder', getCloudinaryFolderPath(folder));
      const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudinaryConfig.cloudName)}/image/upload`, { method: 'POST', body: formData });
      const result = (await response.json()) as { secure_url?: string; error?: { message?: string } };
      if (!response.ok || !result.secure_url) throw new Error(result.error?.message || 'Não foi possível enviar a imagem.');
      const error = await onUploaded(result.secure_url);
      if (typeof error === 'string' && error) showToast(error, 'error');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Não foi possível enviar a imagem.', 'error');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        aria-label={label}
        title={label}
        className={cn(
          'z-10 flex items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/60 disabled:cursor-wait',
          size === 'sm' ? 'h-7 w-7' : 'h-9 w-9',
          className,
        )}
      >
        {busy ? <LoaderCircle size={size === 'sm' ? 14 : 17} className="animate-spin" /> : <Camera size={size === 'sm' ? 14 : 17} />}
      </button>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => void handleFile(event.target.files?.[0])} />
    </>
  );
};

export default ImageUploadButton;
