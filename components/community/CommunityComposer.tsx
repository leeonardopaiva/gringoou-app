import React from 'react';
import Link from 'next/link';
import { BriefcaseBusiness, Camera, Check, Link as LinkIcon, MoreHorizontal, Play, UserRound } from 'lucide-react';
import CloudinaryImageField from '@/components/forms/CloudinaryImageField';
import type { ComposerMode } from '@/components/community/utils';
import { handleAvatarError } from '@/lib/avatar';
import type { PersonaMode } from '@/types';
import { Button } from '@/components/ui/Button';
import { CharacterCounter } from '@/components/ui/CharacterCounter';

export const COMMUNITY_POST_MAX_LENGTH = 600;

type RootProps = {
  children: React.ReactNode;
};

type EditorProps = {
  avatar: string;
  avatarHref?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
};

type AuthorSwitchProps = {
  value: PersonaMode;
  onChange: (value: PersonaMode) => void;
  personalName: string;
  professionalName?: string | null;
  professionalDisabled?: boolean;
};

type MediaFieldProps = {
  mode: ComposerMode;
  imageUrl: string;
  externalUrl: string;
  onImageChange: (value: string) => void;
  onExternalChange: (value: string) => void;
};

type ActionsProps = {
  mode: ComposerMode;
  onModeChange: (mode: ComposerMode) => void;
  onPublish: () => void;
};

type ModeButtonProps = {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
};

const Root: React.FC<RootProps> = ({ children }) => (
  <div className="space-y-3 rounded-[20px] border border-slate-200 bg-white p-3 shadow-sm">
    {children}
  </div>
);

const Editor: React.FC<EditorProps> = ({ avatar, avatarHref, value, onChange, placeholder }) => (
  <div className="flex items-center gap-3">
    {avatarHref ? (
      <Link href={avatarHref} className="transition hover:opacity-90">
        <img src={avatar} className="h-9 w-9 rounded-full object-cover" alt="User" onError={handleAvatarError} />
      </Link>
    ) : (
      <img src={avatar} className="h-9 w-9 rounded-full object-cover" alt="User" onError={handleAvatarError} />
    )}
    <div className="min-w-0 flex-1">
      <textarea
        rows={1}
        value={value}
        maxLength={COMMUNITY_POST_MAX_LENGTH}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="min-h-11 w-full resize-none rounded-full border-none bg-slate-100 px-4 py-3 text-sm text-foreground outline-none transition focus:bg-white focus:ring-2 focus:ring-brand-200"
      />
      {value ? <div className="mt-1 flex justify-end px-1">
        <CharacterCounter current={value.length} max={COMMUNITY_POST_MAX_LENGTH} />
      </div> : null}
    </div>
  </div>
);

