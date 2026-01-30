import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { APIError, getWorkspaceContextOrThrow } from '@/lib/server/api-workspace';
import { logAuditEvent } from '@/lib/audit';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
async function GETHandler(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string }> }
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
  } catch (e: any) {
    if (e instanceof APIError) {
      return NextResponse.json({ error: e.message || 'Forbidden' }, { status: e.status });
    }
    return NextResponse.json({ error: e?.message || 'Internal server error' }, { status: 500 });
  }
  const supabase = createClient();

  const { data: socialUser } = await supabase
    .from('social_users')
    .select('id, role')
    .eq('clerk_user_id', clerkUserId)
    .maybeSingle();

  const { data: org } = await supabase
    .from('organizations')
    .select('id, owner_id')
    .eq('id', workspace.id)
    .maybeSingle();

  const isSuperAdmin = String((socialUser as any)?.role || '').toLowerCase() === 'super_admin';
  const isOwner = Boolean(org?.owner_id && (socialUser as any)?.id && String(org.owner_id) === String((socialUser as any).id));
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
