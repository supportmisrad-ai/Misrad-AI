import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { getAuthenticatedUser } from '@/lib/auth';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { APIError, getWorkspaceContextOrThrow } from '@/lib/server/api-workspace';
import { aggregateOrgSnapshot } from '@/lib/services/ai/cross-module-aggregator';
import { shabbatGuard } from '@/lib/api-shabbat-guard';

export const runtime = 'nodejs';

const IS_PROD = process.env.NODE_ENV === 'production';

async function GETHandler(req: NextRequest, { params }: { params: { orgSlug: string } }) {
  try {
    await getAuthenticatedUser();

    const clerkUserId = await getCurrentUserId();
    if (!clerkUserId) return apiError('Unauthorized', { status: 401 });

    const resolvedParams = await Promise.resolve(params);
    const { orgSlug } = resolvedParams;
    if (!orgSlug) return apiError('orgSlug is required', { status: 400 });

    const { workspace } = await getWorkspaceContextOrThrow(req, { params: resolvedParams });
    const organizationId = workspace.id;

    const snapshot = await aggregateOrgSnapshot(organizationId);

    return apiSuccess({
      alerts: snapshot.alerts,
      generatedAt: snapshot.generatedAt,
    });
  } catch (e: unknown) {
    if (e instanceof APIError) {
      const safeMsg = IS_PROD ? 'Internal server error' : (e.message || 'Error');
      return apiError(e, { status: e.status, message: safeMsg });
    }
    return apiError(e, { message: 'Failed to get attention alerts' });
  }
}

export const GET = shabbatGuard(GETHandler);
