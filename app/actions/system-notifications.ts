'use server';

import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';
import { resolveWorkspaceCurrentUserForUi } from '@/lib/server/workspaceUser';
import type { SystemNotificationDTO } from '@/lib/services/system/notifications';
import {
  deleteSystemNotificationForOrganizationId,
  getSystemNotificationsForOrganizationId,
  markAllSystemNotificationsReadForOrganizationId,
  markSystemNotificationReadForOrganizationId,
} from '@/lib/services/system/notifications';

export type { SystemNotificationDTO } from '@/lib/services/system/notifications';

export async function getSystemNotifications(params: {
  orgSlug: string;
  limit?: number;
}): Promise<SystemNotificationDTO[]> {
  const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
  const currentUser = await resolveWorkspaceCurrentUserForUi(params.orgSlug);

  return await getSystemNotificationsForOrganizationId({
    organizationId: String(workspace.id),
    recipientId: String(currentUser.id),
    limit: params.limit,
  });
}

export async function markSystemNotificationRead(params: {
  orgSlug: string;
  id: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
  const currentUser = await resolveWorkspaceCurrentUserForUi(params.orgSlug);
  return await markSystemNotificationReadForOrganizationId({
    organizationId: String(workspace.id),
    recipientId: String(currentUser.id),
    id: String(params.id),
  });
}

export async function markAllSystemNotificationsRead(params: {
  orgSlug: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
  const currentUser = await resolveWorkspaceCurrentUserForUi(params.orgSlug);
  return await markAllSystemNotificationsReadForOrganizationId({
    organizationId: String(workspace.id),
    recipientId: String(currentUser.id),
  });
}

export async function deleteSystemNotification(params: {
  orgSlug: string;
  id: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
  const currentUser = await resolveWorkspaceCurrentUserForUi(params.orgSlug);
  return await deleteSystemNotificationForOrganizationId({
    organizationId: String(workspace.id),
    recipientId: String(currentUser.id),
    id: String(params.id),
  });
}
