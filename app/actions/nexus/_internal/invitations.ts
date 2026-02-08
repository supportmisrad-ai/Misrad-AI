import 'server-only';

import { requirePermission } from '@/lib/auth';
import { getBaseUrl } from '@/lib/utils';
import { sendEmployeeInvitationEmail } from '@/lib/email';
import { resolveWorkspaceCurrentUserForApi } from '@/lib/server/workspaceUser';

import { findNexusUserRowByEmail, findNexusUserRowById } from '@/lib/services/nexus-users-service';

export async function sendNexusUserInvitation(params: {
  orgId: string;
  email: string;
  userId?: string | null;
  userName?: string | null;
  department?: string | null;
  role?: string | null;
}): Promise<{ success: true; signupUrl: string; emailSent: boolean }> {
  const orgId = String(params.orgId || '').trim();
  if (!orgId) throw new Error('Missing orgId');

  await resolveWorkspaceCurrentUserForApi(orgId);
  await requirePermission('manage_team');

  const email = String(params.email || '').trim().toLowerCase();
  if (!email || !email.includes('@')) {
    throw new Error('Invalid email address');
  }

  const resolved = await resolveWorkspaceCurrentUserForApi(orgId);
  const workspace = resolved.workspace;

  const currentUser = await findNexusUserRowByEmail({
    organizationId: workspace.id,
    email: String(resolved.clerkUser.email || '').trim().toLowerCase(),
    select: { id: true, name: true, department: true, role: true },
  });
  if (!currentUser) {
    throw new Error('User not found');
  }

  type InvitedUserRow = {
    id: string;
    name: string;
    department: string | null;
    role: string;
  };
  let invitedUser: InvitedUserRow | null = null;
  if (params.userId) {
    invitedUser = await findNexusUserRowById({
      organizationId: workspace.id,
      userId: String(params.userId),
      select: { id: true, name: true, department: true, role: true },
    });
  }

  const baseUrl = getBaseUrl();
  const signupUrl = `${baseUrl}/login?mode=sign-up&email=${encodeURIComponent(email)}&invited=true`;

  const emailResult = await sendEmployeeInvitationEmail(
    email,
    params.userName || invitedUser?.name || null,
    params.department || invitedUser?.department || 'כללי',
    params.role || invitedUser?.role || 'עובד',
    signupUrl,
    currentUser.name || null
  );

  return {
    success: true,
    signupUrl,
    emailSent: Boolean(emailResult.success),
  };
}
