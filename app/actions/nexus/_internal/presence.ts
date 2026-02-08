import 'server-only';

import { currentUser } from '@clerk/nextjs/server';
import { Prisma } from '@prisma/client';

import { resolveWorkspaceCurrentUserForApi } from '@/lib/server/workspaceUser';
import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';

import { setNexusUserOnlineOnlineOnly, setNexusUserOnlineWithLastSeenAt } from '@/lib/services/nexus-presence-service';

import { asObject } from './utils';

export async function updateNexusPresenceHeartbeat(params: {
  orgId: string;
}): Promise<{
  ok: true;
  serverTime: string;
  debug?: { workspaceId: string; userId: string; usedFallback: boolean; updatedCount: number };
}> {
  // Fast path: try to get workspace and user info with minimal DB calls
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgId);

    const clerk = await currentUser();
    const clerkUserId = clerk?.id || null;
    if (!clerkUserId) {
      throw new Error('Unauthorized');
    }

    const now = new Date();
    const isDev = process.env.NODE_ENV !== 'production';

    // Try direct update first - this is the most common case
    try {
      const result = await setNexusUserOnlineWithLastSeenAt({
        organizationId: workspace.id,
        userId: clerkUserId,
        now,
      });

      return {
        ok: true,
        serverTime: now.toISOString(),
        ...(isDev
          ? {
              debug: {
                workspaceId: workspace.id,
                userId: clerkUserId,
                usedFallback: false,
                updatedCount: result ? 1 : 0,
              },
            }
          : {}),
      };
    } catch (updateError) {
      // If direct update fails, fall back to the full resolution logic
      const resolved = await resolveWorkspaceCurrentUserForApi(params.orgId);
      const dbUser = asObject(resolved.user) ?? {};
      const dbUserId = String(dbUser.id ?? '').trim();
      if (!dbUserId) throw new Error('User not found');

      const updateData: Prisma.NexusUserUpdateInput = {
        online: true,
        lastSeenAt: now,
      };

      let updatedCount: { count: number } | null = null;
      let usedFallback = false;
      try {
        // Use update instead of updateMany for better performance
        const result = await setNexusUserOnlineWithLastSeenAt({
          organizationId: workspace.id,
          userId: dbUserId,
          now,
        });
        updatedCount = { count: result ? 1 : 0 };
      } catch {
        // If the DB isn't migrated yet (missing last_seen_at), fall back to legacy behavior.
        usedFallback = true;
        updatedCount = await setNexusUserOnlineOnlineOnly({ organizationId: workspace.id, userId: dbUserId });
      }
      if (!updatedCount?.count) {
        throw new Error(
          isDev
            ? `Failed to update presence (userId=${dbUserId} workspaceId=${workspace.id} orgId=${params.orgId} usedFallback=${usedFallback})`
            : 'Failed to update presence'
        );
      }
      return {
        ok: true,
        serverTime: now.toISOString(),
        ...(isDev
          ? {
              debug: {
                workspaceId: workspace.id,
                userId: dbUserId,
                usedFallback,
                updatedCount: updatedCount.count,
              },
            }
          : {}),
      };
    }
  } catch (error) {
    // If anything fails, fall back to the original implementation
    const resolved = await resolveWorkspaceCurrentUserForApi(params.orgId);
    const workspace = resolved.workspace;

    const dbUser = asObject(resolved.user) ?? {};
    const dbUserId = String(dbUser.id ?? '').trim();
    if (!dbUserId) throw new Error('User not found');

    const now = new Date();
    const isDev = process.env.NODE_ENV !== 'production';

    const updateData: Prisma.NexusUserUpdateInput = {
      online: true,
      lastSeenAt: now,
    };

    let updatedCount: { count: number } | null = null;
    let usedFallback = false;
    try {
      // Use update instead of updateMany for better performance
      const result = await setNexusUserOnlineWithLastSeenAt({
        organizationId: workspace.id,
        userId: dbUserId,
        now,
      });
      updatedCount = { count: result ? 1 : 0 };
    } catch {
      // If the DB isn't migrated yet (missing last_seen_at), fall back to legacy behavior.
      usedFallback = true;
      updatedCount = await setNexusUserOnlineOnlineOnly({ organizationId: workspace.id, userId: dbUserId });
    }
    if (!updatedCount?.count) {
      throw new Error(
        isDev
          ? `Failed to update presence (userId=${dbUserId} workspaceId=${workspace.id} orgId=${params.orgId} usedFallback=${usedFallback})`
          : 'Failed to update presence'
      );
    }
    return {
      ok: true,
      serverTime: now.toISOString(),
      ...(isDev
        ? {
            debug: {
              workspaceId: workspace.id,
              userId: dbUserId,
              usedFallback,
              updatedCount: updatedCount.count,
            },
          }
        : {}),
    };
  }
}
