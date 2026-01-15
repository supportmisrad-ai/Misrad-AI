import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { requireWorkspaceAccessByOrgSlugApi } from '@/lib/server/workspace';
import { getNexusOnboardingTemplate, setNexusOnboardingTemplate } from '@/lib/services/nexus-onboarding-service';

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
    const template = await getNexusOnboardingTemplate(workspace.id);
    return NextResponse.json({ template });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}

async function POSTHandler(request: NextRequest) {
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

    const templateKey = String(body?.templateKey || '').trim();
    if (!templateKey) {
      return NextResponse.json({ error: 'templateKey is required' }, { status: 400 });
    }

    if (templateKey !== 'retainer_fixed' && templateKey !== 'deliverables_package') {
      return NextResponse.json({ error: 'Invalid templateKey' }, { status: 400 });
    }

    await setNexusOnboardingTemplate({
      workspaceId: workspace.id,
      templateKey,
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}

export const GET = shabbatGuard(GETHandler);

export const POST = shabbatGuard(POSTHandler);
