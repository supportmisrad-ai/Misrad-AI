import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { buildNexusBillingItemsForTemplate, setNexusBillingItems } from '@/lib/services/nexus-billing-service';
import { getAuthenticatedUser } from '@/lib/auth';
import { APIError, getWorkspaceOrThrow } from '@/lib/server/api-workspace';
import { isCeoRole } from '@/lib/constants/roles';
import { asObject, getErrorMessage } from '@/lib/server/workspace-access/utils';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

const IS_PROD = process.env.NODE_ENV === 'production';

async function POSTHandler(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getAuthenticatedUser();
    if (!isCeoRole(user.role) && !user.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { workspace } = await getWorkspaceOrThrow(request);

    const bodyJson: unknown = await request.json().catch(() => ({}));
    const bodyObj = asObject(bodyJson) ?? {};
    const templateKeyCandidate = String(bodyObj.templateKey || '').trim();
    const templateKey: 'retainer_fixed' | 'deliverables_package' | null =
      templateKeyCandidate === 'retainer_fixed' || templateKeyCandidate === 'deliverables_package' ? templateKeyCandidate : null;

    if (!templateKey) {
      return NextResponse.json({ error: 'Invalid templateKey' }, { status: 400 });
    }

    const billingItems = buildNexusBillingItemsForTemplate(templateKey);
    await setNexusBillingItems({
      workspaceId: workspace.id,
      templateKey,
      items: billingItems,
    });

    return NextResponse.json({ ok: true, itemsCount: billingItems.length });
  } catch (error: unknown) {
    if (error instanceof APIError) {
      const safeMsg =
        error.status === 400
          ? 'Bad request'
          : error.status === 401
            ? 'Unauthorized'
            : error.status === 404
              ? 'Not found'
              : 'Forbidden';
      return NextResponse.json(
        { error: IS_PROD ? safeMsg : error.message || safeMsg },
        { status: error.status }
      );
    }
    const safeMsg = 'Internal server error';
    return NextResponse.json(
      { error: IS_PROD ? safeMsg : getErrorMessage(error) || safeMsg },
      { status: 500 }
    );
  }
}

export const POST = shabbatGuard(POSTHandler);
