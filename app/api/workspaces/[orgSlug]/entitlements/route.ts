import { NextResponse } from 'next/server';
import { requireWorkspaceAccessByOrgSlugApi } from '@/lib/server/workspace';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
async function GETHandler(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string }> }
) {
  const { orgSlug } = await params;

  const workspace = await requireWorkspaceAccessByOrgSlugApi(orgSlug);
  return NextResponse.json({ entitlements: workspace.entitlements });
}

export const GET = shabbatGuard(GETHandler);
