import 'server-only';

import { currentUser } from '@clerk/nextjs/server';

import { resolveWorkspaceCurrentUserForApi } from '@/lib/server/workspaceUser';
import { requireWorkspaceIdByOrgSlugApi } from '@/lib/server/workspace';

import {
  setNexusUserOnlineByEmailWithLastSeenAt,
  setNexusUserOnlineOnlineOnly,
  setNexusUserOnlineOnlineOnlyByEmail,
  setNexusUserOnlineWithLastSeenAt,
} from '@/lib/services/nexus-presence-service';

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
    const { id: workspaceId } = await requireWorkspaceIdByOrgSlugApi(params.orgId);

    const clerk = await currentUser();
    const clerkUserId = clerk?.id || null;
    if (!clerkUserId) {
      throw new Error('Unauthorized');
    }

    const emailRaw = clerk?.primaryEmailAddress?.emailAddress ?? null;
    const email = emailRaw ? String(emailRaw).trim().toLowerCase() : '';

    const now = new Date();
    const isDev = process.env.NODE_ENV !== 'production';

    // Try direct update first - update by email (NexusUser.id is a UUID, not clerkUserId)
    if (email) {
      try {
        const result = await setNexusUserOnlineByEmailWithLastSeenAt({
          organizationId: workspaceId,
          email,
          now,
        });

        if (result?.count) {
          return {
            ok: true,
            serverTime: now.toISOString(),
            ...(isDev
              ? {
                  debug: {
                    workspaceId,
                    userId: clerkUserId,
                    usedFallback: false,
                    updatedCount: result.count,
                  },
                }
              : {}),
          };
        }
      } catch {
        try {
          const result = await setNexusUserOnlineOnlineOnlyByEmail({
            organizationId: workspaceId,
            email,
          });

          if (result?.count) {
            return {
              ok: true,
              serverTime: now.toISOString(),
              ...(isDev
                ? {
                    debug: {
                      workspaceId,
                      userId: clerkUserId,
                      usedFallback: true,
                      updatedCount: result.count,
                    },
                  }
                : {}),
            };
          }
        } catch {
          // ignore
        }
      }
    }

    // Fallback to the full resolution logic
    const resolved = await resolveWorkspaceCurrentUserForApi(params.orgId);
    const dbUser = asObject(resolved.user) ?? {};
    const dbUserId = String(dbUser.id ?? '').trim();
    if (!dbUserId) throw new Error('User not found');

    let updatedCount: { count: number } | null = null;
    let usedFallback = false;
    try {
      // Use update instead of updateMany for better performance
      const result = await setNexusUserOnlineWithLastSeenAt({
        organizationId: workspaceId,
        userId: dbUserId,
        now,
      });
      updatedCount = { count: result ? 1 : 0 };
    } catch {
      // If the DB isn't migrated yet (missing last_seen_at), fall back to legacy behavior.
      usedFallback = true;
      if (email) {
        updatedCount = await setNexusUserOnlineOnlineOnlyByEmail({ organizationId: workspaceId, email });
      } else {
        updatedCount = await setNexusUserOnlineOnlineOnly({ organizationId: workspaceId, userId: dbUserId });
      }
    }
    if (!updatedCount?.count) {
      throw new Error(
        isDev
          ? `Failed to update presence (userId=${dbUserId} workspaceId=${workspaceId} orgId=${params.orgId} usedFallback=${usedFallback})`
          : 'Failed to update presence'
      );
    }
    return {
      ok: true,
      serverTime: now.toISOString(),
      ...(isDev
        ? {
            debug: {
              workspaceId,
              userId: dbUserId,
              usedFallback,
              updatedCount: updatedCount.count,
            },
          }
        : {}),
    };
  } catch (error) {
    // If anything fails, fall back to the original implementation
    const resolved = await resolveWorkspaceCurrentUserForApi(params.orgId);
    const workspaceId = resolved.workspace.id;

    const dbUser = asObject(resolved.user) ?? {};
    const dbUserId = String(dbUser.id ?? '').trim();
    if (!dbUserId) throw new Error('User not found');

    const now = new Date();
    const isDev = process.env.NODE_ENV !== 'production';

    let updatedCount: { count: number } | null = null;
    let usedFallback = false;
    try {
      // Use update instead of updateMany for better performance
      const result = await setNexusUserOnlineWithLastSeenAt({
        organizationId: workspaceId,
        userId: dbUserId,
        now,
      });
      updatedCount = { count: result ? 1 : 0 };
    } catch {
      // If the DB isn't migrated yet (missing last_seen_at), fall back to legacy behavior.
      usedFallback = true;
      const email = resolved?.clerkUser?.email ? String(resolved.clerkUser.email).trim().toLowerCase() : '';
      if (email) {
        updatedCount = await setNexusUserOnlineOnlineOnlyByEmail({ organizationId: workspaceId, email });
      } else {
        updatedCount = await setNexusUserOnlineOnlineOnly({ organizationId: workspaceId, userId: dbUserId });
      }
    }
    if (!updatedCount?.count) {
      throw new Error(
        isDev
          ? `Failed to update presence (userId=${dbUserId} workspaceId=${workspaceId} orgId=${params.orgId} usedFallback=${usedFallback})`
          : 'Failed to update presence'
      );
    }
    return {
      ok: true,
      serverTime: now.toISOString(),
      ...(isDev
        ? {
            debug: {
              workspaceId,
              userId: dbUserId,
              usedFallback,
              updatedCount: updatedCount.count,
            },
          }
        : {}),
    };
  }
}
