import React, { useCallback, useEffect, useState } from 'react';
import { useRef } from 'react';
import { flushSync } from 'react-dom';
import { useSearchParams } from 'next/navigation';
import { Copy, ExternalLink, Share2, UserPlus } from 'lucide-react';
import CommunityComposer from '@/components/community/CommunityComposer';
import FeedPostCard from '@/components/community/FeedPostCard';
import type { ComposerMode } from '@/components/community/utils';
import { isYoutubeUrl } from '@/components/community/utils';
import { useToast } from '@/components/feedback/ToastProvider';
import { useIntersectionTrigger } from '@/hooks/useIntersectionTrigger';
import { useRegionBanners } from '@/hooks/useRegionContent';
import { Button } from '@/components/ui/Button';
import { normalizeUrlFieldValue } from '@/lib/forms/validation';
import { loadRegionCommunityPosts } from '@/lib/content-api';
import { trackAnalyticsEvent } from '@/lib/analytics';
import type { BannerAd, PersonaMode, Post, ProfessionalProfileIdentity, ReferralSummary, User } from '@/types';
import type { CommunityInitialData } from '@/lib/content-contracts';
import { ViewableAdSlot } from '@/components/ads/ViewableAdSlot';
import { ContentColumn } from '@/components/ui/ContentColumn';
import { FeedCard } from '@/components/ui/FeedCard';
import { DEFAULT_AVATAR_URL, handleAvatarError } from '@/lib/avatar';

const getPostTimestamp = (post: Post) => new Date(post.createdAt).getTime() || 0;

