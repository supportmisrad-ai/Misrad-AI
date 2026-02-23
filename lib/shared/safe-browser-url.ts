/**
 * Returns the URL only if it's safe to use in the browser (http/https/data/blob).
 * Filters out internal `sb://` storage refs that should never reach <img src>.
 */
export function safeBrowserUrl(url: string | null | undefined): string | null {
  const s = url === null || url === undefined ? '' : String(url).trim();
  if (!s) return null;
  if (
    s.startsWith('http://') ||
    s.startsWith('https://') ||
    s.startsWith('data:') ||
    s.startsWith('blob:')
  ) {
    return s;
  }
  return null;
}
