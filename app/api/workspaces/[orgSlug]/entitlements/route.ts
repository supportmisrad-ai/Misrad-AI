import { NextResponse } from 'next/server';
import { requireWorkspaceAccessByOrgSlugApi } from '@/lib/server/workspace';
import { assertNoProdEntitlementsBypass, isBypassModuleEntitlementsEnabled } from '@/lib/server/workspace';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
async function GETHandler(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string }> }
) {
  const { orgSlug } = await params;

  const bypassEntitlementsE2e = isBypassModuleEntitlementsEnabled();
  if (bypassEntitlementsE2e) {
    assertNoProdEntitlementsBypass('api/workspaces/[orgSlug]/entitlements');
    return NextResponse.json({ entitlements: {} }, { status: 200 });
  }

  try {
    const workspace = await requireWorkspaceAccessByOrgSlugApi(orgSlug);
    return NextResponse.json({ entitlements: workspace.entitlements ?? {} }, { status: 200 });
  } catch (e: any) {
    const status = typeof e?.status === 'number' ? e.status : 403;
    return NextResponse.json({ entitlements: {} }, { status });
  }
}

export const GET = shabbatGuard(GETHandler);
