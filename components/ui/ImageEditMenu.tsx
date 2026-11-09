'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Camera, Eye, ImagePlus, LoaderCircle, Save } from 'lucide-react';
import { cloudinaryConfig, getCloudinaryFolderPath, isCloudinaryEnabled, type CloudinaryFolder } from '@/lib/cloudinary';
import { useToast } from '@/components/feedback/ToastProvider';
import { ImageLightbox } from '@/components/community/ImageLightbox';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/cn';

type ImageEditMenuProps = {
  folder: CloudinaryFolder;
  /** Imagem atual (para "Ver" e para a prévia). */
  src?: string | null;
  kind?: 'cover' | 'avatar';
  /** Recebe o endereço da nova imagem; devolva um texto para mostrar erro. */
  onUploaded: (url: string) => Promise<string | null | void> | string | null | void;
  className?: string;
};

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Edição de foto/capa no padrão das grandes redes: um gatilho discreto sobre a imagem abre um menu
 * (Ver / Alterar). "Alterar" abre uma janela com título, área para escolher a imagem (no celular
 * oferece galeria/câmera) e botão Salvar.
 */
export const ImageEditMenu: React.FC<ImageEditMenuProps> = ({ folder, src, kind = 'cover', onUploaded, className }) => {
  const { showToast } = useToast();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [viewing, setViewing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState(false);
  const isCover = kind === 'cover';
  const noun = isCover ? 'capa' : 'foto';

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  if (!isCloudinaryEnabled) return null;

  const closeEditor = () => {
    if (saving) return;
    setEditing(false);
    setFile(null);
  };

  const pick = (candidate?: File | null) => {
    if (!candidate) return;
    if (!ACCEPTED.includes(candidate.type)) {
      showToast('Use uma imagem JPG, PNG ou WebP.', 'error');
      return;
    }
    if (candidate.size > 10 * 1024 * 1024) {
      showToast('A imagem deve ter no máximo 10 MB.', 'error');
      return;
    }
    setFile(candidate);
  };

  const save = async () => {
    if (!file || saving) return;
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', cloudinaryConfig.uploadPreset);
      formData.append('folder', getCloudinaryFolderPath(folder));
      const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudinaryConfig.cloudName)}/image/upload`, { method: 'POST', body: formData });
      const result = (await response.json()) as { secure_url?: string; error?: { message?: string } };
      if (!response.ok || !result.secure_url) throw new Error(result.error?.message || 'Não foi possível enviar a imagem.');
      const error = await onUploaded(result.secure_url);
      if (typeof error === 'string' && error) {
        showToast(error, 'error');
        return;
      }
      setEditing(false);
      setFile(null);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Não foi possível enviar a imagem.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const shownImage = preview || src || null;

  return (
    <div ref={rootRef} className={cn('absolute z-10', className)}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((value) => !value)}
        aria-label={isCover ? 'Editar capa' : 'Editar foto'}
        className={cn(
          'flex items-center justify-center gap-1.5 bg-black/45 text-white backdrop-blur-sm transition hover:bg-black/65',
          isCover ? 'h-9 rounded-full px-3 text-xs font-semibold' : 'h-8 w-8 rounded-full',
        )}
      >
        <Camera size={isCover ? 16 : 15} />
        {isCover ? <span className="hidden sm:inline">Editar capa</span> : null}
      </button>
      {menuOpen ? (
        <div role="menu" className={cn('absolute bottom-full mb-2 w-52 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-lg', isCover ? 'right-0' : 'left-0')}>
          {src ? (
            <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); setViewing(true); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-800 hover:bg-slate-50">
              <Eye size={17} className="text-slate-500" /> Ver {noun}
            </button>
          ) : null}
          <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); setEditing(true); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-800 hover:bg-slate-50">
            <ImagePlus size={17} className="text-slate-500" /> Alterar {noun}
          </button>
        </div>
      ) : null}

      {src ? <ImageLightbox open={viewing} onClose={() => setViewing(false)} src={src} alt={isCover ? 'Capa' : 'Foto'} /> : null}

      <Modal
        open={editing}
        onClose={closeEditor}
        className={cn('!p-0 overflow-hidden sm:max-w-md sm:!p-0', '[&>div]:pr-0 [&>button]:bg-black/40 [&>button]:text-white [&>button:hover]:bg-black/60 [&>button:hover]:text-white')}
      >
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => { pick(event.target.files?.[0]); event.target.value = ''; }} />
        <div
          className={cn('relative w-full overflow-hidden bg-slate-100', isCover ? 'aspect-[16/10]' : 'aspect-square')}
          onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => { event.preventDefault(); setDragging(false); pick(event.dataTransfer.files?.[0]); }}
        >
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            aria-label={file ? 'Escolher outra imagem' : 'Escolher imagem'}
            className={cn('absolute inset-0 flex items-center justify-center transition', dragging ? 'bg-brand-50' : 'hover:bg-slate-200/60')}
          >
            {shownImage ? <img src={shownImage} alt="" className="h-full w-full object-cover" /> : <ImagePlus size={34} className="text-slate-400" />}
          </button>
          <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/40 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
            {isCover ? 'Editar capa' : 'Editar foto'}
          </span>
          <button
            type="button"
            onClick={() => void save()}
            disabled={!file || saving}
            aria-label="Salvar"
            title="Salvar"
            className="absolute bottom-3 right-3 flex h-11 w-11 items-center justify-center rounded-full bg-brand-500 text-white shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? <LoaderCircle size={19} className="animate-spin" /> : <Save size={19} />}
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default ImageEditMenu;
