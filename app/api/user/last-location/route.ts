import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { OSModuleKey } from '@/lib/os/modules/types';
import { requireWorkspaceAccessByOrgSlugApi } from '@/lib/server/workspace';
import { logAuditEvent } from '@/lib/audit';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
type LastLocationPayload = {
  orgSlug?: string | null;
  module?: OSModuleKey | null;
};

async function safeUpdateLastLocation({
  clerkUserId,
  orgSlug,
  module,
}: {
  clerkUserId: string;
  orgSlug: string | null;
  module: OSModuleKey | null;
}) {
  const supabase = createClient();

  const update: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (orgSlug) update.last_org_slug = orgSlug;
  if (module) update.last_module = module;

  if (Object.keys(update).length === 1) {
    return;
  }

  const { error } = await supabase
    .from('social_users')
    .update(update as any)
    .eq('clerk_user_id', clerkUserId);

  // Backwards compatible: if columns don't exist yet, ignore.
  if (error?.message) {
    const msg = String(error.message).toLowerCase();
    if (msg.includes('column') && (msg.includes('last_org_slug') || msg.includes('last_module'))) {
      return;
    }
  }
}

async function GETHandler() {
  const clerkUserId = await getCurrentUserId();
  if (!clerkUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient();

  const { data, error } = await supabase
    .from('social_users')
    .select('last_org_slug, last_module')
    .eq('clerk_user_id', clerkUserId)
    .maybeSingle();

  if (error?.message) {
    const msg = String(error.message).toLowerCase();
    if (msg.includes('column') && (msg.includes('last_org_slug') || msg.includes('last_module'))) {
      await logAuditEvent('data.read', 'user.last-location', {
        details: { clerkUserId, orgSlug: null, module: null },
      });
      return NextResponse.json({ orgSlug: null, module: null });
    }
  }

  await logAuditEvent('data.read', 'user.last-location', {
    details: {
      clerkUserId,
      orgSlug: (data as any)?.last_org_slug ?? null,
      module: ((data as any)?.last_module as OSModuleKey | null) ?? null,
    },
  });

  return NextResponse.json({
    orgSlug: (data as any)?.last_org_slug ?? null,
    module: ((data as any)?.last_module as OSModuleKey | null) ?? null,
  });
}

async function POSTHandler(req: NextRequest) {
  const clerkUserId = await getCurrentUserId();
  if (!clerkUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as LastLocationPayload;
  const orgSlug = body?.orgSlug ? String(body.orgSlug) : null;
  const module = (body?.module ?? null) as OSModuleKey | null;

  if (orgSlug) {
    try {
      await requireWorkspaceAccessByOrgSlugApi(orgSlug);
    } catch (e: any) {
      return NextResponse.json({ error: e?.message || 'Forbidden' }, { status: (e as any)?.status || 403 });
    }
  }

  try {
    await safeUpdateLastLocation({ clerkUserId, orgSlug, module });
  } catch {
    // Ignore - should never block navigation
  }

  await logAuditEvent('data.write', 'user.last-location', {
    details: { clerkUserId, orgSlug, module },
  });

  return NextResponse.json({ success: true });
}

export const GET = shabbatGuard(GETHandler);

export const POST = shabbatGuard(POSTHandler);
