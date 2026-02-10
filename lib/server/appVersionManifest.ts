import 'server-only';

import { asObject, asObjectLoose, getErrorMessage } from '@/lib/shared/unknown';
import { createServiceRoleStorageClient } from '@/lib/supabase';

const DEFAULT_BUCKET = 'public-assets';
const DEFAULT_PATH = 'version.json';

export type AppVersionPlatform = 'windows' | 'android';

export interface AppVersionManifest {
  windows?: { version?: string; url?: string };
  android?: { version?: string; url?: string };

  downloads?: {
    windows?: { version?: string; url?: string; downloadUrl?: string };
    android?: { version?: string; url?: string; downloadUrl?: string };
  };

  windowsDownloadUrl?: string;
  androidDownloadUrl?: string;
}

export type AppVersionManifestSource =
  | { kind: 'env_url'; url: string }
  | { kind: 'supabase_storage'; bucket: string; path: string };

function normalizeUrl(value: unknown): string | null {
  const url = typeof value === 'string' ? value.trim() : '';
  if (!url) return null;
  return url;
}

export function resolvePlatformDownloadUrl(manifest: unknown, platform: AppVersionPlatform): string | null {
  const m = asObjectLoose(manifest);
  if (!m) return null;

  // Shape A: { downloads: { windows: { url } } }
  const downloads = asObject(m.downloads);
  if (downloads) {
    const pObj = asObject(downloads[platform]);
    const fromDownloads = normalizeUrl(pObj?.url) || normalizeUrl(pObj?.downloadUrl);
    if (fromDownloads) return fromDownloads;
  }

  // Shape B: { windows: { url } }
  const directPlatformObj = asObject(m[platform]);
  const fromDirectPlatform = normalizeUrl(directPlatformObj?.url);
  if (fromDirectPlatform) return fromDirectPlatform;

  // Shape C: { windowsDownloadUrl: "..." }
  const legacyKey = platform === 'windows' ? 'windowsDownloadUrl' : 'androidDownloadUrl';
  const fromLegacy = normalizeUrl(m[legacyKey]);
  if (fromLegacy) return fromLegacy;

  return null;
}

export function resolvePlatformVersion(manifest: unknown, platform: AppVersionPlatform): string | null {
  const m = asObjectLoose(manifest);
  if (!m) return null;

  const downloads = asObject(m.downloads);
  if (downloads) {
    const pObj = asObject(downloads[platform]);
    const v = typeof pObj?.version === 'string' ? pObj.version.trim() : '';
    if (v) return v;
  }

  const directPlatformObj = asObject(m[platform]);
  const v2 = typeof directPlatformObj?.version === 'string' ? directPlatformObj.version.trim() : '';
  if (v2) return v2;

  const legacyKey = platform === 'windows' ? 'windowsVersion' : 'androidVersion';
  const v3 = typeof m[legacyKey] === 'string' ? String(m[legacyKey]).trim() : '';
  if (v3) return v3;

  return null;
}

export function compareLooseVersions(a: string, b: string): -1 | 0 | 1 {
  const parse = (v: string) =>
    String(v || '')
      .trim()
      .replace(/^v/i, '')
      .split('.')
      .map((p) => Number.parseInt(p, 10))
      .map((n) => (Number.isFinite(n) ? n : 0));

  const aa = parse(a);
  const bb = parse(b);
  const len = Math.max(aa.length, bb.length);

  for (let i = 0; i < len; i++) {
    const x = aa[i] ?? 0;
    const y = bb[i] ?? 0;
    if (x > y) return 1;
    if (x < y) return -1;
  }

  return 0;
}

export async function getAppVersionManifest(): Promise<{
  manifest: AppVersionManifest | null;
  source: AppVersionManifestSource | null;
  error: string | null;
}> {
  const envUrlRaw = normalizeUrl(process.env.MISRAD_VERSION_MANIFEST_URL);
  if (envUrlRaw) {
    try {
      const res = await fetch(envUrlRaw, { cache: 'no-store' });
      if (!res.ok) {
        return {
          manifest: null,
          source: { kind: 'env_url', url: envUrlRaw },
          error: `Failed to fetch manifest (HTTP ${res.status})`,
        };
      }
      const data: unknown = await res.json();
      const obj = asObjectLoose(data);
      return {
        manifest: (obj as AppVersionManifest) || null,
        source: { kind: 'env_url', url: envUrlRaw },
        error: obj ? null : 'Manifest is not an object',
      };
    } catch (e: unknown) {
      return {
        manifest: null,
        source: { kind: 'env_url', url: envUrlRaw },
        error: getErrorMessage(e) || 'Failed to fetch manifest',
      };
    }
  }

  const bucket = String(process.env.MISRAD_VERSION_MANIFEST_BUCKET || DEFAULT_BUCKET).trim() || DEFAULT_BUCKET;
  const path = String(process.env.MISRAD_VERSION_MANIFEST_PATH || DEFAULT_PATH).trim() || DEFAULT_PATH;

  try {
    const supabase = createServiceRoleStorageClient({ allowUnscoped: true, reason: 'app_version_manifest_read' });
    const { data: downloadData, error: downloadError } = await supabase.storage.from(bucket).download(path);
    if (downloadError || !downloadData) {
      return {
        manifest: null,
        source: { kind: 'supabase_storage', bucket, path },
        error: downloadError?.message || 'Failed to download manifest',
      };
    }

    const text = await downloadData.text();
    const parsed: unknown = JSON.parse(text);
    const obj = asObjectLoose(parsed);

    return {
      manifest: (obj as AppVersionManifest) || null,
      source: { kind: 'supabase_storage', bucket, path },
      error: obj ? null : 'Manifest is not an object',
    };
  } catch (e: unknown) {
    return {
      manifest: null,
      source: { kind: 'supabase_storage', bucket, path },
      error: getErrorMessage(e) || 'Failed to load manifest',
    };
  }
}