const Community: React.FC<{
  user: User;
  personaMode?: PersonaMode;
  professionalIdentity?: ProfessionalProfileIdentity | null;
  initialData?: CommunityInitialData;
}> = ({ user, personaMode = 'personal', professionalIdentity = null, initialData }) => {
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const targetPostId = searchParams?.get('post');
  const [composerMode, setComposerMode] = useState<ComposerMode>('text');
  const [postContent, setPostContent] = useState('');
  const [postImageUrl, setPostImageUrl] = useState('');
  const [postExternalUrl, setPostExternalUrl] = useState('');
  const [postPersonaMode, setPostPersonaMode] = useState<PersonaMode>(
    personaMode === 'professional' ? 'professional' : 'personal',
  );
  const [submittingBannerId, setSubmittingBannerId] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>(initialData?.posts ?? []);
  const [postsLoading, setPostsLoading] = useState(!initialData);
  const [loadingMorePosts, setLoadingMorePosts] = useState(false);
  const [postsHasMore, setPostsHasMore] = useState(initialData?.hasMore ?? true);
  const [postsNextOffset, setPostsNextOffset] = useState(initialData?.nextOffset ?? 0);
  const initialPageConsumedRef = useRef(false);
  const pendingLikeIdsRef = useRef(new Set<string>());
  const targetPostAutoLoadAttemptsRef = useRef(0);
  const targetPostScrollIdRef = useRef<string | null>(null);
  const [referralSummary, setReferralSummary] = useState<ReferralSummary>({
    referralUrl: null,
    registrationCount: 0,
  });
  const canPostAsProfessional = Boolean(professionalIdentity);
  const isProfessionalMode = postPersonaMode === 'professional' && canPostAsProfessional;
  const composerAvatar =
    isProfessionalMode && professionalIdentity?.imageUrl ? professionalIdentity.imageUrl : user.avatar;
  const composerHref =
    isProfessionalMode && professionalIdentity
      ? professionalIdentity.publicPath
      : user.username
        ? `/perfil/${encodeURIComponent(user.username)}`
        : undefined;
  const composerName = isProfessionalMode && professionalIdentity ? professionalIdentity.name : user.name;
  const activeRegionKey = isProfessionalMode
    ? professionalIdentity?.regionKey || user.regionKey || ''
    : user.regionKey || '';
  const feedRegionKey = activeRegionKey || user.regionKey || null;
  const { data: banners } = useRegionBanners('feed', feedRegionKey);
  const sentinelRef = useIntersectionTrigger(
    () => {
      if (!postsHasMore || postsLoading || loadingMorePosts) {
        return;
      }

      void loadMorePosts();
    },
    { enabled: Boolean(feedRegionKey) && postsHasMore, rootMargin: '0px 0px 240px 0px' },
  );

  useEffect(() => {
    setPostPersonaMode(personaMode === 'professional' ? 'professional' : 'personal');
  }, [personaMode]);


  const loadPostsPage = useCallback(
    async ({ offset, replace }: { offset: number; replace: boolean }) => {
      if (!feedRegionKey) {
        setPosts([]);
        setPostsLoading(false);
        setLoadingMorePosts(false);
        setPostsHasMore(false);
        setPostsNextOffset(0);
        return;
      }

      if (replace) {
        setPostsLoading(true);
      } else {
        setLoadingMorePosts(true);
      }

      try {
        const payload = await loadRegionCommunityPosts({
          regionKey: feedRegionKey,
          limit: 5,
          offset,
        });

        setPosts((current) => (replace ? payload.posts : [...current, ...payload.posts]));
        setPostsHasMore(payload.hasMore);
        setPostsNextOffset(payload.nextOffset);
      } catch (error) {
        console.error('Failed to load community posts:', error);
        if (replace) {
          setPosts([]);
          setPostsHasMore(false);
          setPostsNextOffset(0);
        }
      } finally {
        setPostsLoading(false);
        setLoadingMorePosts(false);
      }
    },
    [feedRegionKey],
  );

  const reloadPosts = useCallback(async () => {
    targetPostAutoLoadAttemptsRef.current = 0;
    targetPostScrollIdRef.current = null;
    setPosts([]);
    setPostsHasMore(true);
    setPostsNextOffset(0);
    await loadPostsPage({ offset: 0, replace: true });
  }, [loadPostsPage]);

  const loadMorePosts = useCallback(async () => {
    if (!postsHasMore || postsLoading || loadingMorePosts) {
      return;
    }

    await loadPostsPage({ offset: postsNextOffset, replace: false });
  }, [loadPostsPage, loadingMorePosts, postsHasMore, postsLoading, postsNextOffset]);
  useEffect(() => {
    if (!targetPostId) {
      return;
    }

    const targetElement = document.getElementById(`post-${targetPostId}`);

    if (!targetElement) {
      if (
        !postsLoading &&
        postsHasMore &&
        !loadingMorePosts &&
        targetPostAutoLoadAttemptsRef.current < 2
      ) {
        targetPostAutoLoadAttemptsRef.current += 1;
        void loadMorePosts();
      }
      return;
    }

    if (targetPostScrollIdRef.current === targetPostId) {
      return;
    }

    targetPostScrollIdRef.current = targetPostId;

    window.requestAnimationFrame(() => {
      targetElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    });
  }, [loadMorePosts, loadingMorePosts, posts, postsHasMore, postsLoading, targetPostId]);


  useEffect(() => {
    if (!initialPageConsumedRef.current && initialData?.regionKey === feedRegionKey) {
      initialPageConsumedRef.current = true;
      return;
    }

    void reloadPosts();
  }, [feedRegionKey, initialData?.regionKey, reloadPosts]);

  useEffect(() => {
    let ignore = false;

    const loadReferralSummary = async () => {
      try {
        const response = await fetch('/api/referrals/summary', { cache: 'no-store' });
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(payload?.error ?? 'Nao foi possivel carregar seu link de indicacao.');
        }

        if (!ignore) {
          setReferralSummary({
            referralUrl: payload?.referralUrl ?? null,
            registrationCount: Number(payload?.registrationCount ?? 0),
          });
        }
      } catch (error) {
        console.error('Failed to load referral summary:', error);

        if (!ignore) {
          setReferralSummary({
            referralUrl: null,
            registrationCount: 0,
          });
        }
      }
    };

    void loadReferralSummary();

    return () => {
      ignore = true;
    };
  }, []);

  const resetComposer = () => {
    setComposerMode('text');
    setPostContent('');
    setPostImageUrl('');
    setPostExternalUrl('');
  };

  const handleComposerModeChange = (mode: ComposerMode) => {
    setComposerMode(mode);

    if (mode === 'photo' || mode === 'text') {
      setPostExternalUrl('');
    }

    if (mode === 'link' || mode === 'video' || mode === 'text') {
      setPostImageUrl('');
    }
  };

  const handleCopyReferralLink = async () => {
    if (!referralSummary.referralUrl) {
      showToast('Seu link de indicacao ainda nao esta disponivel.', 'error');
      return;
    }

    try {
      await navigator.clipboard.writeText(referralSummary.referralUrl);
      showToast('Link de indicacao copiado.', 'success');
    } catch {
      showToast(referralSummary.referralUrl, 'info', 5000);
    }
  };

  const handleShareReferralLink = async () => {
    if (!referralSummary.referralUrl) {
      showToast('Seu link de indicacao ainda nao esta disponivel.', 'error');
      return;
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Gringoou',
          text: 'Entre para a comunidade brasileira no exterior pela Gringoou.',
          url: referralSummary.referralUrl,
        });
        return;
      } catch {
        // fallback below
      }
    }

    await handleCopyReferralLink();
  };

  const handlePublish = async () => {
    const normalizedImageUrl = normalizeUrlFieldValue(postImageUrl);
    const normalizedExternalUrl = normalizeUrlFieldValue(postExternalUrl);

    if (composerMode === 'photo' && !normalizedImageUrl) {
      showToast('Adicione uma imagem para publicar uma foto.', 'error');
      return;
    }

    if (composerMode === 'link') {
      if (!normalizedExternalUrl) {
        showToast('Informe o link externo da publicacao.', 'error');
        return;
      }

      if (!postContent.trim()) {
        showToast('Adicione uma descricao para o link.', 'error');
        return;
      }
    }

    if (composerMode === 'video') {
      if (!normalizedExternalUrl) {
        showToast('Informe o link do video.', 'error');
        return;
      }

      if (!isYoutubeUrl(normalizedExternalUrl)) {
        showToast('Por enquanto, o video externo precisa ser um link do YouTube.', 'error');
        return;
      }
    }

    if (!postContent.trim() && !normalizedImageUrl && !normalizedExternalUrl) {
      showToast('Escreva algo antes de publicar.', 'error');
      return;
    }

    const content =
      postContent.trim() ||
      (composerMode === 'photo'
        ? 'Compartilhando uma imagem com a comunidade.'
        : composerMode === 'video'
          ? 'Compartilhando um video com a comunidade.'
          : 'Compartilhando algo com a comunidade.');
    const temporaryPostId = `optimistic-post-${crypto.randomUUID()}`;
    const optimisticPost: Post = {
      id: temporaryPostId,
      content,
      imageUrl: normalizedImageUrl || null,
      externalUrl: normalizedExternalUrl || null,
      status: normalizedExternalUrl ? 'PENDING_REVIEW' : 'PUBLISHED',
      createdAt: new Date().toISOString(),
      locationLabel: isProfessionalMode
        ? professionalIdentity?.locationLabel || user.location
        : user.location,
      author: isProfessionalMode && professionalIdentity
        ? {
            id: professionalIdentity.id,
            name: professionalIdentity.name,
            image: professionalIdentity.imageUrl,
          }
        : {
            id: user.id,
            name: user.name,
            username: user.username,
            image: user.avatar,
          },
      authorHref: isProfessionalMode && professionalIdentity
        ? professionalIdentity.publicPath
        : user.username
          ? `/${user.username}`
          : undefined,
      authorType: isProfessionalMode ? 'BUSINESS' : 'USER',
      comments: [],
      likeCount: 0,
      commentCount: 0,
      viewerHasLiked: false,
      likedBy: [],
      canEdit: true,
      canDelete: true,
    };
    const composerSnapshot = {
      mode: composerMode,
      content: postContent,
      imageUrl: postImageUrl,
      externalUrl: postExternalUrl,
    };

    flushSync(() => {
      setPosts((current) => [optimisticPost, ...current]);
      resetComposer();
    });

    try {
      const response = await fetch('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          imageUrl: normalizedImageUrl,
          externalUrl: normalizedExternalUrl,
          personaMode: isProfessionalMode ? 'professional' : 'personal',
          businessId: isProfessionalMode ? professionalIdentity?.id : undefined,
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error ?? 'Nao foi possivel publicar agora.');
      }

      setPosts((current) =>
        current.map((post) => (post.id === temporaryPostId ? payload.post : post)),
      );
    } catch (error) {
      console.error('Failed to publish post:', error);
      setPosts((current) => current.filter((post) => post.id !== temporaryPostId));
      setPostContent((current) => current || composerSnapshot.content);
      setPostImageUrl((current) => current || composerSnapshot.imageUrl);
      setPostExternalUrl((current) => current || composerSnapshot.externalUrl);
      setComposerMode((current) =>
        current === 'text' && !postContent && !postImageUrl && !postExternalUrl
          ? composerSnapshot.mode
          : current,
      );
      showToast(
        error instanceof Error ? error.message : 'Nao foi possivel publicar agora.',
        'error',
      );
    }
  };

  const handleToggleLike = async (postId: string) => {
    if (pendingLikeIdsRef.current.has(postId)) {
      return;
    }

    const previousPost = posts.find((post) => post.id === postId);

    if (!previousPost) {
      return;
    }

    pendingLikeIdsRef.current.add(postId);
    const nextLiked = !previousPost.viewerHasLiked;

    flushSync(() => {
      setPosts((current) =>
        current.map((post) =>
        post.id === postId
          ? {
              ...post,
              viewerHasLiked: nextLiked,
              likeCount: Math.max(0, post.likeCount + (nextLiked ? 1 : -1)),
              likedBy: nextLiked
                ? [
                    {
                      id: user.id,
                      name: user.name,
                      username: user.username,
                      image: user.avatar,
                    },
                    ...post.likedBy.filter((likedUser) => likedUser.id !== user.id),
                  ].slice(0, 8)
                : post.likedBy.filter((likedUser) => likedUser.id !== user.id),
            }
          : post,
        ),
      );
    });

    try {
      const response = await fetch(`/api/community/posts/${postId}/reactions`, { method: 'POST' });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error ?? 'Nao foi possivel curtir o post.');
      }

      setPosts((current) =>
        current.map((post) =>
          post.id === postId
            ? {
                ...post,
                viewerHasLiked: Boolean(payload.liked),
                likeCount: Number(payload.likeCount),
                likedBy: payload.likedBy,
              }
            : post,
        ),
      );
    } catch (error) {
      console.error('Failed to toggle like:', error);
      setPosts((current) =>
        current.map((post) =>
          post.id === postId
            ? {
                ...post,
                viewerHasLiked: previousPost.viewerHasLiked,
                likeCount: previousPost.likeCount,
                likedBy: previousPost.likedBy,
              }
            : post,
        ),
      );
      showToast('Nao foi possivel curtir esse post agora.', 'error');
    } finally {
      pendingLikeIdsRef.current.delete(postId);
    }
  };

  const handleAddComment = async (postId: string, content: string) => {
    const normalizedContent = content.trim();
    const temporaryCommentId = `optimistic-${crypto.randomUUID()}`;

    flushSync(() => {
      setPosts((current) =>
        current.map((post) =>
        post.id === postId
          ? {
              ...post,
              commentCount: post.commentCount + 1,
              comments: [
                ...post.comments,
                {
                  id: temporaryCommentId,
                  content: normalizedContent,
                  createdAt: new Date().toISOString(),
                  author: {
                    id: user.id,
                    name: user.name,
                    username: user.username,
                    image: user.avatar,
                  },
                },
              ],
            }
          : post,
        ),
      );
    });

    try {
      const response = await fetch(`/api/community/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: normalizedContent }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error ?? 'Nao foi possivel comentar.');
      }

      setPosts((current) =>
        current.map((post) =>
          post.id === postId
            ? {
                ...post,
                comments: post.comments.map((comment) =>
                  comment.id === temporaryCommentId
                    ? {
                        ...payload.comment,
                        author: {
                          ...payload.comment.author,
                          name: payload.comment.author.name || 'Usuario da comunidade',
                        },
                      }
                    : comment,
                ),
              }
            : post,
        ),
      );
    } catch (error) {
      setPosts((current) =>
        current.map((post) => {
          if (post.id !== postId || !post.comments.some((comment) => comment.id === temporaryCommentId)) {
            return post;
          }

          return {
            ...post,
            commentCount: Math.max(0, post.commentCount - 1),
            comments: post.comments.filter((comment) => comment.id !== temporaryCommentId),
          };
        }),
      );
      showToast('Nao foi possivel comentar agora.', 'error');
      throw error;
    }
  };

  const handleUpdatePost = async (
    postId: string,
    content: string,
    imageUrl: string,
    externalUrl: string,
  ) => {
    try {
      const response = await fetch(`/api/community/posts/${postId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          imageUrl: normalizeUrlFieldValue(imageUrl),
          externalUrl: normalizeUrlFieldValue(externalUrl),
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error ?? 'Nao foi possivel atualizar a publicacao.');
      }

      showToast(payload?.message ?? 'Publicacao atualizada.', 'success');
      await reloadPosts();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Nao foi possivel atualizar a publicacao.',
        'error',
      );
      throw error;
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      const response = await fetch(`/api/community/posts/${postId}`, { method: 'DELETE' });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error ?? 'Nao foi possivel remover a publicacao.');
      }

      showToast(payload?.message ?? 'Publicacao removida.', 'success');
      await reloadPosts();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Nao foi possivel remover a publicacao.',
        'error',
      );
      throw error;
    }
  };

  const handleUpdateComment = async (postId: string, commentId: string, content: string) => {
    try {
      const response = await fetch(`/api/community/posts/${postId}/comments/${commentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error ?? 'Nao foi possivel atualizar o comentario.');
      }

      showToast(payload?.message ?? 'Comentario atualizado.', 'success');
      await reloadPosts();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Nao foi possivel atualizar o comentario.',
        'error',
      );
      throw error;
    }
  };

  const handleDeleteComment = async (postId: string, commentId: string) => {
    try {
      const response = await fetch(`/api/community/posts/${postId}/comments/${commentId}`, {
        method: 'DELETE',
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error ?? 'Nao foi possivel remover o comentario.');
      }

      showToast(payload?.message ?? 'Comentario removido.', 'success');
      await reloadPosts();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Nao foi possivel remover o comentario.',
        'error',
      );
      throw error;
    }
  };

  const handleSharePost = async (post: Post) => {
    const postPath = `/community?post=${post.id}`;
    const postUrl =
      typeof window === 'undefined'
        ? postPath
        : `${window.location.origin}${postPath}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Publicacao na Gringoou',
          text: post.content,
          url: postUrl,
        });
        return;
      } catch {
        // fallback below
      }
    }

    try {
      await navigator.clipboard.writeText(postUrl);
      showToast('Link da publicacao copiado.', 'success');
    } catch {
      showToast(postUrl, 'info', 5000);
    }
  };

  const handleBannerLinkClick = (banner: BannerAd) => {
    if (!banner.targetUrl) {
      showToast('Esse banner ainda nao tem um link configurado.', 'error');
      return;
    }

    trackAnalyticsEvent({
      type: 'banner_click',
      targetType: 'banner',
      targetKey: banner.id,
      label: banner.name,
      sourcePath: '/community',
      sourceSection: 'community_feed_banner',
      regionKey: user.regionKey,
    });

    window.open(banner.targetUrl, '_blank', 'noopener,noreferrer');
  };

  const handleBannerRegistration = async (banner: BannerAd) => {
    setSubmittingBannerId(banner.id);

    try {
      const response = await fetch(`/api/banners/${banner.id}/registration`, {
        method: 'POST',
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error ?? 'Nao foi possivel registrar seu interesse.');
      }

      showToast(payload?.message ?? 'Cadastro registrado.', 'success');
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Nao foi possivel registrar seu interesse.',
        'error',
      );
    } finally {
      setSubmittingBannerId(null);
    }
  };

  const displayedPosts = [...posts].sort(
    (left, right) => getPostTimestamp(right) - getPostTimestamp(left),
  );
  const feedBanners = banners.slice(0, 2);
  const getBannerAfterPost = (postIndex: number) => {
    if (displayedPosts.length < 5) {
      return null;
    }

    if (postIndex === 4) {
      return feedBanners[0] ?? null;
    }

    if (postIndex === 12) {
      return feedBanners[1] ?? null;
    }

    return null;
  };

  return (
    <ContentColumn className="animate-in space-y-3 px-5 pb-20 pt-4 fade-in duration-500">
      <div>
        <CommunityComposer.Root>
          <CommunityComposer.AuthorSwitch
            value={postPersonaMode}
            onChange={setPostPersonaMode}
            personalName={user.name}
            professionalName={professionalIdentity?.name}
            professionalDisabled={!canPostAsProfessional}
          />
          <CommunityComposer.Editor
            avatar={composerAvatar}
            avatarHref={composerHref}
            value={postContent}
            onChange={setPostContent}
            placeholder={
              composerMode === 'link'
                ? 'Adicione uma descricao para o link...'
                : composerMode === 'video'
                  ? 'Adicione um contexto para o video...'
                  : isProfessionalMode
                    ? `Publique como ${composerName}...`
                    : 'No que voce esta pensando?'
            }
          />
          {isProfessionalMode ? (
            <div className="rounded-2xl border border-blue-100 bg-blue-50 px-3 py-2 text-[11px] font-bold text-blue-700">
              Publicando como pagina profissional: {composerName}
            </div>
          ) : canPostAsProfessional ? (
            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2 text-[11px] font-bold text-slate-500">
              Publicando como pessoa. Troque para negocio quando a publicacao for comercial ou institucional.
            </div>
          ) : null}
          <CommunityComposer.MediaField
            mode={composerMode}
            imageUrl={postImageUrl}
            externalUrl={postExternalUrl}
            onImageChange={setPostImageUrl}
            onExternalChange={setPostExternalUrl}
          />
          <CommunityComposer.Actions
            mode={composerMode}
            onModeChange={handleComposerModeChange}
            onPublish={handlePublish}
          />
        </CommunityComposer.Root>
      </div>

      <div>
        <div className="flex items-center gap-3 rounded-2xl border border-brand-100 bg-brand-50/60 px-4 py-3 text-foreground">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface text-brand-500">
            <UserPlus size={19} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-caption font-bold uppercase tracking-wide text-brand-600">Faça parte do Gringoou!</p>
            <p className="mt-0.5 text-body-sm font-semibold leading-snug">Convide amigos para fortalecer a comunidade.</p>
            <p className="mt-1 text-caption text-muted-foreground">{referralSummary.registrationCount} indicações confirmadas</p>
          </div>
          <div className="flex shrink-0 gap-1">
            <Button iconOnly size="xs" variant="ghost" aria-label="Copiar link de indicação" onClick={() => void handleCopyReferralLink()}>
              <Copy size={15} aria-hidden="true" />
            </Button>
            <Button iconOnly size="xs" variant="primary" aria-label="Compartilhar indicação" onClick={() => void handleShareReferralLink()}>
              <Share2 size={15} aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {displayedPosts.length === 0 && !postsLoading ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-5 py-8 text-center text-sm font-medium text-slate-500">
            Ninguem publicou por aqui ainda. Seja o primeiro da sua regiao.
          </div>
        ) : null}
        {displayedPosts.map((post, index) => {
          const banner = getBannerAfterPost(index);

          return (
            <React.Fragment key={post.id}>
              <div id={`post-${post.id}`} className={targetPostId === post.id ? 'scroll-mt-24 rounded-card ring-2 ring-brand-200' : 'scroll-mt-24'}>
                <FeedPostCard
                  post={post}
                  onToggleLike={() => handleToggleLike(post.id)}
                  onAddComment={(content) => handleAddComment(post.id, content)}
                  onUpdatePost={(content, imageUrl, externalUrl) =>
                    handleUpdatePost(post.id, content, imageUrl, externalUrl)
                  }
                  onDeletePost={() => handleDeletePost(post.id)}
                  onUpdateComment={(commentId, content) =>
                    handleUpdateComment(post.id, commentId, content)
                  }
                  onDeleteComment={(commentId) => handleDeleteComment(post.id, commentId)}
                  onSharePost={() => handleSharePost(post)}
                />
              </div>
              {banner ? (
                <FeedBannerCard
                  banner={banner}
                  submitting={submittingBannerId === banner.id}
                  onOpen={() => handleBannerLinkClick(banner)}
                  onRegister={() => void handleBannerRegistration(banner)}
                />
              ) : null}
            </React.Fragment>
          );
        })}
        {postsLoading ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-5 py-6 text-center text-sm font-medium text-slate-500">
            Carregando publicacoes...
          </div>
        ) : null}
        {loadingMorePosts ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-5 py-5 text-center text-xs font-semibold text-slate-500">
            Carregando mais publicacoes...
          </div>
        ) : null}
        {postsHasMore ? <div ref={sentinelRef} className="h-1" aria-hidden="true" /> : null}
      </div>
    </ContentColumn>
  );
};

