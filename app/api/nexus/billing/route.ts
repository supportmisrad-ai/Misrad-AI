import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { requireWorkspaceAccessByOrgSlugApi } from '@/lib/server/workspace';
import { getNexusBillingItems } from '@/lib/services/nexus-billing-service';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
function getOrgSlugFromRequest(request: NextRequest): string | null {
  const headerOrgId = request.headers.get('x-org-id');
  const queryOrgId = request.nextUrl.searchParams.get('orgId');
  return headerOrgId || queryOrgId;
}

async function GETHandler(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgSlug = getOrgSlugFromRequest(request);
    if (!orgSlug) {
      return NextResponse.json({ error: 'Missing orgId' }, { status: 400 });
    }

    const workspace = await requireWorkspaceAccessByOrgSlugApi(orgSlug);

    const payload = await getNexusBillingItems(workspace.id);
    return NextResponse.json({ billing: payload });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}

export const GET = shabbatGuard(GETHandler);
