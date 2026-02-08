import { NextResponse } from 'next/server';
import { requireWorkspaceAccessByOrgSlugApi } from '@/lib/server/workspace';
import { assertNoProdEntitlementsBypass, isBypassModuleEntitlementsEnabled } from '@/lib/server/workspace';
import { getErrorStatus } from '@/lib/server/workspace-access/utils';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
async function GETHandler(
  _req: Request,
  { params }: { params: { orgSlug: string } }
) {
  const { orgSlug } = params;

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
    return NextResponse.json({ entitlements: {} }, { status });
  }
}

export const GET = shabbatGuard(GETHandler);
