import 'server-only';

import { supabase } from '@/lib/supabase';

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

export async function resolveStorageUrlMaybe(
  refOrUrl: string | null | undefined,
  ttlSeconds: number,
  scope: { organizationId: string; orgSlug?: string | null }
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
    const sb = supabase;
    if (!sb) return null;
    const { data, error } = await sb.storage.from(parsed.bucket).createSignedUrl(parsed.path, ttlSeconds);
    if (error || !data?.signedUrl) return null;
    return String(data.signedUrl);
  } catch {
    return null;
  }
}
