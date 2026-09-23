'use client';

import React from 'react';
import { Images, Plus, Trash2 } from 'lucide-react';
import type { CloudinaryFolder } from '@/lib/cloudinary';
import CloudinaryImageField from './CloudinaryImageField';

type ImageGalleryFieldProps = {
  value: string[];
  onChange: (value: string[]) => void;
  folder: CloudinaryFolder;
  maxItems?: number;
  hint?: string;
  disabled?: boolean;
};

const ImageGalleryField: React.FC<ImageGalleryFieldProps> = ({
  value,
  onChange,
  folder,
  maxItems = 8,
  hint,
  disabled = false,
}) => {
  const gallery = value.length > 0 ? value : [''];

  const updateItem = (index: number, nextValue: string) => {
    const nextGallery = gallery.map((currentValue, currentIndex) =>
      currentIndex === index ? nextValue : currentValue,
    );
    onChange(nextGallery);
  };

  const removeItem = (index: number) => {
    const nextGallery = gallery.filter((_, currentIndex) => currentIndex !== index);
    onChange(nextGallery);
  };

  const addItem = () => {
    if (gallery.length >= maxItems) {
      return;
    }

    onChange([...gallery, '']);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 text-sm font-bold text-brand-500">
            <Images size={16} />
            Galeria de imagens
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {hint || `Adicione ate ${maxItems} imagens extras para destacar o negocio.`}
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-500">
          {Math.min(value.filter(Boolean).length, maxItems)}/{maxItems}
        </span>
      </div>

      <div className="space-y-4">
        {gallery.map((imageUrl, index) => (
          <div key={`${folder}-${index}`} className="space-y-2 border-b border-slate-100 pb-4 last:border-b-0">
            <CloudinaryImageField
              value={imageUrl}
              onChange={(nextValue) => updateItem(index, nextValue)}
              folder={folder}
              placeholder={`Imagem ${index + 1} da galeria`}
              disabled={disabled}
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => removeItem(index)}
                disabled={disabled || gallery.length === 1}
                className="inline-flex items-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 disabled:opacity-50"
              >
                <Trash2 size={14} />
                Remover
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addItem}
        disabled={disabled || gallery.length >= maxItems}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
      >
        <Plus size={16} />
        Adicionar imagem
      </button>
    </div>
  );
};

export default ImageGalleryField;
