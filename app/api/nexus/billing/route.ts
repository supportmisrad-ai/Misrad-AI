import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getNexusBillingItems } from '@/lib/services/nexus-billing-service';
import { APIError, getWorkspaceOrThrow } from '@/lib/server/api-workspace';
import { getErrorMessage } from '@/lib/server/workspace-access/utils';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

const IS_PROD = process.env.NODE_ENV === 'production';

async function GETHandler(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workspace } = await getWorkspaceOrThrow(request);

    const payload = await getNexusBillingItems(workspace.id);
    return NextResponse.json({ billing: payload });
  } catch (error: unknown) {
    if (error instanceof APIError) {
      const safeMsg =
        error.status === 400
          ? 'Bad request'
          : error.status === 401
            ? 'Unauthorized'
            : error.status === 404
              ? 'Not found'
              : error.status === 500
                ? 'Internal server error'
                : 'Forbidden';
      return NextResponse.json(
        { error: IS_PROD ? safeMsg : error.message || safeMsg },
        { status: error.status }
      );
    }
    if (!IS_PROD) {
      return NextResponse.json({ billing: null }, { status: 200 });
    }
    const safeMsg = 'Internal server error';
    return NextResponse.json({ error: safeMsg }, { status: 500 });
  }
}

export const GET = shabbatGuard(GETHandler);
