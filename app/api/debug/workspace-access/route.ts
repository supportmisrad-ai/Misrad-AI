import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { requireSuperAdmin } from '@/lib/auth';
import { getWorkspaceByOrgKeyOrThrow } from '@/lib/server/api-workspace';
import { logAuditEvent } from '@/lib/audit';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

async function GETHandler(req: NextRequest) {
  try {
    try {
      await requireSuperAdmin();
    } catch (e: any) {
      return NextResponse.json({ ok: false, error: e?.message || 'Forbidden - Super Admin required' }, { status: 403 });
    }

    const clerkUserId = await getCurrentUserId();
    if (!clerkUserId) {
      return NextResponse.json({ ok: false, error: 'Unauthorized', clerkUserId: null }, { status: 401 });
    }

    const orgSlug = req.nextUrl.searchParams.get('orgSlug');
    if (!orgSlug) {
      return NextResponse.json({ ok: false, error: 'orgSlug is required' }, { status: 400 });
    }

    try {
      await getWorkspaceByOrgKeyOrThrow(orgSlug);
    } catch (e: any) {
      await logAuditEvent('data.read', 'debug.workspace-access', {
        success: false,
        details: { orgSlug, clerkUserId },
        error: e?.message || 'Forbidden',
      });

      return NextResponse.json({ ok: false, error: e?.message || 'Forbidden' }, { status: (e as any)?.status || 403 });
    }

    const supabase = createClient();

    const { data: socialUser, error: socialUserError } = await supabase
      .from('social_users')
      .select('id, clerk_user_id, email, full_name, organization_id, role')
      .eq('clerk_user_id', clerkUserId)
      .maybeSingle();

    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, owner_id, has_client, has_nexus, has_social, has_system, has_finance')
      .eq('id', orgSlug)
      .maybeSingle();

    const isOwner = Boolean(org?.owner_id && socialUser?.id && String(org.owner_id) === String(socialUser.id));
    const isPrimary = Boolean(org?.id && socialUser?.organization_id && String(socialUser.organization_id) === String(org.id));

    await logAuditEvent('data.read', 'debug.workspace-access', {
      details: {
        orgSlug,
        clerkUserId,
        access: {
          isOwner,
          isPrimary,
        },
      },
    });

    return NextResponse.json({
      ok: true,
      orgSlug,
      clerkUserId,
      socialUser,
      socialUserError: socialUserError ? { message: socialUserError.message, code: (socialUserError as any).code } : null,
      org,
      orgError: orgError ? { message: orgError.message, code: (orgError as any).code } : null,
      access: {
        isOwner,
        isPrimary,
        canAccessWorkspace: isOwner || isPrimary,
        hasClientModule: org?.has_client ?? null,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'Unknown error', stack: error?.stack },
      { status: 500 }
    );
  }
}

export const GET = shabbatGuard(GETHandler);
