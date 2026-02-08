import 'server-only';

import prisma from '@/lib/prisma';
import { getErrorMessage, logWorkspaceAccessError, redactId } from './utils';
import type { OrganizationRow, SocialUserRow } from './types';

async function hasTeamMembership({
  socialUserId,
  organizationId,
}: {
  socialUserId: string;
  organizationId: string;
}): Promise<boolean> {
  try {
    const data = await prisma.teamMember.findFirst({
      where: {
        user_id: socialUserId,
        organization_id: organizationId,
      },
      select: { id: true },
    });
    return Boolean(data?.id);
  } catch (error: unknown) {
    logWorkspaceAccessError('[workspace-access] failed to check team membership', {
      socialUserId: redactId(socialUserId),
      organizationId: redactId(organizationId),
      message: getErrorMessage(error),
    });
    return false;
  }
}

export async function checkWorkspaceMembership(params: {
  org: Pick<OrganizationRow, 'id' | 'owner_id'>;
  socialUser: SocialUserRow | null;
  isSuperAdmin: boolean;
}): Promise<{ allowed: boolean; isOwner: boolean; isPrimary: boolean; isTeamMember: boolean }> {
  const isOwner = Boolean(params.org?.owner_id && params.socialUser?.id && String(params.org.owner_id) === String(params.socialUser.id));
  const isPrimary = Boolean(
    params.org?.id && params.socialUser?.organization_id && String(params.socialUser.organization_id) === String(params.org.id)
  );
  if (params.isSuperAdmin || isOwner || isPrimary) {
    return { allowed: true, isOwner, isPrimary, isTeamMember: false };
  }

  const isTeamMember = await hasTeamMembership({
    socialUserId: String(params.socialUser?.id),
    organizationId: String(params.org.id),
  });

  return { allowed: Boolean(isTeamMember), isOwner, isPrimary, isTeamMember: Boolean(isTeamMember) };
}
