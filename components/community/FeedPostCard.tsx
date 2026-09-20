import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { Post } from '@/types';
import PostCard from '@/components/community/PostCard';
import { DEFAULT_AVATAR_URL, handleAvatarError } from '@/lib/avatar';

type FeedPostCardProps = {
  post: Post;
  onToggleLike: () => void;
  onAddComment: (content: string) => Promise<void>;
  onUpdatePost: (content: string, imageUrl: string, externalUrl: string) => Promise<void>;
  onDeletePost: () => Promise<void>;
  onUpdateComment: (commentId: string, content: string) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
  onSharePost: () => void;
  onPostPreference?: (action: 'save' | 'interest' | 'hide' | 'report' | 'mute') => void;
};

const FeedPostCard: React.FC<FeedPostCardProps> = ({
  post,
  onToggleLike,
  onAddComment,
  onUpdatePost,
  onDeletePost,
  onUpdateComment,
  onDeleteComment,
  onSharePost,
  onPostPreference = () => undefined,
}) => {
  const authorHref = post.authorHref || (post.author.username ? `/${post.author.username}` : undefined);
  const [commentText, setCommentText] = useState('');
  const [editingPost, setEditingPost] = useState(false);
  const [editingPostContent, setEditingPostContent] = useState(post.content);
  const [editingPostImageUrl, setEditingPostImageUrl] = useState(post.imageUrl || '');
  const [editingPostExternalUrl, setEditingPostExternalUrl] = useState(post.externalUrl || '');
  const [savingPost, setSavingPost] = useState(false);
  const [postMenuOpen, setPostMenuOpen] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentContent, setEditingCommentContent] = useState('');
  const [savingCommentId, setSavingCommentId] = useState<string | null>(null);
  const [openCommentMenuId, setOpenCommentMenuId] = useState<string | null>(null);
  const [supportsHover, setSupportsHover] = useState(false);
  const [likesOpen, setLikesOpen] = useState(false);
  const [commentsExpanded, setCommentsExpanded] = useState(post.commentCount <= 1);

  useEffect(() => {
    setEditingPostContent(post.content);
    setEditingPostImageUrl(post.imageUrl || '');
    setEditingPostExternalUrl(post.externalUrl || '');
  }, [post.content, post.externalUrl, post.imageUrl]);

  useEffect(() => {
    setCommentsExpanded(post.commentCount <= 1);
  }, [post.id]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia('(hover: hover)');
    const syncHoverCapability = () => setSupportsHover(mediaQuery.matches);

    syncHoverCapability();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', syncHoverCapability);
      return () => mediaQuery.removeEventListener('change', syncHoverCapability);
    }

    mediaQuery.addListener(syncHoverCapability);
    return () => mediaQuery.removeListener(syncHoverCapability);
  }, []);

  useEffect(() => {
    if (post.likeCount === 0) {
      setLikesOpen(false);
    }
  }, [post.likeCount]);

  const handleCommentSubmit = () => {
    const submittedComment = commentText.trim();

    if (!submittedComment) {
      return;
    }

    setCommentText('');
    void onAddComment(submittedComment).catch(() => {
      setCommentText((current) => current || submittedComment);
    });
  };

  const handleSavePost = async () => {
    if (!editingPostContent.trim()) {
      return;
    }

    setSavingPost(true);

    try {
      await onUpdatePost(editingPostContent.trim(), editingPostImageUrl, editingPostExternalUrl);
      setEditingPost(false);
    } catch {
      return;
    } finally {
      setSavingPost(false);
    }
  };

  const handleDeletePost = async () => {
    if (typeof window !== 'undefined' && !window.confirm('Deseja apagar esta publicacao?')) {
      return;
    }

    try {
      await onDeletePost();
    } catch {
      return;
    }
  };

  const handleSaveComment = async () => {
    if (!editingCommentId || !editingCommentContent.trim()) {
      return;
    }

    setSavingCommentId(editingCommentId);

    try {
      await onUpdateComment(editingCommentId, editingCommentContent.trim());
      setEditingCommentId(null);
      setEditingCommentContent('');
      setOpenCommentMenuId(null);
    } catch {
      return;
    } finally {
      setSavingCommentId(null);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (typeof window !== 'undefined' && !window.confirm('Deseja apagar este comentario?')) {
      return;
    }

    setSavingCommentId(commentId);

    try {
      await onDeleteComment(commentId);
      if (editingCommentId === commentId) {
        setEditingCommentId(null);
        setEditingCommentContent('');
      }
      setOpenCommentMenuId(null);
    } catch {
      return;
    } finally {
      setSavingCommentId(null);
    }
  };

  const hiddenLikesCount = Math.max(post.likeCount - post.likedBy.length, 0);
  const visibleComments = commentsExpanded ? post.comments : post.comments.slice(-1);
  const shouldShowCommentsToggle = post.commentCount > 1;
  const loadedCommentCount = post.comments.length;
  const collapsedCommentsLabel =
    post.commentCount > loadedCommentCount
      ? `Ver ${loadedCommentCount} comentarios recentes`
      : `Ver ${loadedCommentCount} comentarios`;

  const likesPreviewContent =
    post.likeCount > 0 ? (
      <div className="space-y-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
            Curtiram este post
          </p>
          <p className="mt-1 text-sm font-medium text-slate-500">
            {post.likeCount} {post.likeCount === 1 ? 'curtida' : 'curtidas'}
          </p>
        </div>
        <div className="space-y-2">
          {post.likedBy.map((likedUser) => (
            <div key={likedUser.id} className="flex items-center gap-3">
              <img
                src={likedUser.image || DEFAULT_AVATAR_URL}
                alt={likedUser.name}
                className="h-8 w-8 rounded-full object-cover"
                onError={handleAvatarError}
              />
              <p className="text-sm font-medium text-slate-700">{likedUser.name}</p>
            </div>
          ))}
          {hiddenLikesCount > 0 ? (
            <p className="pt-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
              +{hiddenLikesCount} pessoas
            </p>
          ) : null}
        </div>
      </div>
    ) : null;

  const isPendingReview = post.status === 'PENDING_REVIEW';

  return (
    <PostCard.Root className={isPendingReview ? 'opacity-65' : ''}>
      {isPendingReview ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-800">
          Aguardando aprovacao da administracao. Esta publicacao esta visivel apenas para voce e administradores.
        </div>
      ) : null}
      <PostCard.Header
        authorImage={post.author.image || DEFAULT_AVATAR_URL}
        authorName={post.author.name}
        authorHref={authorHref}
        authorType={post.authorType}
        createdAt={post.createdAt}
        locationLabel={post.locationLabel}
        menu={
          <PostCard.Menu
            open={postMenuOpen}
            onToggle={() => setPostMenuOpen((current) => !current)}
          >
            {post.canEdit ? (
              <PostCard.MenuItem
                onClick={() => {
                  setEditingPost(true);
                  setPostMenuOpen(false);
                }}
              >
                Editar
              </PostCard.MenuItem>
            ) : null}
            {post.canDelete ? (
              <PostCard.MenuItem
                tone="danger"
                onClick={() => {
                  setPostMenuOpen(false);
                  void handleDeletePost();
                }}
              >
                Apagar
              </PostCard.MenuItem>
            ) : null}
            <PostCard.MenuItem onClick={() => { setPostMenuOpen(false); onPostPreference('interest'); }}>
              {post.viewerIsInterested ? 'Remover interesse' : 'Tenho interesse'}
            </PostCard.MenuItem>
            <PostCard.MenuItem onClick={() => { setPostMenuOpen(false); onPostPreference('hide'); }}>Não tenho interesse</PostCard.MenuItem>
            <PostCard.MenuItem onClick={() => { setPostMenuOpen(false); onPostPreference('save'); }}>
              {post.viewerHasSaved ? 'Remover dos salvos' : 'Salvar post'}
            </PostCard.MenuItem>
            <PostCard.MenuItem onClick={() => { setPostMenuOpen(false); onPostPreference('hide'); }}>Ocultar</PostCard.MenuItem>
            <PostCard.MenuItem onClick={() => { setPostMenuOpen(false); onPostPreference('report'); }}>Reportar</PostCard.MenuItem>
            <PostCard.MenuItem onClick={() => { setPostMenuOpen(false); onPostPreference('mute'); }}>Mutar usuário</PostCard.MenuItem>
          </PostCard.Menu>
        }
      />

      {editingPost ? (
        <PostCard.Editor
          content={editingPostContent}
          imageUrl={editingPostImageUrl}
          externalUrl={editingPostExternalUrl}
          onContentChange={setEditingPostContent}
          onImageChange={setEditingPostImageUrl}
          onExternalChange={setEditingPostExternalUrl}
          onSave={() => void handleSavePost()}
          onCancel={() => {
            setEditingPost(false);
            setEditingPostContent(post.content);
            setEditingPostImageUrl(post.imageUrl || '');
            setEditingPostExternalUrl(post.externalUrl || '');
          }}
          saving={savingPost}
        />
      ) : (
        <PostCard.Body
          postId={post.id}
          content={post.content}
          imageUrl={post.imageUrl}
          externalUrl={post.externalUrl}
        />
      )}

      <PostCard.Actions
        liked={post.viewerHasLiked}
        likeCount={post.likeCount}
        commentCount={post.commentCount}
        onToggleLike={onToggleLike}
        onToggleComments={
          shouldShowCommentsToggle ? () => setCommentsExpanded((current) => !current) : undefined
        }
        commentsExpanded={commentsExpanded}
        onOpenLikes={() => {
          if (post.likeCount === 0) {
            return;
          }

          setLikesOpen((current) => (supportsHover ? !current : !current));
        }}
        onLikesHoverStart={() => {
          if (supportsHover && post.likeCount > 0) {
            setLikesOpen(true);
          }
        }}
        onLikesHoverEnd={() => {
          if (supportsHover) {
            setLikesOpen(false);
          }
        }}
        likesPreview={
          supportsHover && likesOpen && likesPreviewContent ? (
            <div className="absolute left-0 top-8 z-20 w-[260px] rounded-card border border-border bg-surface p-4 shadow-md">
              {likesPreviewContent}
            </div>
          ) : null
        }
        onShare={onSharePost}
      />

      {shouldShowCommentsToggle ? (
        <button
          type="button"
          onClick={() => setCommentsExpanded((current) => !current)}
          className="w-fit text-xs font-bold text-brand-500 transition hover:text-brand-600"
        >
          {commentsExpanded ? 'Ocultar comentarios' : collapsedCommentsLabel}
        </button>
      ) : null}

      {visibleComments.map((comment) => (
        <PostCard.CommentItem
          key={comment.id}
          authorImage={comment.author.image || DEFAULT_AVATAR_URL}
          authorName={comment.author.name}
          authorHref={comment.author.username ? `/${comment.author.username}` : undefined}
          content={
            editingCommentId === comment.id ? (
              <textarea
                rows={3}
                value={editingCommentContent}
                onChange={(event) => setEditingCommentContent(event.target.value)}
                className="w-full rounded-md border border-input bg-surface px-3 py-2 text-[11px] text-foreground outline-none focus:ring-2 focus:ring-brand-200"
              />
            ) : (
              <p className="text-[11px] leading-tight text-slate-600">{comment.content}</p>
            )
          }
          menu={
            <PostCard.Menu
              open={openCommentMenuId === comment.id && Boolean(comment.canEdit || comment.canDelete)}
              onToggle={() =>
                setOpenCommentMenuId((current) => (current === comment.id ? null : comment.id))
              }
            >
              {comment.canEdit ? (
                <PostCard.MenuItem
                  onClick={() => {
                    setEditingCommentId(comment.id);
                    setEditingCommentContent(comment.content);
                    setOpenCommentMenuId(null);
                  }}
                >
                  Editar
                </PostCard.MenuItem>
              ) : null}
              {comment.canDelete ? (
                <PostCard.MenuItem
                  tone="danger"
                  disabled={savingCommentId === comment.id}
                  onClick={() => void handleDeleteComment(comment.id)}
                >
                  {savingCommentId === comment.id ? 'Apagando...' : 'Apagar'}
                </PostCard.MenuItem>
              ) : null}
            </PostCard.Menu>
          }
          footer={
            editingCommentId === comment.id ? (
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => void handleSaveComment()}
                  disabled={savingCommentId === comment.id}
                  className="rounded-full bg-brand-500 px-4 py-2 text-[11px] font-bold text-white disabled:opacity-60"
                >
                  {savingCommentId === comment.id ? 'Salvando...' : 'Salvar'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingCommentId(null);
                    setEditingCommentContent('');
                  }}
                  disabled={savingCommentId === comment.id}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-[11px] font-bold text-slate-600 disabled:opacity-60"
                >
                  Cancelar
                </button>
              </div>
            ) : null
          }
        />
      ))}

      <PostCard.CommentComposer
        value={commentText}
        onChange={setCommentText}
        onSubmit={handleCommentSubmit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            handleCommentSubmit();
          }
        }}
      />

      {!supportsHover && likesOpen && likesPreviewContent ? (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/35 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-sheet bg-surface p-5 shadow-lg">
            <div className="mb-3 flex justify-end">
              <button
                type="button"
                onClick={() => setLikesOpen(false)}
                className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                aria-label="Fechar lista de curtidas"
              >
                <X size={18} />
              </button>
            </div>
            {likesPreviewContent}
          </div>
        </div>
      ) : null}
    </PostCard.Root>
  );
};

export default FeedPostCard;
