'use server';

import { randomUUID } from 'crypto';

import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';
import {
  findNexusTaskRow,
  setNexusTaskShareToken,
} from '@/lib/services/nexus-tasks-service';

/**
 * Generate a share token for a task and return the guest URL.
 * Requires auth — only workspace members can generate share links.
 */
export async function generateTaskShareLink(params: {
  orgSlug: string;
  taskId: string;
}): Promise<{ shareUrl: string; shareToken: string }> {
  const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);

  const taskId = String(params.taskId || '').trim();
  if (!taskId) throw new Error('Task ID is required');

  const existing = await findNexusTaskRow({
    organizationId: workspace.id,
    taskId,
  });

  if (!existing) throw new Error('Task not found');
  if (existing.isPrivate) throw new Error('Cannot share a private task');

  // If task already has a share token, reuse it
  const shareToken = (existing as Record<string, unknown>).shareToken
    ? String((existing as Record<string, unknown>).shareToken)
    : randomUUID();

  // Only update if we generated a new token
  if (!(existing as Record<string, unknown>).shareToken) {
    await setNexusTaskShareToken({
      organizationId: workspace.id,
      taskId,
      shareToken,
    });
  }

  return {
    shareToken,
    shareUrl: `/guest/${shareToken}`,
  };
}
