import React from 'react';
import Link from 'next/link';
import {
  Link as LinkIcon,
  MessageSquare,
  MoreHorizontal,
  Share2,
  Store,
  ThumbsUp,
} from 'lucide-react';
import CloudinaryImageField from '@/components/forms/CloudinaryImageField';
import { handleAvatarError } from '@/lib/avatar';
import {
  buildYoutubeEmbedUrl,
  formatRelativeTime,
  getExternalHostname,
} from '@/components/community/utils';
import { Button } from '@/components/ui/Button';
import { CharacterCounter } from '@/components/ui/CharacterCounter';
import { FeedCard } from '@/components/ui/FeedCard';
import { ImageLightbox } from '@/components/community/ImageLightbox';

const POST_CONTENT_MAX_LENGTH = 600;

type RootProps = {
  children: React.ReactNode;
  className?: string;
};

type HeaderProps = {
  authorImage: string;
  authorName: string;
  authorHref?: string;
  createdAt: string;
  locationLabel: string;
  authorType?: 'USER' | 'BUSINESS';
  menu?: React.ReactNode;
};

type MenuProps = {
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
};

type BodyProps = {
  postId: string;
  content: string;
  imageUrl?: string | null;
  externalUrl?: string | null;
};

type EditorProps = {
  content: string;
  imageUrl: string;
  externalUrl: string;
  onContentChange: (value: string) => void;
  onImageChange: (value: string) => void;
  onExternalChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
};

type ActionsProps = {
  liked: boolean;
  likeCount: number;
  commentCount: number;
  onToggleLike: () => void;
  onToggleComments?: () => void;
  commentsExpanded?: boolean;
  onOpenLikes?: () => void;
  onLikesHoverStart?: () => void;
  onLikesHoverEnd?: () => void;
  likesPreview?: React.ReactNode;
  onShare?: () => void;
};

type CommentItemProps = {
  authorImage: string;
  authorName: string;
  authorHref?: string;
  content: React.ReactNode;
  menu?: React.ReactNode;
  footer?: React.ReactNode;
};

type CommentComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
};

const Root: React.FC<RootProps> = ({ children, className = '' }) => (
  <FeedCard.Root className={`space-y-3 rounded-[18px] p-4 ${className}`.trim()}>
    {children}
  </FeedCard.Root>
);

const Header: React.FC<HeaderProps> = ({
  authorImage,
  authorName,
  authorHref,
  createdAt,
  locationLabel,
  authorType = 'USER',
  menu,
}) => (
  <div className="flex items-center justify-between">
    {authorHref ? (
      <Link href={authorHref} className="flex items-center gap-3 transition hover:opacity-90">
        <img src={authorImage} className="h-9 w-9 rounded-full object-cover" alt={authorName} onError={handleAvatarError} />
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h5 className="text-[13px] font-bold text-foreground">{authorName}</h5>
            {authorType === 'BUSINESS' ? <BusinessBadge /> : null}
          </div>
          <p className="text-[10px] text-slate-400">
            {formatRelativeTime(createdAt)} | {locationLabel}
          </p>
        </div>
      </Link>
    ) : (
      <div className="flex items-center gap-3">
        <img src={authorImage} className="h-9 w-9 rounded-full object-cover" alt={authorName} onError={handleAvatarError} />
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h5 className="text-[13px] font-bold text-foreground">{authorName}</h5>
            {authorType === 'BUSINESS' ? <BusinessBadge /> : null}
          </div>
          <p className="text-[10px] text-slate-400">
            {formatRelativeTime(createdAt)} | {locationLabel}
          </p>
        </div>
      </div>
    )}
    {menu}
  </div>
);

const BusinessBadge = () => (
  <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-brand-600">
    <Store size={10} />
    Negócio
  </span>
);

const Menu: React.FC<MenuProps> = ({ open, onToggle, children }) => (
  <div className="relative">
    <button
      type="button"
      onClick={onToggle}
      className="rounded-full p-2 text-slate-400 transition hover:bg-slate-50"
    >
      <MoreHorizontal size={20} />
    </button>
    {open ? (
      <div className="absolute right-0 top-10 z-10 min-w-[160px] rounded-md border border-border bg-surface p-2 shadow-md">
        {children}
      </div>
    ) : null}
  </div>
);