const AuthorSwitch: React.FC<AuthorSwitchProps> = ({
  value,
  onChange,
  personalName,
  professionalName,
  professionalDisabled = false,
}) => (
  <div className="flex rounded-full bg-bg p-1" role="tablist" aria-label="Perfil da publicação">
    <button
      type="button"
      onClick={() => onChange('personal')}
      role="tab"
      aria-selected={value === 'personal'}
      className={`flex min-w-0 flex-1 items-center justify-center gap-2 rounded-full px-3 py-2 text-xs font-bold transition ${
        value === 'personal' ? 'bg-brand-500 text-white' : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      <UserRound size={15} />
      <span className="truncate">Como {personalName}</span>
    </button>
    <button
      type="button"
      onClick={() => {
        if (!professionalDisabled) {
          onChange('professional');
        }
      }}
      disabled={professionalDisabled}
      role="tab"
      aria-selected={value === 'professional'}
      className={`flex min-w-0 flex-1 items-center justify-center gap-2 rounded-full px-3 py-2 text-xs font-bold transition ${
        value === 'professional'
          ? 'bg-brand-500 text-white'
          : professionalDisabled
            ? 'cursor-not-allowed text-slate-300'
            : 'text-slate-500 hover:text-slate-700'
      }`}
    >
      <BriefcaseBusiness size={15} />
      <span className="truncate">Como {professionalName || 'negocio'}</span>
    </button>
  </div>
);

const CompactAuthorMenu: React.FC<AuthorSwitchProps> = ({
  value,
  onChange,
  personalName,
  professionalName,
  professionalDisabled = false,
}) => {
  const [open, setOpen] = React.useState(false);
  const selectedName = value === 'professional' ? professionalName || 'Negócio' : personalName;
  const selectedIcon = value === 'professional' ? <BriefcaseBusiness size={14} /> : <UserRound size={14} />;

  const select = (nextValue: PersonaMode) => {
    if (nextValue === 'professional' && professionalDisabled) return;
    onChange(nextValue);
    setOpen(false);
  };

  return (
    <div className="relative flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
      <span className="flex min-w-0 items-center gap-2 text-xs font-semibold text-slate-600">
        <span className="text-brand-500">{selectedIcon}</span>
        <span className="truncate">Publicando como {selectedName}</span>
      </span>
      <button type="button" onClick={() => setOpen((current) => !current)} aria-label="Escolher perfil de publicação" aria-expanded={open} className="ml-3 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-white hover:text-brand-600">
        <MoreHorizontal size={18} />
      </button>
      {open ? (
        <div className="absolute right-0 top-[calc(100%+0.375rem)] z-20 w-56 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-lg">
          <button type="button" onClick={() => select('personal')} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <UserRound size={16} className="text-brand-500" /><span className="min-w-0 flex-1 truncate">{personalName}</span>{value === 'personal' ? <Check size={16} className="text-brand-500" /> : null}
          </button>
          <button type="button" onClick={() => select('professional')} disabled={professionalDisabled} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45">
            <BriefcaseBusiness size={16} className="text-brand-500" /><span className="min-w-0 flex-1 truncate">{professionalName || 'Cadastrar negócio'}</span>{value === 'professional' ? <Check size={16} className="text-brand-500" /> : null}
          </button>
        </div>
      ) : null}
    </div>
  );
};

const MediaField: React.FC<MediaFieldProps> = ({
  mode,
  imageUrl,
  externalUrl,
  onImageChange,
  onExternalChange,
}) => {
  if (mode === 'photo') {
    return (
      <CloudinaryImageField
        value={imageUrl}
        onChange={onImageChange}
        folder="community"
        placeholder="Link da imagem do post"
        hint="Envie uma imagem pela Cloudinary ou cole uma URL publica."
      />
    );
  }

  if (mode === 'link' || mode === 'video') {
    return (
      <input
        type="url"
        value={externalUrl}
        onChange={(event) => onExternalChange(event.target.value)}
        placeholder={mode === 'video' ? 'Cole o link do YouTube' : 'Cole o link externo'}
        className="w-full rounded-full border border-input px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-200"
      />
    );
  }

  return null;
};

const ModeButton: React.FC<ModeButtonProps> = ({ active, icon, label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    title={label}
    className={`flex h-9 w-9 items-center justify-center rounded-full transition ${
      active ? 'bg-brand-50 text-brand-600' : 'text-muted-foreground hover:bg-slate-100 hover:text-brand-600'
    }`}
  >
    {icon}
  </button>
);

const Actions: React.FC<ActionsProps> = ({ mode, onModeChange, onPublish }) => (
  <div className="flex items-center justify-between border-t border-slate-100 pt-2">
    <div className="flex items-center gap-1">
      <ModeButton
        active={mode === 'photo'}
        icon={<Camera size={16} />}
        label="Foto"
        onClick={() => onModeChange(mode === 'photo' ? 'text' : 'photo')}
      />
      <ModeButton
        active={mode === 'video'}
        icon={<Play size={16} />}
        label="Video"
        onClick={() => onModeChange(mode === 'video' ? 'text' : 'video')}
      />
      <ModeButton
        active={mode === 'link'}
        icon={<LinkIcon size={16} />}
        label="Link"
        onClick={() => onModeChange(mode === 'link' ? 'text' : 'link')}
      />
    </div>
    <Button onClick={onPublish} size="sm" className="min-w-[76px] rounded-full">
      Publicar
    </Button>
  </div>
);

const CommunityComposer = {
  Root,
  AuthorSwitch: CompactAuthorMenu,
  Editor,
  MediaField,
  Actions,
};

export default CommunityComposer;
