import 'server-only';

import { createStorageClientMaybe } from '@/lib/supabase';
import { asObject } from '@/lib/shared/unknown';

type StorageScope = { organizationId: string; orgSlug?: string | null };

type StorageBucketApi = {
  createSignedUrls?: (paths: string[], expiresIn: number) => Promise<{ data: unknown; error: unknown }>;
  createSignedUrl?: (path: string, expiresIn: number) => Promise<{ data: unknown; error: unknown }>;
};

type StorageClientLike = {
  storage: {
    from: (bucket: string) => StorageBucketApi;
  };
};

function isStorageClientLike(value: unknown): value is StorageClientLike {
  const obj = asObject(value);
  if (!obj) return false;
  const storage = asObject(obj.storage);
  if (!storage) return false;
  return typeof storage.from === 'function';
}

export function toSbRefMaybe(refOrUrl: string | null | undefined): string | null {
  const raw = refOrUrl === null || refOrUrl === undefined ? '' : String(refOrUrl).trim();
  if (!raw) return null;
  if (raw.startsWith('sb://')) return raw;

  const base = String(process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  if (!base) return null;

  try {
    const baseUrl = new URL(base);
    const inputUrl = new URL(raw);
    if (baseUrl.origin !== inputUrl.origin) return null;

    const m = inputUrl.pathname.match(/^\/storage\/v1\/object\/(public|sign|authenticated)\/([^/]+)\/(.+)$/);
    if (!m) return null;
    const bucket = decodeURIComponent(String(m[2] || '').trim());
    const path = decodeURIComponent(String(m[3] || '').trim());
    if (!bucket || !path) return null;
    return `sb://${bucket}/${path}`;
  } catch {
    return null;
  }
}

export function parseSbRef(ref: string): { bucket: string; path: string } | null {
  const s = String(ref || '').trim();
  if (!s.startsWith('sb://')) return null;
  const rest = s.slice('sb://'.length);
  const slash = rest.indexOf('/');
  if (slash <= 0) return null;
  const bucket = rest.slice(0, slash).trim();
  const path = rest.slice(slash + 1);
  if (!bucket || !path) return null;
  return { bucket, path };
}

export function assertStoragePathScoped(params: {
  rawRef: string;
  path: string;
  organizationId: string;
  orgSlug?: string | null;
}) {
  const orgId = String(params.organizationId || '').trim();
  if (!orgId) {
    throw new Error('[TenantIsolation] Missing organizationId for storage scope validation.');
  }

  const segments = String(params.path || '')
    .split('/')
    .map((s) => s.trim())
    .filter(Boolean);

  if (!segments.length || segments[0] !== orgId) {
    throw new Error(
      `[TenantIsolation] Storage ref blocked: path must start with organizationId. expected=${orgId} ref=${params.rawRef}`
    );
  }

  if (params.orgSlug) {
    const slug = String(params.orgSlug).trim();
    if (slug && !segments.includes(slug)) {
      throw new Error(
        `[TenantIsolation] Storage ref blocked: orgSlug not present in path. expectedSlug=${slug} ref=${params.rawRef}`
      );
    }
  }
}

function chunkArray<T>(arr: T[], chunkSize: number): T[][] {
  const size = Math.max(1, Math.floor(chunkSize));
  if (arr.length <= size) return [arr];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function extractSignedUrlsPayload(data: unknown): unknown[] {
  if (!data) return [];
  const obj = data as Record<string, unknown>;
  const signedUrls = obj && Array.isArray(obj.signedUrls) ? (obj.signedUrls as unknown[]) : null;
  if (signedUrls) return signedUrls;
  return Array.isArray(data) ? (data as unknown[]) : [];
}

export async function resolveStorageUrlsMaybeBatched(
  refsOrUrls: Array<string | null | undefined>,
  ttlSeconds: number,
  scope: StorageScope
): Promise<(string | null)[]> {
  const raw = createStorageClientMaybe();
  const sb = isStorageClientLike(raw) ? raw : null;
  if (!sb) {
    const inputs = Array.isArray(refsOrUrls) ? refsOrUrls : [];
    return inputs.map(() => null);
  }

  return resolveStorageUrlsMaybeBatchedWithClient(sb, refsOrUrls, ttlSeconds, scope);
}

export async function resolveStorageUrlsMaybeBatchedWithClient(
  client: StorageClientLike,
  refsOrUrls: Array<string | null | undefined>,
  ttlSeconds: number,
  scope: StorageScope
): Promise<(string | null)[]> {
  const inputs = Array.isArray(refsOrUrls) ? refsOrUrls : [];
  if (!inputs.length) return [];

  const sb = client;

  const parsedRefs: Array<{ bucket: string; path: string; raw: string; index: number }> = [];
  const out: (string | null)[] = inputs.map(() => null);

  for (let i = 0; i < inputs.length; i++) {
    const raw = inputs[i] === null || inputs[i] === undefined ? '' : String(inputs[i]).trim();
    if (!raw) continue;
    const parsed = parseSbRef(raw);
    if (!parsed) {
      out[i] = raw;
      continue;
    }

    try {
      assertStoragePathScoped({
        rawRef: raw,
        path: parsed.path,
        organizationId: scope.organizationId,
        orgSlug: scope.orgSlug,
      });
    } catch {
      continue;
    }

    parsedRefs.push({ bucket: parsed.bucket, path: parsed.path, raw, index: i });
  }

  if (!parsedRefs.length) return out;

  const byBucket = new Map<string, Set<string>>();
  for (const p of parsedRefs) {
    const set = byBucket.get(p.bucket) ?? new Set<string>();
    set.add(p.path);
    byBucket.set(p.bucket, set);
  }

  const signedByBucketPath = new Map<string, Map<string, string>>();

  for (const [bucket, pathsSet] of byBucket.entries()) {
    const uniquePaths = Array.from(pathsSet);
    const bucketApi = sb.storage.from(bucket);

    if (typeof bucketApi.createSignedUrls === 'function') {
      const chunks = chunkArray(uniquePaths, 50);
      for (const chunk of chunks) {
        try {
          const { data, error } = await bucketApi.createSignedUrls(
            chunk,
            ttlSeconds
          );
          if (error) continue;

          const items = extractSignedUrlsPayload(data);
          for (const item of items) {
            const obj = item && typeof item === 'object' && !Array.isArray(item) ? (item as Record<string, unknown>) : null;
            if (!obj) continue;
            const path = typeof obj.path === 'string' ? obj.path : null;
            const signedUrl = typeof obj.signedUrl === 'string' ? obj.signedUrl : null;
            const itemError = obj.error;
            if (!path || !signedUrl) continue;
            if (itemError) continue;
            const bucketMap = signedByBucketPath.get(bucket) ?? new Map<string, string>();
            bucketMap.set(path, signedUrl);
            signedByBucketPath.set(bucket, bucketMap);
          }
        } catch {
          continue;
        }
      }

      continue;
    }

    if (typeof bucketApi.createSignedUrl === 'function') {
      for (const path of uniquePaths) {
        try {
          const { data, error } = await bucketApi.createSignedUrl(
            path,
            ttlSeconds
          );
          const signedUrl =
            data && typeof data === 'object' && !Array.isArray(data) && 'signedUrl' in (data as Record<string, unknown>)
              ? (data as Record<string, unknown>).signedUrl
              : null;
          if (error || typeof signedUrl !== 'string' || !signedUrl) continue;
          const bucketMap = signedByBucketPath.get(bucket) ?? new Map<string, string>();
          bucketMap.set(path, signedUrl);
          signedByBucketPath.set(bucket, bucketMap);
        } catch {
          continue;
        }
      }
    }
  }

  for (const p of parsedRefs) {
    const bucketMap = signedByBucketPath.get(p.bucket);
    const signed = bucketMap?.get(p.path);
    out[p.index] = signed ? String(signed) : null;
  }

  return out;
}

export async function resolveStorageUrlMaybe(
  refOrUrl: string | null | undefined,
  ttlSeconds: number,
  scope: StorageScope
): Promise<string | null> {
  const raw = refOrUrl === null || refOrUrl === undefined ? '' : String(refOrUrl).trim();
  if (!raw) return null;

  const parsed = parseSbRef(raw);
  if (!parsed) return raw;

  try {
    assertStoragePathScoped({
      rawRef: raw,
      path: parsed.path,
      organizationId: scope.organizationId,
      orgSlug: scope.orgSlug,
    });
    const sb = createStorageClientMaybe();
    if (!sb) return null;
    const { data, error } = await sb.storage.from(parsed.bucket).createSignedUrl(parsed.path, ttlSeconds);
    if (error || !data?.signedUrl) return null;
    return String(data.signedUrl);
  } catch {
    return null;
  }
}
