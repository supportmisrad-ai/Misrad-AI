import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { OSModuleKey } from '@/lib/os/modules/types';
import { requireWorkspaceAccessByOrgSlugApi } from '@/lib/server/workspace';
import { logAuditEvent } from '@/lib/audit';
import { getSystemFeatureFlags } from '@/lib/server/featureFlags';
import { computeWorkspaceCapabilities } from '@/lib/server/workspaceCapabilities';

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
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient();

  const { data: socialUser } = await supabase
    .from('social_users')
    .select('id, organization_id')
    .eq('clerk_user_id', clerkUserId)
    .single();

  if (!socialUser?.id) {
    return NextResponse.json({ workspaces: [] as WorkspaceApiItem[] });
  }

  const orgIds = new Set<string>();

  if (socialUser.organization_id) {
    orgIds.add(socialUser.organization_id);
    // Validate access for primary organization (strict multi-tenant guard)
    await requireWorkspaceAccessByOrgSlugApi(String(socialUser.organization_id));
  }

  const { data: ownedOrgs } = await supabase
    .from('organizations')
    .select('id')
    .eq('owner_id', socialUser.id);

  for (const org of ownedOrgs || []) {
    if (org?.id) orgIds.add(org.id);
  }

  const { data: memberships } = await supabase
    .from('social_team_members')
    .select('organization_id')
    .eq('user_id', socialUser.id);

  for (const row of memberships || []) {
    const orgId = (row as any)?.organization_id;
    if (orgId) orgIds.add(String(orgId));
  }

  const ids = Array.from(orgIds);
  if (ids.length === 0) {
    return NextResponse.json({ workspaces: [] as WorkspaceApiItem[] });
  }

  const systemFlags = await getSystemFeatureFlags();

  let orgs: any[] | null = null;

  const withSlug = await supabase
    .from('organizations')
    .select('id, slug, name, logo, has_nexus, has_system, has_social, has_finance, has_client, seats_allowed')
    .in('id', ids);

  if (withSlug.error?.message) {
    const msg = String(withSlug.error.message).toLowerCase();
    const missingSlug = msg.includes('column') && msg.includes('slug');
    const missingSeatsAllowed = msg.includes('column') && msg.includes('seats_allowed');

    if (missingSlug) {
      const withoutSlug = await supabase
        .from('organizations')
        .select('id, name, logo, has_nexus, has_system, has_social, has_finance, has_client, seats_allowed')
        .in('id', ids);

      if (withoutSlug.error?.message && String(withoutSlug.error.message).toLowerCase().includes('column') && String(withoutSlug.error.message).toLowerCase().includes('seats_allowed')) {
        const withoutSlugWithoutSeats = await supabase
          .from('organizations')
          .select('id, name, logo, has_nexus, has_system, has_social, has_finance, has_client')
          .in('id', ids);
        orgs = withoutSlugWithoutSeats.data as any;
      } else {
        orgs = withoutSlug.data as any;
      }
    } else if (missingSeatsAllowed) {
      const withoutSeatsAllowed = await supabase
        .from('organizations')
        .select('id, slug, name, logo, has_nexus, has_system, has_social, has_finance, has_client')
        .in('id', ids);
      orgs = withoutSeatsAllowed.data as any;
    } else {
      orgs = withSlug.data as any;
    }
  } else {
    orgs = withSlug.data as any;
  }

  const workspaces: WorkspaceApiItem[] = (orgs || []).map((o: any) => ({
    id: o.id,
    slug: o.slug || o.id,
    name: o.name,
    logo: o.logo,
    entitlements: {
      nexus: o.has_nexus ?? true,
      system: o.has_system ?? false,
      social: o.has_social ?? false,
      finance: o.has_finance ?? false,
      client: o.has_client ?? false,
    },
    capabilities: computeWorkspaceCapabilities({
      entitlements: {
        nexus: o.has_nexus ?? true,
        system: o.has_system ?? false,
        social: o.has_social ?? false,
        finance: o.has_finance ?? false,
        client: o.has_client ?? false,
      },
      fullOfficeRequiresFinance: Boolean(systemFlags.fullOfficeRequiresFinance),
      seatsAllowedOverride: (o as any)?.seats_allowed ?? null,
    }),
  }));

  await logAuditEvent('data.read', 'workspaces.list', {
    details: {
      workspaceCount: workspaces.length,
      primaryOrganizationId: socialUser.organization_id ?? null,
    },
  });

  return NextResponse.json({ workspaces });
}

export const GET = shabbatGuard(GETHandler);
