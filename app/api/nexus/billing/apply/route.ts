import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { requireWorkspaceAccessByOrgSlugApi } from '@/lib/server/workspace';
import { buildNexusBillingItemsForTemplate, setNexusBillingItems } from '@/lib/services/nexus-billing-service';

function getOrgSlugFromRequest(request: NextRequest): string | null {
  const headerOrgId = request.headers.get('x-org-id');
  const queryOrgId = request.nextUrl.searchParams.get('orgId');
  return headerOrgId || queryOrgId;
}

export async function POST(request: NextRequest) {
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
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
