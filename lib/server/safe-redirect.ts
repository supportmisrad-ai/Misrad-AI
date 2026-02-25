/**
 * Safe redirect URL validation — prevents open-redirect attacks.
 * Only allows redirects to trusted domains (Supabase storage, own domain, GitHub releases).
 */

const TRUSTED_HOSTNAME_PATTERNS: Array<string | RegExp> = [
  // Supabase storage signed URLs
  /^[a-z0-9-]+\.supabase\.co$/,
  /^[a-z0-9-]+\.supabase\.in$/,
  // Own domain
  'misrad-ai.com',
  'www.misrad-ai.com',
  // GitHub releases (for binary downloads)
  'github.com',
  'objects.githubusercontent.com',
  // Google Drive (potential download host)
  'drive.google.com',
  'drive.usercontent.google.com',
];

/**
 * Returns true if the given URL string points to a trusted host.
 * Rejects javascript:, data:, or any scheme other than https (http allowed only for localhost dev).
 */
export function isSafeRedirectUrl(url: string): boolean {
  if (!url) return false;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  // Only allow https (and http for localhost in dev)
  if (parsed.protocol === 'http:') {
    if (parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') {
      return false;
    }
  } else if (parsed.protocol !== 'https:') {
    return false;
  }

  const hostname = parsed.hostname.toLowerCase();

  for (const pattern of TRUSTED_HOSTNAME_PATTERNS) {
    if (typeof pattern === 'string') {
      if (hostname === pattern) return true;
    } else if (pattern.test(hostname)) {
      return true;
    }
  }

  return false;
}
