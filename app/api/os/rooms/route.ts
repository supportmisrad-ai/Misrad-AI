import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { requireSuperAdmin } from '@/lib/auth';
import { getWorkspaceByOrgKeyOrThrow } from '@/lib/server/api-workspace';
import { logAuditEvent } from '@/lib/audit';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { DEFAULT_TRIAL_DAYS } from '@/lib/trial';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
import { asObject, getErrorMessage as getUnknownErrorMessage } from '@/lib/shared/unknown';

const IS_PROD = process.env.NODE_ENV === 'production';

export type OSRoomId = 'social' | 'nexus' | 'system' | 'finance' | 'client';

type RoomsPayload = Partial<Record<OSRoomId, boolean>>;

type OrganizationRoomsUpdateData = Parameters<typeof prisma.organization.update>[0]['data'];

function toRoomsPayload(body: unknown): RoomsPayload {
  const obj = asObject(body);
  if (!obj) return {};

  const roomsObj = asObject(obj.rooms);
  if (roomsObj) {
    const out: RoomsPayload = {};
    const allowed: OSRoomId[] = ['social', 'nexus', 'system', 'finance', 'client'];
    for (const key of allowed) {
      if (typeof roomsObj[key] === 'boolean') {
        out[key] = roomsObj[key] as boolean;
      }
    }
    return out;
  }

  const enable = obj.enable;
  if (Array.isArray(enable)) {
    const enabledKeys = enable.filter((k): k is string => typeof k === 'string');
    const out: RoomsPayload = {};
    for (const k of enabledKeys) {
      if (k === 'social' || k === 'nexus' || k === 'system' || k === 'finance' || k === 'client') {
        out[k] = true;
      }
    }
    return out;
  }

  return {};
}

async function GETHandler(req: NextRequest) {
  try {
    const clerkUserId = await getCurrentUserId();
    if (!clerkUserId) {
      return apiError('Unauthorized', { status: 401 });
    }

    const headerOrgKey = req.headers.get('x-org-id') || req.headers.get('x-orgid');
    if (headerOrgKey) {
      const { workspaceId } = await getWorkspaceByOrgKeyOrThrow(String(headerOrgKey));
      const org = await prisma.organization.findUnique({
        where: { id: String(workspaceId) },
        select: { has_nexus: true, has_social: true, has_system: true, has_finance: true, has_client: true },
      });

      if (org) {
        await logAuditEvent('data.read', 'os.rooms', {
          details: {
            organizationId: String(workspaceId),
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
    }

    const user = await prisma.organizationUser.findUnique({
      where: { clerk_user_id: String(clerkUserId) },
      select: { organization_id: true },
    });

    const organizationId = user?.organization_id;
    if (!organizationId) {
      return apiError('Forbidden', { status: 403 });
    }

    await getWorkspaceByOrgKeyOrThrow(String(organizationId));

    const org = await prisma.organization.findUnique({
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
  } catch (error: unknown) {
    const safeMsg = 'Failed to load rooms';
    const msg = getUnknownErrorMessage(error) || safeMsg;
    try {
      await logAuditEvent('data.read', 'os.rooms', {
        success: false,
        error: IS_PROD ? safeMsg : msg,
      });
    } catch {
      // ignore
    }
    return apiError(IS_PROD ? safeMsg : msg, { status: 500 });
  }
}

async function POSTHandler(req: NextRequest) {
  try {
    try {
      await requireSuperAdmin();
    } catch (e: unknown) {
      const safeMsg = 'Forbidden - Super Admin required';
      return apiError(IS_PROD ? safeMsg : getUnknownErrorMessage(e) || safeMsg, { status: 403 });
    }

    const clerkUserId = await getCurrentUserId();
    if (!clerkUserId) {
      return apiError('Unauthorized', { status: 401 });
    }

    const body: unknown = await req.json().catch(() => ({}));
    const requestedRooms: RoomsPayload = toRoomsPayload(body);

    const user = await prisma.organizationUser.findUnique({
      where: { clerk_user_id: String(clerkUserId) },
      select: { id: true, organization_id: true, full_name: true, email: true },
    });

    if (!user?.id) {
      return apiError('User not found', { status: 400 });
    }

    let organizationId: string | null = user.organization_id ? String(user.organization_id) : null;

    if (!organizationId) {
      const orgName = user.full_name || user.email || 'Organization';

      const createdOrg = await prisma.organization.create({
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

      await prisma.organizationUser.updateMany({
        where: { id: String(user.id) },
        data: { organization_id: organizationId },
      });
    }

    await getWorkspaceByOrgKeyOrThrow(String(organizationId));

    const update: OrganizationRoomsUpdateData = {};
    if (typeof requestedRooms.social === 'boolean') update.has_social = requestedRooms.social;
    if (typeof requestedRooms.nexus === 'boolean') update.has_nexus = requestedRooms.nexus;
    if (typeof requestedRooms.system === 'boolean') update.has_system = requestedRooms.system;
    if (typeof requestedRooms.finance === 'boolean') update.has_finance = requestedRooms.finance;
    if (typeof requestedRooms.client === 'boolean') update.has_client = requestedRooms.client;

    if (Object.keys(update).length > 0) {
      await prisma.organization.update({
        where: { id: String(organizationId) },
        data: update,
      });
    }

    await logAuditEvent('data.write', 'os.rooms', {
      details: {
        organizationId,
        update,
      },
    });

    return apiSuccess({ organizationId });
  } catch (error: unknown) {
    const safeMsg = 'Internal error';
    const msg = getUnknownErrorMessage(error) || safeMsg;
    try {
      await logAuditEvent('data.write', 'os.rooms', {
        success: false,
        error: IS_PROD ? safeMsg : msg,
      });
    } catch {
      // ignore
    }
    return apiError(IS_PROD ? safeMsg : msg, { status: 500 });
  }
}

export const GET = shabbatGuard(GETHandler);

export const POST = shabbatGuard(POSTHandler);
