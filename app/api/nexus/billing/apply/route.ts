import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { buildNexusBillingItemsForTemplate, setNexusBillingItems } from '@/lib/services/nexus-billing-service';
import { APIError, getWorkspaceOrThrow } from '@/lib/server/api-workspace';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

async function POSTHandler(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workspace } = await getWorkspaceOrThrow(request);

    const body = await request.json();
    const templateKey = String(body?.templateKey || '').trim() as 'retainer_fixed' | 'deliverables_package';

    if (templateKey !== 'retainer_fixed' && templateKey !== 'deliverables_package') {
      return NextResponse.json({ error: 'Invalid templateKey' }, { status: 400 });
    }

    const billingItems = buildNexusBillingItemsForTemplate(templateKey);
    await setNexusBillingItems({
      workspaceId: workspace.id,
      templateKey,
      items: billingItems,
    });

    return NextResponse.json({ ok: true, itemsCount: billingItems.length });
  } catch (error: any) {
    if (error instanceof APIError) {
      return NextResponse.json({ error: error.message || 'Forbidden' }, { status: error.status });
    }
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}

export const POST = shabbatGuard(POSTHandler);
