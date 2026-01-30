import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { requireSuperAdmin } from '@/lib/auth';
import { getWorkspaceByOrgKeyOrThrow } from '@/lib/server/api-workspace';
import { logAuditEvent } from '@/lib/audit';
import { apiError, apiSuccess } from '@/lib/server/api-response';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
export type OSRoomId = 'social' | 'nexus' | 'system' | 'finance' | 'client';

type RoomsPayload = Partial<Record<OSRoomId, boolean>>;

async function GETHandler() {
  try {
    const clerkUserId = await getCurrentUserId();
    if (!clerkUserId) {
      return apiError('Unauthorized', { status: 401 });
    }

    const supabase = createClient();

    const { data: user, error: userError } = await supabase
      .from('social_users')
      .select('organization_id')
      .eq('clerk_user_id', clerkUserId)
      .single();

    if (userError) {
      return apiError('Forbidden', { status: 403 });
    }

    const organizationId = user?.organization_id;
    if (!organizationId) {
      return apiError('Forbidden', { status: 403 });
    }

    await getWorkspaceByOrgKeyOrThrow(String(organizationId));

    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('has_nexus, has_social, has_system, has_finance, has_client')
      .eq('id', organizationId)
      .single();

    if (!orgError && org) {
      await logAuditEvent('data.read', 'os.rooms', {
        details: {
          organizationId,
          rooms: {
            nexus: org.has_nexus ?? false,
            social: org.has_social ?? false,
            system: org.has_system ?? false,
            finance: org.has_finance ?? false,
            client: org.has_client ?? false,
          },
        },
      });
      return apiSuccess({
        rooms: {
          nexus: org.has_nexus ?? false,
          social: org.has_social ?? false,
          system: org.has_system ?? false,
          finance: org.has_finance ?? false,
          client: org.has_client ?? false,
        } as Record<OSRoomId, boolean>,
      });
    }

    if (orgError) {
      return apiError(orgError.message || 'Failed to load organization rooms', { status: 500 });
    }

    return apiError('Organization not found', { status: 404 });
  } catch (error: any) {
    try {
      await logAuditEvent('data.read', 'os.rooms', {
        success: false,
        error: error?.message || 'Unknown error',
      });
    } catch {
      // ignore
    }
    return apiError(error?.message || 'Failed to load rooms', { status: 500 });
  }
}

async function POSTHandler(req: NextRequest) {
  try {
    try {
      await requireSuperAdmin();
    } catch (e: any) {
      return apiError(e?.message || 'Forbidden - Super Admin required', { status: 403 });
    }

    const clerkUserId = await getCurrentUserId();
    if (!clerkUserId) {
      return apiError('Unauthorized', { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const requestedRooms: RoomsPayload = body?.rooms || (Array.isArray(body?.enable)
      ? (Object.fromEntries((body.enable as string[]).map((k) => [k, true])) as RoomsPayload)
      : {});

    let supabase: ReturnType<typeof createClient>;
    supabase = createClient();

    const { data: user, error: userError } = await supabase
      .from('social_users')
      .select('id, organization_id, full_name, email')
      .eq('clerk_user_id', clerkUserId)
      .single();

    if (userError || !user?.id) {
      return apiError(userError?.message || 'User not found', { status: 400 });
    }

    let organizationId: string | null = user.organization_id || null;

    if (!organizationId) {
      const orgName = user.full_name || user.email || 'Organization';

      const { data: createdOrg, error: createOrgError } = await supabase
        .from('organizations')
        .insert({
          name: orgName,
          owner_id: user.id,
          has_nexus: true,
          has_system: false,
          has_social: false,
          has_finance: false,
          has_client: false,
          has_operations: false,
          subscription_status: 'trial',
          subscription_plan: null,
          trial_start_date: new Date().toISOString(),
          trial_days: 7,
        } as any)
        .select('id')
        .single();

      if (createOrgError || !createdOrg?.id) {
        const { data: createdOrgFallback, error: createOrgFallbackError } = await supabase
          .from('organizations')
          .insert({
            name: orgName,
            owner_id: user.id,
            has_nexus: true,
            has_system: false,
            has_social: false,
            has_finance: false,
            has_client: false,
            has_operations: false,
            subscription_status: 'trial',
            subscription_plan: null,
            trial_start_date: new Date().toISOString(),
            trial_days: 7,
          } as any)
          .select('id')
          .single();

        if (createOrgFallbackError || !createdOrgFallback?.id) {
          return apiError(createOrgError?.message || createOrgFallbackError?.message || 'Failed to create organization', { status: 500 });
        }

        organizationId = createdOrgFallback.id;
      } else {
        organizationId = createdOrg.id;
      }

      const { error: linkError } = await supabase
        .from('social_users')
        .update({ organization_id: organizationId } as any)
        .eq('id', user.id);

      if (linkError) {
        return apiError(linkError.message || 'Failed to link organization', { status: 500 });
      }
    }

    await getWorkspaceByOrgKeyOrThrow(String(organizationId));

    const update: Partial<Record<string, boolean>> = {};
    const allowed: OSRoomId[] = ['social', 'nexus', 'system', 'finance', 'client'];
    for (const key of allowed) {
      if (typeof requestedRooms[key] === 'boolean') {
        update[`has_${key}`] = requestedRooms[key] as boolean;
      }
    }

    if (Object.keys(update).length > 0) {
      const { error: updateError } = await supabase
        .from('organizations')
        .update(update as any)
        .eq('id', organizationId);

      if (updateError) {
        return apiError(updateError.message || 'Failed to update organization rooms', { status: 500 });
      }
    }

    await logAuditEvent('data.write', 'os.rooms', {
      details: {
        organizationId,
        update,
      },
    });

    return apiSuccess({ organizationId });
  } catch (error: any) {
    try {
      await logAuditEvent('data.write', 'os.rooms', {
        success: false,
        error: error?.message || 'Internal error',
      });
    } catch {
      // ignore
    }
    return apiError(error?.message || 'Internal error', { status: 500 });
  }
}

export const GET = shabbatGuard(GETHandler);

export const POST = shabbatGuard(POSTHandler);
