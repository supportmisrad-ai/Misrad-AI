'use server';

import { withWorkspaceTenantContext } from '@/lib/server/workspace-tenant-context';
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
  return await withWorkspaceTenantContext(
    params.orgSlug,
    async ({ organizationId }) => {
      const currentUser = await resolveWorkspaceCurrentUserForUi(params.orgSlug);
      return await getSystemNotificationsForOrganizationId({
        organizationId: String(organizationId),
        recipientId: String(currentUser.id),
        limit: params.limit,
      });
    },
    { source: 'server_actions_system_notifications', reason: 'getSystemNotifications' }
  );
}

export async function markSystemNotificationRead(params: {
  orgSlug: string;
  id: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  return await withWorkspaceTenantContext(
    params.orgSlug,
    async ({ organizationId }) => {
      const currentUser = await resolveWorkspaceCurrentUserForUi(params.orgSlug);
      return await markSystemNotificationReadForOrganizationId({
        organizationId: String(organizationId),
        recipientId: String(currentUser.id),
        id: String(params.id),
      });
    },
    { source: 'server_actions_system_notifications', reason: 'markSystemNotificationRead' }
  );
}

export async function markAllSystemNotificationsRead(params: {
  orgSlug: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  return await withWorkspaceTenantContext(
    params.orgSlug,
    async ({ organizationId }) => {
      const currentUser = await resolveWorkspaceCurrentUserForUi(params.orgSlug);
      return await markAllSystemNotificationsReadForOrganizationId({
        organizationId: String(organizationId),
        recipientId: String(currentUser.id),
      });
    },
    { source: 'server_actions_system_notifications', reason: 'markAllSystemNotificationsRead' }
  );
}

export async function deleteSystemNotification(params: {
  orgSlug: string;
  id: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  return await withWorkspaceTenantContext(
    params.orgSlug,
    async ({ organizationId }) => {
      const currentUser = await resolveWorkspaceCurrentUserForUi(params.orgSlug);
      return await deleteSystemNotificationForOrganizationId({
        organizationId: String(organizationId),
        recipientId: String(currentUser.id),
        id: String(params.id),
      });
    },
    { source: 'server_actions_system_notifications', reason: 'deleteSystemNotification' }
  );
}
