import { NextResponse } from 'next/server';
import { requireWorkspaceAccessByOrgSlugApi } from '@/lib/server/workspace';
import { assertNoProdEntitlementsBypass, isBypassModuleEntitlementsEnabled } from '@/lib/server/workspace';
import { getErrorStatus } from '@/lib/server/workspace-access/utils';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
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
    const workspace = await requireWorkspaceAccessByOrgSlugApi(orgSlug);
    return NextResponse.json({ entitlements: workspace.entitlements ?? {} }, { status: 200 });
  } catch (e: unknown) {
    const status = getErrorStatus(e) ?? 403;
    const isProd = process.env.NODE_ENV === 'production';
    const error = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ entitlements: {}, ...(isProd ? {} : { error }) }, { status });
  }
}

export const GET = shabbatGuard(GETHandler);
