import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { OSModuleKey } from '@/lib/os/modules/types';
import { getSystemFeatureFlags } from '@/lib/server/featureFlags';

export type PackageType = 'the_closer' | 'the_authority' | 'the_mentor';

export type WorkspaceInfo = {
  id: string;
  slug?: string | null;
  name: string;
  logo?: string | null;
  entitlements: Record<OSModuleKey, boolean>;
};

export type WorkspaceInfoWithPackage = WorkspaceInfo & {
  packageType: PackageType;
};

export type WorkspaceEntitlements = Record<OSModuleKey, boolean>;

export type LastLocation = {
  orgSlug: string | null;
  module: OSModuleKey | null;
};

type OrganizationModuleFlags = {
  has_nexus: boolean | null;
  has_system: boolean | null;
  has_social: boolean | null;
  has_finance: boolean | null;
  has_client: boolean | null;
  has_operations: boolean | null;
};

function parseEnvCsv(value: string | undefined | null): string[] {
  return String(value || '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

function isInternalWorkspace(params: {
  organizationId?: string | null;
  orgSlug?: string | null;
}): boolean {
  const orgId = params.organizationId ? String(params.organizationId).trim() : '';
  const orgSlug = params.orgSlug ? String(params.orgSlug).trim() : '';

  const envIds = new Set([
    ...parseEnvCsv(process.env.MISRAD_INTERNAL_ORG_ID),
    ...parseEnvCsv(process.env.MISRAD_INTERNAL_ORG_IDS),
  ]);
  const envSlugs = new Set([
    ...parseEnvCsv(process.env.MISRAD_INTERNAL_ORG_SLUG),
    ...parseEnvCsv(process.env.MISRAD_INTERNAL_ORG_SLUGS),
  ]);

  if (orgId && envIds.has(orgId)) return true;
  if (orgSlug && envSlugs.has(orgSlug)) return true;
  return false;
}

async function applyLaunchScopeToEntitlements(
  entitlements: WorkspaceEntitlements,
  ctx?: { organizationId?: string | null; orgSlug?: string | null }
): Promise<WorkspaceEntitlements> {
  try {
    if (isInternalWorkspace({ organizationId: ctx?.organizationId ?? null, orgSlug: ctx?.orgSlug ?? null })) {
      return {
        nexus: true,
        system: true,
        social: true,
        finance: true,
        client: true,
        operations: true,
      };
    }

    const flags = await getSystemFeatureFlags();
    const scope = flags.launch_scope_modules;
    return {
      nexus: Boolean(entitlements.nexus && scope.nexus),
      system: Boolean(entitlements.system && scope.system),
      social: Boolean(entitlements.social && scope.social),
      finance: Boolean(entitlements.finance && scope.finance),
      client: Boolean(entitlements.client && scope.client),
      operations: Boolean(entitlements.operations && scope.operations),
    };
  } catch {
    return entitlements;
  }
}

function buildEntitlementsFromAllowedModules(allowed: Iterable<OSModuleKey>): WorkspaceEntitlements {
  const set = new Set<OSModuleKey>(allowed);
  return {
    nexus: set.has('nexus'),
    system: set.has('system'),
    social: set.has('social'),
    finance: set.has('finance'),
    client: set.has('client'),
    operations: set.has('operations'),
  };
}

export function getPackageModules(packageType: PackageType): OSModuleKey[] {
  switch (packageType) {
    case 'the_closer':
      return ['system', 'nexus'];
    case 'the_authority':
      return ['social', 'nexus'];
    case 'the_mentor':
      return ['client', 'finance', 'nexus'];
    default:
      return ['nexus'];
  }
}

export function inferOrganizationPackageType(flags: OrganizationModuleFlags): PackageType {
  // Heuristic mapping based on enabled modules.
  // Mentor is the widest (client/finance), Authority is social, Closer is system.
  if (flags.has_client || flags.has_finance) return 'the_mentor';
  if (flags.has_social) return 'the_authority';
  return 'the_closer';
}

async function loadOrganizationModuleFlags(organizationId: string): Promise<OrganizationModuleFlags> {
  const supabase = createClient();
  const { data: org, error } = await supabase
    .from('organizations')
    .select('has_nexus, has_system, has_social, has_finance, has_client, has_operations')
    .eq('id', organizationId)
    .single();

  if (error && (error as any).code === '42703') {
    const fallback = await supabase
      .from('organizations')
      .select('has_nexus, has_system, has_social, has_finance, has_client')
      .eq('id', organizationId)
      .single();
    return {
      has_nexus: fallback.data?.has_nexus ?? true,
      has_system: fallback.data?.has_system ?? true,
      has_social: fallback.data?.has_social ?? true,
      has_finance: fallback.data?.has_finance ?? true,
      has_client: fallback.data?.has_client ?? true,
      has_operations: true,
    };
  }

  return {
    has_nexus: org?.has_nexus ?? true,
    has_system: org?.has_system ?? true,
    has_social: org?.has_social ?? true,
    has_finance: org?.has_finance ?? true,
    has_client: org?.has_client ?? true,
    has_operations: (org as any)?.has_operations ?? true,
  };
}

export async function getOrganizationPackageEntitlements(
  organizationId: string,
  socialUserId?: string,
  orgSlug?: string
): Promise<{ packageType: PackageType; entitlements: WorkspaceEntitlements }> {
  const supabase = createClient();
  const flags = await loadOrganizationModuleFlags(organizationId);
  const packageType = inferOrganizationPackageType(flags);

  const orgEntitlements: WorkspaceEntitlements = {
    nexus: flags.has_nexus ?? true,
    system: flags.has_system ?? false,
    social: flags.has_social ?? false,
    finance: flags.has_finance ?? false,
    client: flags.has_client ?? false,
    operations: flags.has_operations ?? false,
  };

  // If socialUserId is provided, intersect with user's allowed modules.
  if (socialUserId) {
    const { data: user } = await supabase
      .from('social_users')
      .select('allowed_modules, role')
      .eq('id', socialUserId)
      .single();

    // Owners and Super Admins should not see locked modules in the UI.
    if (user?.role === 'owner' || user?.role === 'super_admin') {
      const entitlements = await applyLaunchScopeToEntitlements(orgEntitlements, { organizationId, orgSlug });

      return { packageType, entitlements };
    }

    if (user?.allowed_modules && Array.isArray(user.allowed_modules)) {
      const userModules = new Set(user.allowed_modules);
      const entitlements = await applyLaunchScopeToEntitlements(
        {
          nexus: orgEntitlements.nexus && userModules.has('nexus'),
          system: orgEntitlements.system && userModules.has('system'),
          social: orgEntitlements.social && userModules.has('social'),
          finance: orgEntitlements.finance && userModules.has('finance'),
          client: orgEntitlements.client && userModules.has('client'),
          operations: orgEntitlements.operations && userModules.has('operations'),
        },
        { organizationId, orgSlug }
      );

      return { packageType, entitlements };
    }
  }

  const entitlements = await applyLaunchScopeToEntitlements(orgEntitlements, { organizationId, orgSlug });

  return { packageType, entitlements };
}

export async function requireClerkUserId(): Promise<string> {
  const clerkUserId = await getCurrentUserId();
  if (!clerkUserId) {
    redirect('/sign-in');
  }
  return clerkUserId;
}

export async function loadCurrentUserLastLocation(): Promise<LastLocation> {
  const clerkUserId = await getCurrentUserId();
  if (!clerkUserId) {
    return { orgSlug: null, module: null };
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
      return { orgSlug: null, module: null };
    }
  }

  return {
    orgSlug: (data as any)?.last_org_slug ?? null,
    module: ((data as any)?.last_module as OSModuleKey | null) ?? null,
  };
}

export async function persistCurrentUserLastLocation({
  orgSlug,
  module,
}: {
  orgSlug: string;
  module?: OSModuleKey | null;
}) {
  const clerkUserId = await getCurrentUserId();
  if (!clerkUserId) {
    return;
  }

  const supabase = createClient();
  const update: Record<string, any> = {
    updated_at: new Date().toISOString(),
    last_org_slug: orgSlug,
  };
  if (module) {
    update.last_module = module;
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

export async function requireCurrentOrganizationId(): Promise<string> {
  const clerkUserId = await requireClerkUserId();
  const socialUser = await getCurrentSocialUser(clerkUserId);
  const organizationId = socialUser?.organization_id;
  if (organizationId) {
    return String(organizationId);
  }

  // Fallback: if the user record exists but doesn't have organization_id yet,
  // try to resolve the org by ownership.
  if (socialUser?.id) {
    const supabase = createClient();
    const { data: org, error } = await supabase
      .from('organizations')
      .select('id')
      .eq('owner_id', socialUser.id)
      .maybeSingle();

    if (error) {
      console.error('[workspace-access] failed to resolve organization by owner_id', {
        clerkUserId,
        socialUserId: socialUser.id,
        message: error.message,
        code: (error as any).code,
      });
    }

    if (org?.id) {
      return String(org.id);
    }
  }

  redirect('/');
}

export async function getCurrentSocialUser(clerkUserId: string): Promise<{ id: string; organization_id: string | null; role?: string | null } | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('social_users')
    .select('id, organization_id, role')
    .eq('clerk_user_id', clerkUserId)
    .maybeSingle();

  if (error) {
    console.error('[workspace-access] failed to load social_user', {
      clerkUserId,
      message: error.message,
      code: (error as any).code,
    });
  }

  if (!data?.id) return null;
  return data as any;
}

export async function getOrganizationEntitlements(
  organizationId: string,
  socialUserId?: string,
  orgSlug?: string
): Promise<WorkspaceEntitlements> {
  const supabase = createClient();

  const { data: org, error } = await supabase
    .from('organizations')
    .select('has_nexus, has_system, has_social, has_finance, has_client, has_operations')
    .eq('id', organizationId)
    .single();

  if (error && (error as any).code === '42703') {
    const fallback = await supabase
      .from('organizations')
      .select('has_nexus, has_system, has_social, has_finance, has_client')
      .eq('id', organizationId)
      .single();
    const fallbackEntitlements = {
      nexus: fallback.data?.has_nexus ?? true,
      system: fallback.data?.has_system ?? false,
      social: fallback.data?.has_social ?? false,
      finance: fallback.data?.has_finance ?? false,
      client: fallback.data?.has_client ?? false,
      operations: false,
    };

    if (socialUserId) {
      const { data: user } = await supabase
        .from('social_users')
        .select('allowed_modules, role')
        .eq('id', socialUserId)
        .single();

      if (user?.role === 'owner' || user?.role === 'super_admin') {
        return await applyLaunchScopeToEntitlements(fallbackEntitlements, { organizationId, orgSlug });
      }

      if (user?.allowed_modules && Array.isArray(user.allowed_modules)) {
        const userModules = new Set(user.allowed_modules);
        return await applyLaunchScopeToEntitlements(
          {
            nexus: fallbackEntitlements.nexus && userModules.has('nexus'),
            system: fallbackEntitlements.system && userModules.has('system'),
            social: fallbackEntitlements.social && userModules.has('social'),
            finance: fallbackEntitlements.finance && userModules.has('finance'),
            client: fallbackEntitlements.client && userModules.has('client'),
            operations: false,
          },
          { organizationId, orgSlug }
        );
      }
    }

    return await applyLaunchScopeToEntitlements(fallbackEntitlements, { organizationId, orgSlug });
  }

  const orgEntitlements = {
    nexus: org?.has_nexus ?? true,
    system: org?.has_system ?? false,
    social: org?.has_social ?? false,
    finance: org?.has_finance ?? false,
    client: org?.has_client ?? false,
    operations: (org as any)?.has_operations ?? false,
  };

  // If socialUserId is provided, intersect with user's allowed modules
  if (socialUserId) {
    const { data: user } = await supabase
      .from('social_users')
      .select('allowed_modules, role')
      .eq('id', socialUserId)
      .single();

    // Owners and Super Admins get everything the organization has
    if (user?.role === 'owner' || user?.role === 'super_admin') {
      return await applyLaunchScopeToEntitlements(orgEntitlements, { organizationId, orgSlug });
    }

    if (user?.allowed_modules && Array.isArray(user.allowed_modules)) {
      const userModules = new Set(user.allowed_modules);
      return await applyLaunchScopeToEntitlements(
        {
          nexus: orgEntitlements.nexus && userModules.has('nexus'),
          system: orgEntitlements.system && userModules.has('system'),
          social: orgEntitlements.social && userModules.has('social'),
          finance: orgEntitlements.finance && userModules.has('finance'),
          client: orgEntitlements.client && userModules.has('client'),
          operations: orgEntitlements.operations && userModules.has('operations'),
        },
        { organizationId, orgSlug }
      );
    }
  }

  return await applyLaunchScopeToEntitlements(orgEntitlements, { organizationId, orgSlug });
}

async function hasTeamMembership({
  supabase,
  socialUserId,
  organizationId,
}: {
  supabase: ReturnType<typeof createClient>;
  socialUserId: string;
  organizationId: string;
}): Promise<boolean> {
  const { data, error } = await supabase
    .from('social_team_members')
    .select('id')
    .eq('user_id', socialUserId)
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (error) {
    console.error('[workspace-access] failed to check team membership', {
      socialUserId,
      organizationId,
      message: error.message,
      code: (error as any).code,
    });
  }

  return Boolean(data?.id);
}

export function getFirstAllowedModule(entitlements: WorkspaceEntitlements): OSModuleKey | null {
  const order: OSModuleKey[] = ['nexus', 'system', 'operations', 'social', 'finance', 'client'];
  for (const key of order) {
    if (entitlements[key]) return key;
  }
  return null;
}

export async function requireWorkspaceAccessByOrgSlug(orgSlug: string): Promise<WorkspaceInfo> {
  const clerkUserId = await requireClerkUserId();
  const supabase = createClient();

  if (!orgSlug) {
    throw new Error('Missing orgSlug for workspace route');
  }

  const socialUser = await getCurrentSocialUser(clerkUserId);
  if (!socialUser?.id) {
    redirect('/sign-in');
  }

  const isSuperAdmin = socialUser.role === 'super_admin';

  const organizationKey = orgSlug;

  if (socialUser?.organization_id && String(socialUser.organization_id) === String(organizationKey)) {
    const entitlements = await getOrganizationEntitlements(socialUser.organization_id, socialUser.id, orgSlug);

    return {
      id: organizationKey,
      slug: null,
      name: 'Workspace',
      logo: null,
      entitlements,
    };
  }

  // Resolve org by human slug first; if not found, attempt UUID id lookup (backwards compatible).
  let org: any = null;
  let orgError: any = null;

  const bySlug = await supabase
    .from('organizations')
    .select('id, name, owner_id, slug')
    .eq('slug', organizationKey)
    .maybeSingle();

  org = bySlug.data;
  orgError = bySlug.error;

  // If the slug column doesn't exist yet, fallback to a safe select.
  if (!org?.id && orgError?.message && String(orgError.message).toLowerCase().includes('column') && String(orgError.message).toLowerCase().includes('slug')) {
    const bySlugFallback = await supabase
      .from('organizations')
      .select('id, name, owner_id')
      .eq('id', '__no_such_id__')
      .maybeSingle();
    // Keep org null; just clear the "slug column" error so we can continue to UUID lookup.
    org = bySlugFallback.data;
    orgError = null;
  }

  if (!org?.id) {
    const byId = await supabase
      .from('organizations')
      .select('id, name, owner_id, slug')
      .eq('id', organizationKey)
      .maybeSingle();
    org = byId.data;
    orgError = byId.error;

    if (!org?.id && orgError?.message && String(orgError.message).toLowerCase().includes('column') && String(orgError.message).toLowerCase().includes('slug')) {
      const byIdFallback = await supabase
        .from('organizations')
        .select('id, name, owner_id')
        .eq('id', organizationKey)
        .maybeSingle();
      org = byIdFallback.data;
      orgError = byIdFallback.error;
    }
  }

  if (!org?.id) {
    console.error('[workspace-access] organization not found -> redirect(/)', {
      orgSlug,
      clerkUserId,
      organizationId: organizationKey,
      orgError: orgError ? { message: orgError.message, code: (orgError as any).code } : null,
    });
    redirect('/');
  }

  const isOwner = Boolean(org?.owner_id && socialUser?.id && String(org.owner_id) === String(socialUser.id));
  const isPrimary = Boolean(org?.id && socialUser?.organization_id && String(socialUser.organization_id) === String(org.id));

  const isTeamMember = isSuperAdmin
    ? false
    : await hasTeamMembership({ supabase, socialUserId: String(socialUser.id), organizationId: String(org.id) });

  if (!isSuperAdmin && !isOwner && !isPrimary && !isTeamMember) {
    console.error('[workspace-access] forbidden -> redirect(/)', {
      orgSlug,
      clerkUserId,
      organizationId: organizationKey,
      org: { id: org.id, owner_id: org.owner_id },
      socialUser,
      isOwner,
      isPrimary,
      isTeamMember,
      isSuperAdmin,
    });
    redirect('/');
  }

  const entitlements = await getOrganizationEntitlements(org.id, socialUser.id, orgSlug);

  return {
    id: org.id,
    slug: org.slug ?? null,
    name: org.name,
    logo: null,
    entitlements,
  };
}

export async function requireWorkspaceAccessByOrgSlugUi(orgSlug: string): Promise<WorkspaceInfoWithPackage> {
  const workspace = await requireWorkspaceAccessByOrgSlug(orgSlug);
  const clerkUserId = await requireClerkUserId();
  const socialUser = await getCurrentSocialUser(clerkUserId);

  const { packageType, entitlements } = await getOrganizationPackageEntitlements(workspace.id, socialUser?.id, orgSlug);

  return {
    ...workspace,
    packageType,
    entitlements,
  };
}

export async function requireWorkspaceAccessByOrgSlugApi(orgSlug: string): Promise<WorkspaceInfo> {
  const clerkUserId = await getCurrentUserId();
  if (!clerkUserId) {
    const err = new Error('Unauthorized');
    (err as any).status = 401;
    throw err;
  }

  const supabase = createClient();

  const socialUser = await getCurrentSocialUser(clerkUserId);
  if (!socialUser?.id) {
    const err = new Error('Unauthorized');
    (err as any).status = 401;
    throw err;
  }

  const isSuperAdmin = socialUser.role === 'super_admin';

  const organizationKey = orgSlug;

  let org: any = null;
  const bySlug = await supabase
    .from('organizations')
    .select('id, name, owner_id, slug')
    .eq('slug', organizationKey)
    .maybeSingle();
  org = bySlug.data;

  if (!org?.id && bySlug.error?.message && String(bySlug.error.message).toLowerCase().includes('column') && String(bySlug.error.message).toLowerCase().includes('slug')) {
    // slug column not available yet -> skip slug lookup and continue with id lookup
    org = null;
  }

  if (!org?.id) {
    const byId = await supabase
      .from('organizations')
      .select('id, name, owner_id, slug')
      .eq('id', organizationKey)
      .maybeSingle();

    org = byId.data;

    if (!org?.id && byId.error?.message && String(byId.error.message).toLowerCase().includes('column') && String(byId.error.message).toLowerCase().includes('slug')) {
      const byIdFallback = await supabase
        .from('organizations')
        .select('id, name, owner_id')
        .eq('id', organizationKey)
        .maybeSingle();
      org = byIdFallback.data;
    }
  }

  if (!org?.id) {
    const err = new Error('Organization not found');
    (err as any).status = 404;
    throw err;
  }

  const isOwner = org.owner_id === socialUser.id;
  const isPrimary = socialUser.organization_id === org.id;

  const isTeamMember = isSuperAdmin
    ? false
    : await hasTeamMembership({ supabase, socialUserId: String(socialUser.id), organizationId: String(org.id) });

  if (!isSuperAdmin && !isOwner && !isPrimary && !isTeamMember) {
    const err = new Error('Forbidden');
    (err as any).status = 403;
    throw err;
  }

  const entitlements = await getOrganizationEntitlements(org.id, socialUser.id, orgSlug);

  return {
    id: org.id,
    slug: org.slug ?? null,
    name: org.name,
    logo: null,
    entitlements,
  };
}

export async function enforceModuleAccessOrRedirect({
  orgSlug,
  module,
}: {
  orgSlug: string;
  module: OSModuleKey;
}) {
  const workspace = await requireWorkspaceAccessByOrgSlug(orgSlug);

  if (workspace.entitlements[module]) {
    return workspace;
  }

  redirect(`/w/${encodeURIComponent(orgSlug)}/no-access?module=${encodeURIComponent(module)}`);
}