const MenuItem: React.FC<{
  tone?: 'default' | 'danger';
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ tone = 'default', disabled = false, onClick, children }) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    className={`block w-full rounded-xl px-3 py-2 text-left text-xs font-bold disabled:opacity-60 ${
      tone === 'danger' ? 'text-red-700 hover:bg-red-50' : 'text-slate-700 hover:bg-slate-50'
    }`}
  >
    {children}
  </button>
);

const Body: React.FC<BodyProps> = ({ postId, content, imageUrl, externalUrl }) => {
  const [imageOpen, setImageOpen] = React.useState(false);
  const youtubeEmbedUrl = buildYoutubeEmbedUrl(externalUrl);
  const externalHostname = getExternalHostname(externalUrl);

  return (
    <>
      <div className="whitespace-pre-wrap px-0 pb-0 text-[13px] leading-5 text-slate-700">
        {content.split(/(#[\p{L}\p{N}_-]+)/gu).map((part, index) =>
          /^#[\p{L}\p{N}_-]+$/u.test(part) ? (
            <Link key={`${part}-${index}`} href={`/buscar?q=${encodeURIComponent(part)}`} className="font-semibold text-brand-600 hover:underline">
              {part}
            </Link>
          ) : part,
        )}
      </div>

      {youtubeEmbedUrl ? (
        <div className="overflow-hidden rounded-3xl border border-slate-100 bg-slate-950">
          <iframe
            src={youtubeEmbedUrl}
            title={`Video externo ${postId}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="aspect-video w-full"
          />
        </div>
      ) : null}

      {externalUrl && !youtubeEmbedUrl ? (
        <a
          href={externalUrl}
          target="_blank"
          rel="noreferrer"
          className="block rounded-3xl border border-slate-100 bg-slate-50 p-4 transition hover:bg-slate-100"
        >
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
            <LinkIcon size={14} />
            Link externo
          </div>
          <p className="mt-2 break-all text-sm font-bold text-brand-500">{externalUrl}</p>
          {externalHostname ? (
            <p className="mt-1 text-xs font-medium text-slate-500">{externalHostname}</p>
          ) : null}
        </a>
      ) : null}

      {imageUrl ? (
        <>
          <button type="button" onClick={() => setImageOpen(true)} className="-mx-5 block w-[calc(100%+2.5rem)] overflow-hidden bg-bg" aria-label="Ampliar imagem da publicação">
            <FeedCard.Media src={imageUrl} alt="Imagem da publicação" className="aspect-[4/3] rounded-none" />
          </button>
          <ImageLightbox open={imageOpen} onClose={() => setImageOpen(false)} src={imageUrl} alt="Imagem ampliada da publicação" />
        </>
      ) : null}
    </>
  );
};

const Editor: React.FC<EditorProps> = ({
  content,
  imageUrl,
  externalUrl,
  onContentChange,
  onImageChange,
  onExternalChange,
  onSave,
  onCancel,
  saving,
}) => (
  <div className="space-y-3 rounded-card bg-bg p-4">
    <textarea
      rows={4}
      value={content}
      maxLength={POST_CONTENT_MAX_LENGTH}
      onChange={(event) => onContentChange(event.target.value)}
      className="w-full rounded-md border border-input px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-200"
    />
    <div className="flex justify-end">
      <CharacterCounter current={content.length} max={POST_CONTENT_MAX_LENGTH} />
    </div>
    <CloudinaryImageField
      value={imageUrl}
      onChange={onImageChange}
      folder="community"
      placeholder="Link da imagem do post"
      hint="Atualize a imagem da publicacao quando precisar."
    />
    <input
      type="url"
      value={externalUrl}
      onChange={(event) => onExternalChange(event.target.value)}
      placeholder="Link externo ou YouTube"
      className="w-full rounded-full border border-input px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-200"
    />
    <div className="flex gap-2">
      <Button type="button" onClick={onSave} disabled={saving} loading={saving} fullWidth size="sm">
        {saving ? 'Salvando...' : 'Salvar publicacao'}
      </Button>
      <Button type="button" onClick={onCancel} disabled={saving} variant="ghost" size="sm">
        Cancelar
      </Button>
    </div>
  </div>
);

const Actions: React.FC<ActionsProps> = ({
  liked,
  likeCount,
  commentCount,
  onToggleLike,
  onToggleComments,
  commentsExpanded = false,
  onOpenLikes,
  onLikesHoverStart,
  onLikesHoverEnd,
  likesPreview,
  onShare,
}) => (
  <div className="flex items-center justify-between border-t border-slate-100 pt-2">
    <div className="flex items-center gap-2">
      <div
        className="relative flex items-center gap-1.5"
        onMouseEnter={onLikesHoverStart}
        onMouseLeave={onLikesHoverEnd}
      >
        <button
          type="button"
          onClick={onToggleLike}
        className={`inline-flex h-8 items-center gap-1.5 rounded-full bg-slate-50 px-3 text-xs font-bold ${
            liked ? 'text-brand-600' : 'text-muted-foreground hover:bg-brand-50 hover:text-brand-600'
          }`}
        >
          <ThumbsUp size={16} />
        </button>
        <button
          type="button"
          onClick={onOpenLikes}
          disabled={likeCount === 0}
          className={`text-xs font-bold ${
            likeCount > 0 ? 'text-muted-foreground hover:text-brand-500' : 'text-slate-300'
          } disabled:cursor-default`}
        >
          {likeCount}
        </button>
        {likesPreview}
      </div>
      <button
        type="button"
        onClick={onToggleComments}
        disabled={commentCount === 0 || !onToggleComments}
        className={`inline-flex h-8 items-center gap-1.5 rounded-full bg-slate-50 px-3 text-xs font-bold ${
          commentCount > 0 && onToggleComments
            ? commentsExpanded
              ? 'text-brand-500'
              : 'text-muted-foreground hover:text-brand-500'
            : 'text-slate-300'
        } disabled:cursor-default`}
      >
        <MessageSquare size={16} /> {commentCount}
      </button>
    </div>
    <button type="button" onClick={onShare} aria-label="Compartilhar publicação" className="text-slate-400 transition hover:text-brand-500">
      <Share2 size={16} />
    </button>
  </div>
);

const CommentItem: React.FC<CommentItemProps> = ({
  authorImage,
  authorName,
  authorHref,
  content,
  menu,
  footer,
}) => (
  <div className="rounded-2xl bg-slate-50 p-3">
    <div className="flex gap-3">
      {authorHref ? (
        <Link href={authorHref} className="block transition hover:opacity-90">
          <img src={authorImage} className="h-8 w-8 rounded-full object-cover" alt={authorName} onError={handleAvatarError} />
        </Link>
      ) : (
        <img src={authorImage} className="h-8 w-8 rounded-full object-cover" alt={authorName} onError={handleAvatarError} />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div>
            {authorHref ? (
              <Link href={authorHref} className="mb-1 block text-xs font-bold text-foreground transition hover:opacity-90">
                {authorName}
              </Link>
            ) : (
              <h6 className="mb-1 text-xs font-bold text-foreground">{authorName}</h6>
            )}
            {content}
          </div>
          {menu}
        </div>
        {footer}
      </div>
    </div>
  </div>
);

const CommentComposer: React.FC<CommentComposerProps> = ({
  value,
  onChange,
  onSubmit,
  onKeyDown,
}) => (
  <div className="flex items-center gap-2">
    <input
      type="text"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={onKeyDown}
      placeholder="Escreva um comentario..."
      className="flex-1 rounded-full bg-bg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-200"
    />
    <Button type="button" onClick={onSubmit} size="xs">
      Responder
    </Button>
  </div>
);

const PostCard = {
  Root,
  Header,
  Menu,
  MenuItem,
  Body,
  Editor,
  Actions,
  CommentItem,
  CommentComposer,
};

export default PostCard;
