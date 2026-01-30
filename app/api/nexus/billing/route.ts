import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getNexusBillingItems } from '@/lib/services/nexus-billing-service';
import { APIError, getWorkspaceOrThrow } from '@/lib/server/api-workspace';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

async function GETHandler(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workspace } = await getWorkspaceOrThrow(request);

    const payload = await getNexusBillingItems(workspace.id);
    return NextResponse.json({ billing: payload });
  } catch (error: any) {
    if (error instanceof APIError) {
      return NextResponse.json({ error: error.message || 'Forbidden' }, { status: error.status });
    }
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}

export const GET = shabbatGuard(GETHandler);
