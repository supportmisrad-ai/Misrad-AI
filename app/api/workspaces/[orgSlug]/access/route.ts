import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { APIError, getWorkspaceContextOrThrow } from '@/lib/server/api-workspace';
import { logAuditEvent } from '@/lib/audit';
import { resolveWorkspaceActorApi } from '@/lib/server/workspace-access/actor';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

const IS_PROD = process.env.NODE_ENV === 'production';
async function GETHandler(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string }> | { orgSlug: string } }
) {
  const clerkUserId = await getCurrentUserId();
  if (!clerkUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { orgSlug } = await params;
  if (!orgSlug) {
    return NextResponse.json({ error: 'orgSlug is required' }, { status: 400 });
  }

  let workspace;
  try {
    ({ workspace } = await getWorkspaceContextOrThrow(_req, { params: { orgSlug } }));
  } catch (e: unknown) {
    if (e instanceof APIError) {
      const safeMsg =
        e.status === 400
          ? 'Bad request'
          : e.status === 401
            ? 'Unauthorized'
            : e.status === 404
              ? 'Not found'
              : e.status === 500
                ? 'Internal server error'
                : 'Forbidden';
      return NextResponse.json({ error: IS_PROD ? safeMsg : e.message || safeMsg }, { status: e.status });
    }
    const safeMsg = 'Internal server error';
    const msg = e instanceof Error ? e.message : safeMsg;
    return NextResponse.json({ error: IS_PROD ? safeMsg : msg }, { status: 500 });
  }
  const [{ socialUser, isSuperAdmin }, org] = await Promise.all([
    resolveWorkspaceActorApi(String(clerkUserId)),
    prisma.organization.findUnique({
      where: { id: String(workspace.id) },
      select: { owner_id: true },
    }),
  ]);

  const isOwner = Boolean(org?.owner_id && socialUser?.id && String(org.owner_id) === String(socialUser.id));
  const canManageBranding = Boolean(isOwner || isSuperAdmin);

  await logAuditEvent('data.read', 'workspaces.access', {
    details: {
      orgSlug,
      workspaceId: workspace.id,
      isOwner,
      isSuperAdmin,
      canManageBranding,
    },
  });

  return NextResponse.json({
    access: {
      isOwner,
      isSuperAdmin,
      canManageBranding,
    },
  });
}

export const GET = shabbatGuard(GETHandler);
