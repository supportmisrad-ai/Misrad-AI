import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getNexusOnboardingTemplate, setNexusOnboardingTemplate } from '@/lib/services/nexus-onboarding-service';
import { getAuthenticatedUser } from '@/lib/auth';
import { withTenantIsolationContext } from '@/lib/prisma-tenant-guard';
import { APIError, getWorkspaceOrThrow } from '@/lib/server/api-workspace';
import { isCeoRole } from '@/lib/constants/roles';
import { asObject, getErrorMessage } from '@/lib/server/workspace-access/utils';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

const IS_PROD = process.env.NODE_ENV === 'production';

async function GETHandler(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workspace } = await getWorkspaceOrThrow(request);

    const orgId = String(workspace.id);
    return await withTenantIsolationContext(
      {
        source: 'api_nexus_onboarding_template',
        reason: 'GET',
        organizationId: orgId,
      },
      async () => {
        const template = await getNexusOnboardingTemplate(orgId);
        return NextResponse.json({ template });
      }
    );
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
    const safeMsg = 'Internal server error';
    return NextResponse.json(
      { error: IS_PROD ? safeMsg : getErrorMessage(error) || safeMsg },
      { status: 500 }
    );
  }
}

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

    const templateKey = String(bodyObj.templateKey || '').trim();
    if (!templateKey) {
      return NextResponse.json({ error: 'templateKey is required' }, { status: 400 });
    }

    if (templateKey !== 'retainer_fixed' && templateKey !== 'deliverables_package') {
      return NextResponse.json({ error: 'Invalid templateKey' }, { status: 400 });
    }

    const orgId = String(workspace.id);
    return await withTenantIsolationContext(
      {
        source: 'api_nexus_onboarding_template',
        reason: 'POST',
        organizationId: orgId,
      },
      async () => {
        await setNexusOnboardingTemplate({
          workspaceId: orgId,
          templateKey,
        });

        return NextResponse.json({ ok: true });
      }
    );
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
    const safeMsg = 'Internal server error';
    return NextResponse.json(
      { error: IS_PROD ? safeMsg : getErrorMessage(error) || safeMsg },
      { status: 500 }
    );
  }
}

export const GET = shabbatGuard(GETHandler);

export const POST = shabbatGuard(POSTHandler);
