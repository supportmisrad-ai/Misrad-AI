import { getCurrentUserId } from '@/lib/server/authHelper';
import { OSModuleKey } from '@/lib/os/modules/types';
import { logAuditEvent } from '@/lib/audit';
import { getSystemFeatureFlags } from '@/lib/server/featureFlags';
import { computeWorkspaceCapabilities } from '@/lib/server/workspaceCapabilities';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import prisma from '@/lib/prisma';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

const IS_PROD = process.env.NODE_ENV === 'production';

type WorkspaceApiItem = {
  id: string;
  slug: string;
  name: string;
  logo?: string | null;
  entitlements: Record<OSModuleKey, boolean>;
  capabilities: {
    isFullOffice: boolean;
    isTeamManagementEnabled: boolean;
    seatsAllowed: number;
  };
};

async function GETHandler() {
  const clerkUserId = await getCurrentUserId();
  if (!clerkUserId) {
    return apiError('Unauthorized', { status: 401 });
  }

  let socialUser: { id: string; organization_id: string | null } | null = null;
  try {
    socialUser = await prisma.organizationUser.findUnique({
      where: { clerk_user_id: clerkUserId },
      select: { id: true, organization_id: true },
    });
  } catch (err) {
    if (IS_PROD) console.error('GET /api/workspaces failed to query social_users');
    else console.error('GET /api/workspaces failed to query social_users', err);
    return apiError('שגיאה לא צפויה', { status: 500 });
  }

  if (!socialUser?.id) {
    return apiSuccess({ workspaces: [] as WorkspaceApiItem[] });
  }

  const orgIds = new Set<string>();

  if (socialUser.organization_id) {
    orgIds.add(String(socialUser.organization_id));
  }

  const ownedOrgs = await prisma.organization.findMany({
    where: { owner_id: socialUser.id },
    select: { id: true },
  });

  for (const org of ownedOrgs) {
    if (org?.id) orgIds.add(String(org.id));
  }

  const membershipRows = await prisma.teamMember.findMany({
    where: { user_id: socialUser.id },
    select: { organization_id: true },
  });

  for (const row of membershipRows) {
    if (row.organization_id) orgIds.add(String(row.organization_id));
  }

  const ids = Array.from(orgIds).filter(Boolean);
  if (ids.length === 0) {
    return apiSuccess({ workspaces: [] as WorkspaceApiItem[] });
  }

  const systemFlags = await getSystemFeatureFlags();

  const orgs = await prisma.organization.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      slug: true,
      name: true,
      logo: true,
      has_nexus: true,
      has_system: true,
      has_social: true,
      has_finance: true,
      has_client: true,
      has_operations: true,
      seats_allowed: true,
    },
  });

  const workspaces: WorkspaceApiItem[] = orgs.map((o) => ({
    id: o.id,
    slug: o.slug || o.id,
    name: o.name,
    logo: o.logo,
    entitlements: {
      nexus: o.has_nexus ?? false,
      system: o.has_system ?? false,
      social: o.has_social ?? false,
      finance: o.has_finance ?? false,
      client: o.has_client ?? false,
      operations: Boolean(o.has_operations ?? false),
    },
    capabilities: computeWorkspaceCapabilities({
      entitlements: {
        nexus: o.has_nexus ?? false,
        system: o.has_system ?? false,
        social: o.has_social ?? false,
        finance: o.has_finance ?? false,
        client: o.has_client ?? false,
        operations: Boolean(o.has_operations ?? false),
      },
      fullOfficeRequiresFinance: Boolean(systemFlags.fullOfficeRequiresFinance),
      seatsAllowedOverride: o.seats_allowed ?? null,
    }),
  }));

  await logAuditEvent('data.read', 'workspaces.list', {
    details: {
      workspaceCount: workspaces.length,
      primaryOrganizationId: socialUser.organization_id ?? null,
    },
  });

  return apiSuccess({ workspaces });
}

export const GET = shabbatGuard(GETHandler);