const FeedBannerCard: React.FC<{
  banner: BannerAd;
  submitting: boolean;
  onOpen: () => void;
  onRegister: () => void;
}> = ({ banner, submitting, onOpen, onRegister }) => (
  <ViewableAdSlot banner={banner} placement="FEED">
    <FeedCard.Root variant="sponsored">
      <FeedCard.Header
        avatarUrl={banner.advertiserLogoUrl || DEFAULT_AVATAR_URL}
        avatarAlt={banner.advertiserName || banner.name}
        title={banner.advertiserName || banner.name}
        subtitle={banner.regionLabel || 'Toda a comunidade'}
        badge={<FeedCard.SponsoredBadge />}
        onAvatarError={handleAvatarError}
      />
      {banner.description ? <FeedCard.Content text={banner.description} /> : null}
      <FeedCard.Media src={banner.imageUrl} alt={banner.headline || banner.name} />
      <FeedCard.Headline>{banner.headline || banner.name}</FeedCard.Headline>
      <div className="px-5 pb-4 pt-3">
        {banner.type === 'REGISTRATION' ? (
          <FeedCard.CTA onClick={onRegister} disabled={submitting}>
            <UserPlus size={17} className="mr-2" />
            {submitting ? 'Registrando...' : banner.ctaLabel || 'Tenho interesse'}
          </FeedCard.CTA>
        ) : (
          <FeedCard.CTA onClick={onOpen}>
            <ExternalLink size={17} className="mr-2" />
            {banner.ctaLabel || (banner.goal === 'WHATSAPP' ? 'Falar no WhatsApp' : 'Saiba mais')}
          </FeedCard.CTA>
        )}
      </div>
    </FeedCard.Root>
  </ViewableAdSlot>
);

export default Community;


