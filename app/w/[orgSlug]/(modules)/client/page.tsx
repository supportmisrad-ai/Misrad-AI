import { currentUser } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { getCurrentUserInfo } from '@/app/actions/users';
import { redirect } from 'next/navigation';
import ClientModuleEntryClient from './ClientModuleEntryClient';

export const dynamic = 'force-dynamic';

export default async function ClientModuleHome({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;

  const clerkUserId = await getCurrentUserId();
  if (!clerkUserId) {
    redirect('/sign-in');
  }

  const clerkUser = await currentUser();
  const supabase = createClient();
  const userInfo = await getCurrentUserInfo();

  const fallbackUser = userInfo.success
    ? {
        organization_id: userInfo.organizationId ?? null,
        role: userInfo.role ?? null,
      }
    : null;

  const { data: user } = await supabase
    .from('social_users')
    .select('organization_id, role')
    .eq('clerk_user_id', clerkUserId)
    .maybeSingle();

  const roleFromClerk =
    (clerkUser as any)?.publicMetadata?.role ??
    (clerkUser as any)?.privateMetadata?.role ??
    (clerkUser as any)?.unsafeMetadata?.role;
  const normalizedRoleFromClerk = typeof roleFromClerk === 'string' ? roleFromClerk : (roleFromClerk as any)?.role ?? null;
  const KNOWN_ROLES = new Set(['super_admin', 'owner', 'team_member', 'admin']);
  const safeRoleFromClerk =
    typeof normalizedRoleFromClerk === 'string' && KNOWN_ROLES.has(normalizedRoleFromClerk) ? normalizedRoleFromClerk : null;

  const role = ((fallbackUser as any)?.role ?? safeRoleFromClerk ?? (user as any)?.role ?? null) as string | null;
  const isAdmin = role === 'admin' || role === 'super_admin' || role === 'owner';

  const organizationId = orgSlug;
  let organization:
    | {
        id: string;
        name: string;
        logo?: string | null;
        has_client?: boolean | null;
      }
    | null = null;

  const { data: org } = await supabase
    .from('organizations')
    .select('id, name, has_client')
    .eq('id', organizationId)
    .maybeSingle();
  organization = org ? { ...org, logo: null } : null;

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

  return <ClientModuleEntryClient userData={userData} />;
}
