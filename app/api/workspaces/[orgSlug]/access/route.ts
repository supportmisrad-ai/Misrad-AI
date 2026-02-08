import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { APIError, getWorkspaceContextOrThrow } from '@/lib/server/api-workspace';
import { logAuditEvent } from '@/lib/audit';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
async function GETHandler(
  _req: Request,
  { params }: { params: { orgSlug: string } }
) {
  const clerkUserId = await getCurrentUserId();
  if (!clerkUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { orgSlug } = params;
  if (!orgSlug) {
    return NextResponse.json({ error: 'orgSlug is required' }, { status: 400 });
  }

  let workspace;
  try {
    ({ workspace } = await getWorkspaceContextOrThrow(_req, { params: { orgSlug } }));
  } catch (e: unknown) {
    if (e instanceof APIError) {
      return NextResponse.json({ error: e.message || 'Forbidden' }, { status: e.status });
    }
    const msg = e instanceof Error ? e.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
  const [socialUser, org] = await Promise.all([
    prisma.organizationUser.findUnique({
      where: { clerk_user_id: String(clerkUserId) },
      select: { id: true, role: true },
    }),
    prisma.organization.findUnique({
      where: { id: String(workspace.id) },
      select: { owner_id: true },
    }),
  ]);

  const isSuperAdmin = String(socialUser?.role || '').toLowerCase() === 'super_admin';
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
