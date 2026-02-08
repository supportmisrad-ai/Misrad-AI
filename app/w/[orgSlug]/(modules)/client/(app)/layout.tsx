import { currentUser } from '@clerk/nextjs/server';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { getCurrentUserInfo } from '@/app/actions/users';
import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';
import { resolveWorkspaceCurrentUserForUi } from '@/lib/server/workspaceUser';
import { getClientOSClients, getOrganizationSessions } from '@/app/actions/client-portal-clinic';
import ClientOsAppLayoutClient from '@/components/client-os-full/app-router/ClientOsAppLayoutClient';
import { getSystemMetadata } from '@/lib/metadata';
import { asObject } from '@/lib/shared/unknown';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = getSystemMetadata('client');

export default async function ClientAppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }> | { orgSlug: string };
}) {
  const { orgSlug } = await params;

  const workspace = await requireWorkspaceAccessByOrgSlug(orgSlug);

  const clerkUserId = await getCurrentUserId();
  if (!clerkUserId) {
    redirect(`/login?redirect=${encodeURIComponent(`/w/${encodeURIComponent(orgSlug)}/client`)}`);
  }

  const clerkUser = await currentUser();

  const clerkPublicMeta = asObject(clerkUser?.publicMetadata);
  const clerkPrivateMeta = asObject(clerkUser?.privateMetadata);
  const clerkUnsafeMeta = asObject(clerkUser?.unsafeMetadata);

  const clerkIsSuperAdmin =
    Boolean(clerkPublicMeta?.isSuperAdmin) ||
    String(clerkPublicMeta?.role || '').toLowerCase() === 'super_admin';
  const userInfo = await getCurrentUserInfo();

  const fallbackUser = userInfo.success
    ? {
        organization_id: userInfo.organizationId ?? null,
        role: userInfo.role ?? null,
      }
    : null;

  let user: { organization_id: string | null; role: string | null } | null = null;
  try {
    user = await prisma.organizationUser.findFirst({
      where: { clerk_user_id: clerkUserId },
      select: { organization_id: true, role: true },
    });
  } catch {
    user = null;
  }

  const roleFromClerk =
    clerkPublicMeta?.role ??
    clerkPrivateMeta?.role ??
    clerkUnsafeMeta?.role;

  const normalizedRoleFromClerk = typeof roleFromClerk === 'string' ? roleFromClerk : (asObject(roleFromClerk)?.role ?? null);
  const KNOWN_ROLES = new Set(['super_admin', 'owner', 'team_member', 'admin']);
  const safeRoleFromClerk =
    typeof normalizedRoleFromClerk === 'string' && KNOWN_ROLES.has(normalizedRoleFromClerk) ? normalizedRoleFromClerk : null;

  const role = ((fallbackUser?.role ?? safeRoleFromClerk ?? user?.role ?? null) as string | null) ?? null;
  const isAdmin = clerkIsSuperAdmin || role === 'admin' || role === 'super_admin' || role === 'owner';

  const organizationId = String(workspace?.id || '');
  const organization: { id: string; name: string; logo?: string | null; has_client?: boolean | null } | null =
    organizationId
      ? {
          id: organizationId,
          name: String(workspace?.name || 'Workspace'),
          logo: (asObject(workspace)?.logo as string | null | undefined) ?? null,
          has_client: Boolean(workspace?.entitlements?.client),
        }
      : null;

  const hasClient = Boolean(workspace?.entitlements?.client);
  const canAccess = hasClient || isAdmin;
  if (!canAccess) {
    redirect('/subscribe/checkout');
  }

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

  const [initialClients, initialMeetings, initialCurrentUser] = await Promise.all([
    getClientOSClients(organizationId),
    getOrganizationSessions(organizationId),
    resolveWorkspaceCurrentUserForUi(orgSlug),
  ]);

  const initialOrganization = organization
    ? { name: organization.name, logo: organization.logo || '', primaryColor: '#000000' }
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
