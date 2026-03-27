import React from 'react';
import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { withPrismaTenantIsolationOverride } from '@/lib/prisma-tenant-guard';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { getCurrentUserInfo } from '@/app/actions/users';
import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';
import { resolveWorkspaceCurrentUserForUi } from '@/lib/server/workspaceUser';
import { getClientOSClients, getOrganizationSessions } from '@/app/actions/client-portal-clinic';
import ClientOsAppLayoutClient from '@/components/client-os-full/app-router/ClientOsAppLayoutClient';
import { resolveStorageUrlMaybeServiceRole } from '@/lib/services/operations/storage';
import { asObject } from '@/lib/shared/unknown';
import { getRoleLevel } from '@/lib/constants/roles';

/**
 * Async server component that fetches heavy Client data.
 * Rendered inside a Suspense boundary in the layout so the layout
 * itself returns instantly (theme wrapper + skeleton fallback).
 */
export default async function ClientAppLayoutShell({
  orgSlug,
  children,
}: {
  orgSlug: string;
  children: React.ReactNode;
}) {
  // Phase 1: Run ALL independent I/O in a single parallel batch
  const [workspace, clerkUserId, clerkUser, userInfo] = await Promise.all([
    requireWorkspaceAccessByOrgSlug(orgSlug),
    getCurrentUserId(),
    currentUser(),
    getCurrentUserInfo(),
  ]);

  if (!clerkUserId) {
    redirect(`/login?redirect=${encodeURIComponent(`/w/${encodeURIComponent(orgSlug)}/client`)}`);
  }

  // DB user lookup — fire immediately, resolve in Phase 2 alongside other I/O
  const userPromise = prisma.organizationUser.findFirst(
    withPrismaTenantIsolationOverride(
      { where: { clerk_user_id: clerkUserId }, select: { organization_id: true, role: true } },
      { suppressReporting: true, source: 'client_app_layout', reason: 'client_layout_cross_tenant_clerk_user_lookup' }
    )
  ).catch(() => null);

  const clerkPublicMeta = asObject(clerkUser?.publicMetadata);
  const clerkPrivateMeta = asObject(clerkUser?.privateMetadata);
  const clerkUnsafeMeta = asObject(clerkUser?.unsafeMetadata);

  const clerkIsSuperAdmin =
    Boolean(clerkPublicMeta?.isSuperAdmin) ||
    String(clerkPublicMeta?.role || '').toLowerCase() === 'super_admin';

  const fallbackUser = userInfo.success
    ? {
        organization_id: userInfo.organizationId ?? null,
        role: userInfo.role ?? null,
      }
    : null;

  const roleFromClerk =
    clerkPublicMeta?.role ??
    clerkPrivateMeta?.role ??
    clerkUnsafeMeta?.role;

  const normalizedRoleFromClerk = typeof roleFromClerk === 'string' ? roleFromClerk : (asObject(roleFromClerk)?.role ?? null);
  const KNOWN_ROLES = new Set(['super_admin', 'owner', 'team_member', 'admin']);
  const safeRoleFromClerk =
    typeof normalizedRoleFromClerk === 'string' && KNOWN_ROLES.has(normalizedRoleFromClerk) ? normalizedRoleFromClerk : null;

  // Resolve the DB user lookup (fired earlier, ran in parallel with the pure computation above)
  const user = await userPromise;
  const role = ((fallbackUser?.role ?? safeRoleFromClerk ?? user?.role ?? null) as string | null) ?? null;
  const isAdmin = clerkIsSuperAdmin || getRoleLevel(role) <= 4;

  const hasClient = Boolean(workspace?.entitlements?.client);
  const canAccess = hasClient || isAdmin;
  if (!canAccess) {
    redirect('/subscribe/checkout');
  }

  const organizationId = String(workspace?.id || '');

  // Phase 2: Run logo signing + data fetches in parallel (all depend on workspace.id)
  const [signedLogo, initialClients, initialMeetings, initialCurrentUser] = await Promise.all([
    workspace.logo
      ? resolveStorageUrlMaybeServiceRole(workspace.logo, 60 * 60, { organizationId, orgSlug })
      : Promise.resolve(''),
    getClientOSClients(organizationId),
    getOrganizationSessions(organizationId),
    resolveWorkspaceCurrentUserForUi(orgSlug),
  ]);

  const organization: { id: string; name: string; logo?: string | null; has_client?: boolean | null } | null =
    organizationId
      ? {
          id: organizationId,
          name: String(workspace?.name || 'Workspace'),
          logo: signedLogo ?? null,
          has_client: hasClient,
        }
      : null;

  const identity = {
    id: clerkUserId,
    name: clerkUser?.fullName ?? clerkUser?.username ?? '—',
    email: clerkUser?.primaryEmailAddress?.emailAddress ?? null,
    avatar: clerkUser?.imageUrl ?? null,
    role,
  };

  const userData = {
    clerkUserId,
    organizationId,
    organization,
    identity,
  };

  const initialOrganization = organization
    ? {
        name: organization.name,
        logo: organization.logo || '',
        primaryColor: '#000000',
        isShabbatProtected: workspace.isShabbatProtected,
      }
    : undefined;

  return (
    <ClientOsAppLayoutClient
      orgSlug={orgSlug}
      userData={userData}
      initialCurrentUser={initialCurrentUser}
      initialOrganization={initialOrganization}
      initialOrgId={organizationId}
      initialClients={initialClients}
      initialMeetings={initialMeetings}
    >
      {children}
    </ClientOsAppLayoutClient>
  );
}
