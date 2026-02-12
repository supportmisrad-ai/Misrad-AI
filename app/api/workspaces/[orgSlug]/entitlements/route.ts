import { NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { assertNoProdEntitlementsBypass, isBypassModuleEntitlementsEnabled, requireWorkspaceAccessByOrgSlugApi } from '@/lib/server/workspace';
import { getErrorStatus } from '@/lib/server/workspace-access/utils';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

type CacheEntry<T> = { value: T; expiresAt: number };
const entitlementsCache = new Map<string, CacheEntry<Record<string, boolean>>>();
const entitlementsInFlight = new Map<string, Promise<Record<string, boolean>>>();
const ENTITLEMENTS_TTL_MS = 30_000;

async function GETHandler(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string }> | { orgSlug: string } }
) {
  const resolvedParams = await Promise.resolve(params as unknown);
  const orgSlug = typeof (resolvedParams as { orgSlug?: unknown } | null)?.orgSlug === 'string'
    ? String((resolvedParams as { orgSlug: string }).orgSlug)
    : '';

  if (!orgSlug) {
    return NextResponse.json({ entitlements: {}, error: 'orgSlug is required' }, { status: 400 });
  }

  const bypassEntitlementsE2e = isBypassModuleEntitlementsEnabled();
  if (bypassEntitlementsE2e) {
    assertNoProdEntitlementsBypass('api/workspaces/[orgSlug]/entitlements');
    return NextResponse.json({ entitlements: {} }, { status: 200 });
  }

  try {
    const clerkUserId = await getCurrentUserId();
    if (!clerkUserId) {
      return NextResponse.json({ entitlements: {} }, { status: 401 });
    }

    const cacheKey = `${clerkUserId}:${orgSlug}`;
    const cached = entitlementsCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json({ entitlements: cached.value ?? {} }, { status: 200 });
    }

    const inFlight = entitlementsInFlight.get(cacheKey);
    if (inFlight) {
      const value = await inFlight;
      return NextResponse.json({ entitlements: value ?? {} }, { status: 200 });
    }

    const loadPromise = (async () => {
      const workspace = await requireWorkspaceAccessByOrgSlugApi(String(orgSlug || ''));
      const value = (workspace?.entitlements ?? {}) as Record<string, boolean>;
      entitlementsCache.set(cacheKey, { value, expiresAt: Date.now() + ENTITLEMENTS_TTL_MS });
      return value;
    })();

    entitlementsInFlight.set(cacheKey, loadPromise);
    try {
      const value = await loadPromise;
      return NextResponse.json({ entitlements: value ?? {} }, { status: 200 });
    } finally {
      entitlementsInFlight.delete(cacheKey);
    }
  } catch (e: unknown) {
    const status = getErrorStatus(e) ?? 403;
    const isProd = process.env.NODE_ENV === 'production';
    const error = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ entitlements: {}, ...(isProd ? {} : { error }) }, { status });
  }
}

export const GET = shabbatGuard(GETHandler);
