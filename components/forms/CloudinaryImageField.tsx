'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ImageCropper, type ImageCropperHandle } from '@/components/ui/ImageCropper';
import { Modal } from '@/components/ui/Modal';
import { ImagePlus, LoaderCircle, Pencil, Trash2 } from 'lucide-react';
import { cloudinaryConfig, getCloudinaryFolderPath, isCloudinaryEnabled, type CloudinaryFolder } from '@/lib/cloudinary';
import { isValidHttpUrl } from '@/lib/url';
import FieldErrorMessage from './FieldErrorMessage';

type CloudinaryUploadResponse = {
  secure_url?: string;
  error?: {
    message?: string;
  };
};

type CloudinaryImageFieldProps = {
  value?: string;
  imageUrl?: string;
  onChange: (value: string) => void;
  folder: CloudinaryFolder;
  width?: React.CSSProperties['width'];
  height?: React.CSSProperties['height'];
  placeholder?: string;
  hint?: string;
  disabled?: boolean;
  error?: string | null;
  onClearError?: () => void;
  /** Se informado (largura/altura), permite ao usuário enquadrar a imagem antes de enviar. */
  cropAspect?: number;
};

const CloudinaryImageField: React.FC<CloudinaryImageFieldProps> = ({
  value,
  imageUrl,
  onChange,
  folder,
  width = '100%',
  height = 160,
  hint,
  disabled = false,
  error,
  onClearError,
  cropAspect,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const currentImageUrl = imageUrl ?? value ?? '';
  const cropperRef = useRef<ImageCropperHandle>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);

  const openFilePicker = () => {
    if (!isCloudinaryEnabled || disabled || uploading) {
      return;
    }

    fileInputRef.current?.click();
  };

  useEffect(() => {
    if (!pendingFile) {
      setPendingPreview(null);
      return;
    }
    const url = URL.createObjectURL(pendingFile);
    setPendingPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingFile]);

  /** Valida o arquivo; com `cropAspect`, abre o enquadramento antes de enviar. */
  const selectFile = (file?: File) => {
    if (!file || !isCloudinaryEnabled || disabled) {
      return;
    }

    const acceptedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
    if (!acceptedTypes.has(file.type)) {
      setUploadError('Use uma imagem JPG, PNG ou WebP.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError('A imagem deve ter no máximo 10 MB.');
      return;
    }

    setUploadError(null);
    if (cropAspect) {
      setPendingFile(file);
      return;
    }
    void uploadFile(file);
  };

  const confirmCrop = async () => {
    if (!pendingFile) return;
    try {
      const blob = await cropperRef.current?.crop();
      const file = blob ? new File([blob], 'recorte.jpg', { type: 'image/jpeg' }) : pendingFile;
      setPendingFile(null);
      await uploadFile(file);
    } catch (cropFailure) {
      setPendingFile(null);
      setUploadError(cropFailure instanceof Error ? cropFailure.message : 'Não foi possível processar a imagem.');
    }
  };

  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', cloudinaryConfig.uploadPreset);
    formData.append('folder', getCloudinaryFolderPath(folder));

    setUploading(true);
    setUploadError(null);

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudinaryConfig.cloudName)}/image/upload`,
        {
          method: 'POST',
          body: formData,
        },
      );
      const result = (await response.json()) as CloudinaryUploadResponse;

      if (!response.ok || !result.secure_url) {
        throw new Error(result.error?.message || 'Nao foi possivel enviar a imagem.');
      }

      onClearError?.();
      onChange(result.secure_url);
    } catch (uploadFailure) {
      setUploadError(
        uploadFailure instanceof Error
          ? uploadFailure.message
          : 'Nao foi possivel enviar a imagem.',
      );
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    selectFile(event.target.files?.[0]);
    event.target.value = '';
  };

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
        disabled={!isCloudinaryEnabled || disabled || uploading}
      />
      <div className="space-y-2">
        <button
          type="button"
          onClick={openFilePicker}
          disabled={!isCloudinaryEnabled || disabled || uploading}
          aria-label={currentImageUrl ? 'Alterar imagem' : 'Selecionar imagem'}
          aria-busy={uploading}
          onDragEnter={(event) => {
            event.preventDefault();
            if (!disabled && !uploading) setDragging(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            selectFile(event.dataTransfer.files?.[0]);
          }}
          style={{ width, height }}
          className={`group relative block max-w-full cursor-pointer overflow-hidden rounded-2xl border bg-slate-50 text-slate-600 outline-none transition focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${currentImageUrl ? 'border-slate-200' : 'border-dashed'} ${dragging ? 'border-brand-400 bg-brand-50' : currentImageUrl ? '' : 'border-slate-300 hover:border-brand-300'}`}
        >
          {currentImageUrl && isValidHttpUrl(currentImageUrl) ? (
            <img
              src={currentImageUrl}
              alt="Imagem atual"
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="flex h-full w-full flex-col items-center justify-center gap-2 px-4 text-sm font-bold">
              <ImagePlus size={24} />
              Escolher imagem
            </span>
          )}

          {currentImageUrl || uploading ? (
            <span className="absolute bottom-2 right-2 flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm transition group-hover:bg-black/70">
              {uploading ? <LoaderCircle size={14} className="animate-spin" /> : <Pencil size={14} />}
              {uploading ? 'Enviando...' : 'Alterar'}
            </span>
          ) : null}
        </button>

        {currentImageUrl && !disabled ? (
          <button
            type="button"
            onClick={() => onChange('')}
            className="inline-flex min-h-9 items-center gap-2 rounded-full border border-red-100 bg-red-50 px-3 text-xs font-bold text-red-700 transition hover:bg-red-100"
          >
            <Trash2 size={14} />
            Remover imagem
          </button>
        ) : null}

        <FieldErrorMessage message={error} />
      </div>
      <FieldErrorMessage message={uploadError} />
      {cropAspect ? (
        <Modal
          open={Boolean(pendingFile && pendingPreview)}
          onClose={() => setPendingFile(null)}
          title="Posicionar imagem"
          description="Arraste para enquadrar e use o zoom para ajustar."
          footer={
            <>
              <Button variant="secondary" onClick={() => setPendingFile(null)}>Cancelar</Button>
              <Button onClick={() => void confirmCrop()}>Usar imagem</Button>
            </>
          }
        >
          {pendingPreview ? <ImageCropper ref={cropperRef} src={pendingPreview} aspect={cropAspect} outputWidth={1600} /> : null}
        </Modal>
      ) : null}
      <p className="px-1 text-xs text-slate-500">
        {hint ||
          (isCloudinaryEnabled
            ? 'JPG, PNG ou WebP de até 10 MB.'
            : 'O envio de imagens está indisponível no momento.')}
      </p>
    </div>
  );
};

export default CloudinaryImageField;
