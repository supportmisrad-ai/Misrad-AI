import { NextResponse } from 'next/server';
import { requireWorkspaceAccessByOrgSlugApi } from '@/lib/server/workspace';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
async function GETHandler(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string }> }
) {
  const { orgSlug } = await params;

  const bypassEntitlementsE2e =
    String(process.env.E2E_BYPASS_MODULE_ENTITLEMENTS || '').toLowerCase() === '1' ||
    String(process.env.E2E_BYPASS_MODULE_ENTITLEMENTS || '').toLowerCase() === 'true';

  if (bypassEntitlementsE2e) {
    return NextResponse.json({ entitlements: {} }, { status: 200 });
  }

  try {
    const workspace = await requireWorkspaceAccessByOrgSlugApi(orgSlug);
    return NextResponse.json({ entitlements: workspace.entitlements ?? {} }, { status: 200 });
  } catch (e: any) {
    console.error('[API] Error in /api/workspaces/[orgSlug]/entitlements GET:', e);
    return NextResponse.json({ entitlements: {} }, { status: 200 });
  }
}

export const GET = shabbatGuard(GETHandler);
