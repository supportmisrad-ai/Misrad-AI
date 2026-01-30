import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { OSModuleKey } from '@/lib/os/modules/types';
import { getWorkspaceByOrgKeyOrThrow } from '@/lib/server/api-workspace';
import { logAuditEvent } from '@/lib/audit';
import { apiError, apiSuccess } from '@/lib/server/api-response';

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

  if (error) {
    throw error;
  }
}

async function GETHandler() {
  const clerkUserId = await getCurrentUserId();
  if (!clerkUserId) {
    return apiError('Unauthorized', { status: 401 });
  }

  const supabase = createClient();

  const { data, error } = await supabase
    .from('social_users')
    .select('last_org_slug, last_module')
    .eq('clerk_user_id', clerkUserId)
    .maybeSingle();

  if (error) {
    return apiError(error, { status: 500 });
  }

  await logAuditEvent('data.read', 'user.last-location', {
    details: {
      clerkUserId,
      orgSlug: (data as any)?.last_org_slug ?? null,
      module: ((data as any)?.last_module as OSModuleKey | null) ?? null,
    },
  });

  return apiSuccess({
    orgSlug: (data as any)?.last_org_slug ?? null,
    module: ((data as any)?.last_module as OSModuleKey | null) ?? null,
  });
}

async function POSTHandler(req: NextRequest) {
  const clerkUserId = await getCurrentUserId();
  if (!clerkUserId) {
    return apiError('Unauthorized', { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as LastLocationPayload;
  const orgSlug = body?.orgSlug ? String(body.orgSlug) : null;
  const module = (body?.module ?? null) as OSModuleKey | null;

  if (orgSlug) {
    try {
      await getWorkspaceByOrgKeyOrThrow(orgSlug);
    } catch (e: any) {
      return apiError(e, { status: (e as any)?.status || 403 });
    }
  }

  try {
    await safeUpdateLastLocation({ clerkUserId, orgSlug, module });
  } catch (e: any) {
    return apiError(e, { status: 500, message: 'Failed to persist last location' });
  }

  await logAuditEvent('data.write', 'user.last-location', {
    details: { clerkUserId, orgSlug, module },
  });

  return apiSuccess({ ok: true });
}

export const GET = shabbatGuard(GETHandler);

export const POST = shabbatGuard(POSTHandler);
