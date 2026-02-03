import { getCurrentUserId } from '@/lib/server/authHelper';
import { OSModuleKey } from '@/lib/os/modules/types';
import { getWorkspaceByOrgKeyOrThrow } from '@/lib/server/api-workspace';
import { logAuditEvent } from '@/lib/audit';
import { getSystemFeatureFlags } from '@/lib/server/featureFlags';
import { computeWorkspaceCapabilities } from '@/lib/server/workspaceCapabilities';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import prisma from '@/lib/prisma';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

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
    socialUser = await prisma.social_users.findUnique({
      where: { clerk_user_id: clerkUserId },
      select: { id: true, organization_id: true },
    });
  } catch (err) {
    console.error('GET /api/workspaces failed to query social_users', err);
    return apiError('שגיאה לא צפויה', { status: 500 });
  }

  if (!socialUser?.id) {
    return apiSuccess({ workspaces: [] as WorkspaceApiItem[] });
  }

  const orgIds = new Set<string>();

  if (socialUser.organization_id) {
    try {
      await getWorkspaceByOrgKeyOrThrow(String(socialUser.organization_id));
      orgIds.add(socialUser.organization_id);
    } catch {
      // Fail-closed: do not include inaccessible orgs
    }
  }

  const ownedOrgs = await prisma.social_organizations.findMany({
    where: { owner_id: socialUser.id },
    select: { id: true },
  });

  for (const org of ownedOrgs) {
    if (org?.id) orgIds.add(org.id);
  }

  const membershipRows = await prisma.social_team_members.findMany({
    where: { user_id: socialUser.id },
    select: { organization_id: true },
  });

  for (const row of membershipRows) {
    if (row.organization_id) orgIds.add(String(row.organization_id));
  }

  const ids: string[] = [];
  for (const orgId of orgIds) {
    try {
      await getWorkspaceByOrgKeyOrThrow(String(orgId));
      ids.push(String(orgId));
    } catch {
      // Fail-closed: skip
    }
  }
  if (ids.length === 0) {
    return apiSuccess({ workspaces: [] as WorkspaceApiItem[] });
  }

  const systemFlags = await getSystemFeatureFlags();

  const orgs = await prisma.social_organizations.findMany({
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
