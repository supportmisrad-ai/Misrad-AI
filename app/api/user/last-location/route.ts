import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { OSModuleKey } from '@/lib/os/modules/types';
import { getWorkspaceByOrgKeyOrThrow } from '@/lib/server/api-workspace';
import { logAuditEvent } from '@/lib/audit';
import { apiError, apiSuccess } from '@/lib/server/api-response';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

function getErrorStatus(error: unknown): number {
  const obj = error && typeof error === 'object' && !Array.isArray(error) ? (error as Record<string, unknown>) : null;
  const status = obj?.status;
  return typeof status === 'number' ? status : 403;
}
type LastLocationPayload = {
  orgSlug?: string | null;
  module?: OSModuleKey | null;
};

async function safeUpdateLastLocation({
  clerkUserId,
  orgSlug,
  moduleKey,
}: {
  clerkUserId: string;
  orgSlug: string | null;
  moduleKey: OSModuleKey | null;
}) {
  const updateData: Record<string, unknown> = {
    updated_at: new Date(),
  };

  if (orgSlug) updateData.last_location_org = orgSlug;
  if (moduleKey) updateData.last_module = moduleKey;

  if (Object.keys(updateData).length === 1) {
    return;
  }

  await prisma.organizationUser.update({
    where: { clerk_user_id: clerkUserId },
    data: updateData,
  });
}

async function GETHandler() {
  const clerkUserId = await getCurrentUserId();
  if (!clerkUserId) {
    return apiError('Unauthorized', { status: 401 });
  }

  const data = await prisma.organizationUser.findUnique({
    where: { clerk_user_id: clerkUserId },
    select: { last_location_org: true, last_module: true },
  });

  await logAuditEvent('data.read', 'user.last-location', {
    details: {
      clerkUserId,
      orgSlug: data?.last_location_org ?? null,
      module: (data?.last_module as OSModuleKey | null) ?? null,
    },
  });

  return apiSuccess({
    orgSlug: data?.last_location_org ?? null,
    module: (data?.last_module as OSModuleKey | null) ?? null,
  });
}

async function POSTHandler(req: NextRequest) {
  const clerkUserId = await getCurrentUserId();
  if (!clerkUserId) {
    return apiError('Unauthorized', { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as LastLocationPayload;
  const orgSlug = body?.orgSlug ? String(body.orgSlug) : null;
  const moduleKey = (body?.module ?? null) as OSModuleKey | null;

  if (orgSlug) {
    try {
      await getWorkspaceByOrgKeyOrThrow(orgSlug);
    } catch (e: unknown) {
      return apiError(e, { status: getErrorStatus(e) });
    }
  }

  try {
    await safeUpdateLastLocation({ clerkUserId, orgSlug, moduleKey });
  } catch (e) {
    return apiError(e, { status: 500, message: 'Failed to persist last location' });
  }

  await logAuditEvent('data.write', 'user.last-location', {
    details: { clerkUserId, orgSlug, moduleKey },
  });

  return apiSuccess({ ok: true });
}

export const GET = shabbatGuard(GETHandler);

export const POST = shabbatGuard(POSTHandler);
