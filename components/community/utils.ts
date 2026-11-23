export type ComposerMode = 'text' | 'photo' | 'link' | 'video';

export const isYoutubeUrl = (value?: string | null) => {
  if (!value) {
    return false;
  }

  return /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)/i.test(value);
};

export const buildYoutubeEmbedUrl = (value?: string | null) => {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);

    if (url.hostname.includes('youtu.be')) {
      const videoId = url.pathname.replace('/', '');
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }

    if (url.hostname.includes('youtube.com')) {
      if (url.pathname.startsWith('/embed/')) {
        return value;
      }

      const videoId = url.searchParams.get('v');
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }
  } catch {
    return null;
  }

  return null;
};

export const getExternalHostname = (value?: string | null) => {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).hostname.replace(/^www\./, '');
  } catch {
    return value;
  }
};

export const formatRelativeTime = (value: string) => {
  const date = new Date(value).getTime();
  const diffMinutes = Math.max(1, Math.round((Date.now() - date) / 60000));

  if (diffMinutes < 60) {
    return `${diffMinutes} min atrás`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} h atrás`;
  }

  return `${Math.round(diffHours / 24)} d atrás`;
};
