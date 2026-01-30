export function getEmbedUrl(rawUrl: string | null | undefined): string {
  const input = String(rawUrl || '').trim();
  if (!input) return '';

  // If it's already an embed URL (or something that looks like one), keep as-is.
  // We'll still normalize Loom share -> embed below.

  let url: URL | null = null;
  try {
    url = new URL(input);
  } catch {
    return input;
  }

  const host = url.hostname.toLowerCase().replace(/^www\./, '');

  // Loom
  // loom.com/share/ID -> loom.com/embed/ID
  if (host === 'loom.com') {
    const shareMatch = url.pathname.match(/^\/share\/([a-zA-Z0-9]+)(?:\/)?$/);
    if (shareMatch) {
      return `https://www.loom.com/embed/${shareMatch[1]}`;
    }

    const embedMatch = url.pathname.match(/^\/embed\/([a-zA-Z0-9]+)(?:\/)?$/);
    if (embedMatch) {
      return `https://www.loom.com/embed/${embedMatch[1]}`;
    }

    return input;
  }

  // YouTube
  // - youtube.com/watch?v=ID
  // - youtu.be/ID
  // -> youtube.com/embed/ID
  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
    const isWatch = url.pathname === '/watch';
    if (isWatch) {
      const id = url.searchParams.get('v');
      if (id) return `https://www.youtube.com/embed/${id}`;
    }

    const embedMatch = url.pathname.match(/^\/embed\/([^/]+)$/);
    if (embedMatch) {
      return `https://www.youtube.com/embed/${embedMatch[1]}`;
    }

    const shortMatch = url.pathname.match(/^\/shorts\/([^/]+)$/);
    if (shortMatch) {
      return `https://www.youtube.com/embed/${shortMatch[1]}`;
    }

    return input;
  }

  if (host === 'youtu.be') {
    const id = url.pathname.replace(/^\//, '').split('/')[0];
    if (id) return `https://www.youtube.com/embed/${id}`;
    return input;
  }

  // Vimeo
  // Accept:
  // - vimeo.com/ID
  // - player.vimeo.com/video/ID
  // -> player.vimeo.com/video/ID
  if (host === 'vimeo.com') {
    const id = url.pathname.replace(/^\//, '').split('/')[0];
    if (id && /^\d+$/.test(id)) {
      return `https://player.vimeo.com/video/${id}`;
    }
    return input;
  }

  if (host === 'player.vimeo.com') {
    const match = url.pathname.match(/^\/video\/(\d+)(?:\/)?$/);
    if (match) return `https://player.vimeo.com/video/${match[1]}`;
    return input;
  }

  return input;
}

export type VideoProvider = 'youtube' | 'loom' | 'vimeo' | 'unknown';

export function getVideoProvider(rawUrl: string | null | undefined): VideoProvider {
  const input = String(rawUrl || '').trim();
  if (!input) return 'unknown';

  let url: URL | null = null;
  try {
    url = new URL(input);
  } catch {
    return 'unknown';
  }

  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  if (host === 'loom.com') return 'loom';
  if (host === 'youtu.be' || host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') return 'youtube';
  if (host === 'vimeo.com' || host === 'player.vimeo.com') return 'vimeo';
  return 'unknown';
}
