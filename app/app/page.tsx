import { redirect } from 'next/navigation';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { loadCurrentUserLastLocation, requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';
import { createClient } from '@/lib/supabase';

// Force dynamic rendering to prevent build-time Clerk errors and handle auth server-side
export const dynamic = 'force-dynamic';

export default async function AppEntryPage() {
  const userId = await getCurrentUserId();
  if (!userId) {
    redirect('/sign-in');
  }

  const last = await loadCurrentUserLastLocation();
  if (!last.orgSlug) {
    const supabase = createClient();

    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    let { data: socialUser } = await supabase
      .from('social_users')
      .select('id, organization_id')
      .eq('clerk_user_id', userId)
      .single();

    if (!socialUser?.id) {
      await sleep(1000);
      const retry = await supabase
        .from('social_users')
        .select('id, organization_id')
        .eq('clerk_user_id', userId)
        .single();
      socialUser = retry.data as any;
    }

    if (!socialUser?.id) {
      redirect('/workspaces');
    }

    const orgIds = new Set<string>();
    if (socialUser.organization_id) {
      orgIds.add(String(socialUser.organization_id));
    }

    const { data: ownedOrgs } = await supabase
      .from('organizations')
      .select('id')
      .eq('owner_id', socialUser.id);

    for (const org of ownedOrgs || []) {
      if (org?.id) orgIds.add(String(org.id));
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
    if (ids.length === 1) {
      const onlyOrgId = ids[0];
      const { data: org } = await supabase
        .from('organizations')
        .select('id, slug')
        .eq('id', onlyOrgId)
        .maybeSingle();

      const onlyOrgSlug = String((org as any)?.slug || (org as any)?.id || onlyOrgId);
      redirect(`/w/${encodeURIComponent(onlyOrgSlug)}`);
    }

    redirect('/workspaces');
  }

  // Validate the workspace exists and is accessible before redirecting.
  // If invalid/outdated -> fallback to /workspaces.
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(last.orgSlug);

    if (last.module && workspace.entitlements[last.module]) {
      redirect(`/w/${encodeURIComponent(last.orgSlug)}/${last.module}`);
    }

    // If we don't have a valid last module, send the user to the workspace entry.
    // That page will choose (last module / single allowed / lobby).
    redirect(`/w/${encodeURIComponent(last.orgSlug)}`);
  } catch {
    redirect('/workspaces');
  }
}
