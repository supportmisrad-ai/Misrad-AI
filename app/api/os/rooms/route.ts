import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { requireSuperAdmin } from '@/lib/auth';
import { getWorkspaceByOrgKeyOrThrow } from '@/lib/server/api-workspace';
import { logAuditEvent } from '@/lib/audit';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { DEFAULT_TRIAL_DAYS } from '@/lib/trial';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
export type OSRoomId = 'social' | 'nexus' | 'system' | 'finance' | 'client';

type RoomsPayload = Partial<Record<OSRoomId, boolean>>;

async function GETHandler() {
  try {
    const clerkUserId = await getCurrentUserId();
    if (!clerkUserId) {
      return apiError('Unauthorized', { status: 401 });
    }

    const user = await prisma.social_users.findUnique({
      where: { clerk_user_id: String(clerkUserId) },
      select: { organization_id: true },
    });

    const organizationId = (user as any)?.organization_id;
    if (!organizationId) {
      return apiError('Forbidden', { status: 403 });
    }

    await getWorkspaceByOrgKeyOrThrow(String(organizationId));

    const org = await prisma.social_organizations.findUnique({
      where: { id: String(organizationId) },
      select: { has_nexus: true, has_social: true, has_system: true, has_finance: true, has_client: true },
    });

    if (org) {
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

    const user = await prisma.social_users.findUnique({
      where: { clerk_user_id: String(clerkUserId) },
      select: { id: true, organization_id: true, full_name: true, email: true },
    });

    if (!user?.id) {
      return apiError('User not found', { status: 400 });
    }

    let organizationId: string | null = (user as any).organization_id || null;

    if (!organizationId) {
      const orgName = (user as any).full_name || (user as any).email || 'Organization';

      const createdOrg = await prisma.social_organizations.create({
        data: {
          name: String(orgName),
          owner_id: String(user.id),
          has_nexus: true,
          has_system: false,
          has_social: false,
          has_finance: false,
          has_client: false,
          has_operations: false,
          subscription_status: 'trial',
          subscription_plan: null,
          trial_start_date: new Date(),
          trial_days: DEFAULT_TRIAL_DAYS,
        },
        select: { id: true },
      });

      organizationId = createdOrg?.id ? String(createdOrg.id) : null;
      if (!organizationId) {
        return apiError('Failed to create organization', { status: 500 });
      }

      await prisma.social_users.updateMany({
        where: { id: String(user.id) },
        data: { organization_id: organizationId },
      });
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
      await prisma.social_organizations.update({
        where: { id: String(organizationId) },
        data: update as any,
      });
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
