import { currentUser } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { getCurrentUserInfo } from '@/app/actions/users';
import { redirect } from 'next/navigation';
import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';
import { resolveWorkspaceCurrentUserForUi } from '@/lib/server/workspaceUser';
import ClientModuleEntryClient from '../ClientModuleEntryClient';
import { resolveStorageUrlMaybeServiceRole } from '@/lib/services/operations/storage';
import { asObject } from '@/lib/shared/unknown';

export const dynamic = 'force-dynamic';

function getRoleFromMetadata(value: unknown): string | null {
  if (typeof value === 'string') return value;
  const obj = asObject(value);
  const role = obj?.role;
  return typeof role === 'string' ? role : null;
}

export default async function ClientMePage({
  params,
}: {
  params: Promise<{ orgSlug: string }> | { orgSlug: string };
}) {
  const { orgSlug } = await params;

  const workspace = await requireWorkspaceAccessByOrgSlug(orgSlug);

  const clerkUserId = await getCurrentUserId();
  if (!clerkUserId) {
    redirect(`/login?redirect=${encodeURIComponent(`/w/${encodeURIComponent(orgSlug)}/client/me`)}`);
  }

  const clerkUser = await currentUser();
  const userInfo = await getCurrentUserInfo();

  const fallbackUser = userInfo.success
    ? {
        organization_id: userInfo.organizationId ?? null,
        role: userInfo.role ?? null,
      }
    : null;

  const user = await prisma.organizationUser.findFirst({
    where: { clerk_user_id: clerkUserId },
    select: { organization_id: true, role: true },
  });

  const clerkObj = asObject(clerkUser) ?? {};
  const publicMd = asObject(clerkObj.publicMetadata);
  const privateMd = asObject(clerkObj.privateMetadata);
  const unsafeMd = asObject(clerkObj.unsafeMetadata);
  const roleFromClerk =
    getRoleFromMetadata(publicMd?.role) ??
    getRoleFromMetadata(privateMd?.role) ??
    getRoleFromMetadata(unsafeMd?.role) ??
    null;
  const normalizedRoleFromClerk = roleFromClerk;
  const KNOWN_ROLES = new Set(['super_admin', 'owner', 'team_member', 'admin']);
  const safeRoleFromClerk =
    typeof normalizedRoleFromClerk === 'string' && KNOWN_ROLES.has(normalizedRoleFromClerk) ? normalizedRoleFromClerk : null;

  const role = (fallbackUser?.role ?? safeRoleFromClerk ?? user?.role ?? null) as string | null;
  const isAdmin = role === 'admin' || role === 'super_admin' || role === 'owner';

  const organizationId = String(workspace?.id || '');
  let organization:
    | {
        id: string;
        name: string;
        logo?: string | null;
        has_client?: boolean | null;
      }
    | null = null;

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, name: true, logo: true, has_client: true },
  });
  const signedLogo = await resolveStorageUrlMaybeServiceRole(org?.logo ?? null, 60 * 60, { organizationId });
  organization = org ? { ...org, logo: signedLogo } : null;

  const hasClient = organization?.has_client === true;
  const canAccess = hasClient || isAdmin;
  if (!canAccess) {
    redirect('/subscribe/checkout');
  }

  const identity = {
    id: clerkUserId,
    name: clerkUser?.fullName ?? clerkUser?.username ?? 'User',
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

  const initialCurrentUser = await resolveWorkspaceCurrentUserForUi(orgSlug);
  const initialOrganization = organization
    ? {
        name: organization.name,
        logo: organization.logo || '',
        primaryColor: '#000000',
        isShabbatProtected: workspace.isShabbatProtected,
      }
    : undefined;

  return (
    <ClientModuleEntryClient userData={userData} initialCurrentUser={initialCurrentUser} initialOrganization={initialOrganization} />
  );
}
