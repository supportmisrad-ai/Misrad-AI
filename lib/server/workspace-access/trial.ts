import 'server-only';

import prisma from '@/lib/prisma';
import { withPrismaTenantIsolationOverride } from '@/lib/prisma-tenant-guard';
import { DEFAULT_TRIAL_DAYS } from '@/lib/trial';
import { getErrorMessage, logWorkspaceAccessError } from './utils';

const TRIAL_ENFORCE_THROTTLE_MS = 5 * 60 * 1000; // 5 minutes

declare global {
  var __MISRAD_TRIAL_ENFORCE_LAST__: Map<string, number> | undefined;
}

function shouldSkipTrialEnforce(organizationId: string, now: number): boolean {
  if (!globalThis.__MISRAD_TRIAL_ENFORCE_LAST__) {
    globalThis.__MISRAD_TRIAL_ENFORCE_LAST__ = new Map();
  }
  const map = globalThis.__MISRAD_TRIAL_ENFORCE_LAST__;
  const last = map.get(organizationId);
  if (last !== undefined && now - last < TRIAL_ENFORCE_THROTTLE_MS) return true;
  map.set(organizationId, now);
  if (map.size > 500) {
    const oldest = Array.from(map.entries()).sort((a, b) => a[1] - b[1]).slice(0, 100);
    for (const [k] of oldest) map.delete(k);
  }
  return false;
}

export async function enforceTrialExpirationBestEffort(params: {
  organizationId: string;
  socialUserId: string;
  now: Date;
}): Promise<void> {
  try {
    const organizationId = String(params.organizationId || '').trim();
    const socialUserId = String(params.socialUserId || '').trim();
    const now = params.now instanceof Date ? params.now : new Date();

    if (!organizationId || !socialUserId || Number.isNaN(now.getTime())) return;

    if (shouldSkipTrialEnforce(organizationId, now.getTime())) return;

    const [member, org] = await Promise.all([
      prisma.teamMember.findFirst(
        withPrismaTenantIsolationOverride(
          {
            where: {
              organization_id: organizationId,
              user_id: socialUserId,
            },
            select: {
              id: true,
              organization_id: true,
              user_id: true,
              role: true,
              trial_start_date: true,
              trial_days: true,
            },
          },
          {
            suppressReporting: true,
            reason: 'workspace_trial_expiration_lookup_team_membership',
            source: 'workspace_access',
            organizationId,
          }
        )
      ),
      prisma.organization.findUnique(
        withPrismaTenantIsolationOverride(
          {
            where: { id: organizationId },
            select: {
              subscription_status: true,
              subscription_plan: true,
              trial_start_date: true,
              trial_days: true,
            },
          },
          {
            suppressReporting: true,
            reason: 'workspace_trial_expiration_lookup_org',
            source: 'workspace_access',
            organizationId,
          }
        )
      ),
    ]);

    const updates: Promise<unknown>[] = [];

    if (member && org?.subscription_status === 'trial' && org?.trial_start_date) {
      const start = org.trial_start_date instanceof Date ? org.trial_start_date : new Date(String(org.trial_start_date));
      const days = Number.isFinite(Number(org.trial_days)) ? Number(org.trial_days) : DEFAULT_TRIAL_DAYS;
      if (!Number.isNaN(start.getTime()) && Number.isFinite(days) && days > 0) {
        const end = new Date(start);
        end.setDate(end.getDate() + Math.floor(days));
        if (now > end) {
          updates.push(
            prisma.teamMember.updateMany({
              where: {
                organization_id: organizationId,
                user_id: socialUserId,
              },
              data: {
                subscription_status: 'expired',
                updated_at: now,
              },
            })
          );
        }
      }
    }

    if (org?.subscription_status === 'trial' && org?.trial_start_date) {
      const start = org.trial_start_date instanceof Date ? org.trial_start_date : new Date(String(org.trial_start_date));
      const days = Number.isFinite(Number(org.trial_days)) ? Number(org.trial_days) : DEFAULT_TRIAL_DAYS;
      if (!Number.isNaN(start.getTime()) && Number.isFinite(days) && days > 0) {
        const end = new Date(start);
        end.setDate(end.getDate() + Math.floor(days));
        if (now > end) {
          updates.push(
            prisma.organization.updateMany({
              where: {
                id: organizationId,
                subscription_status: 'trial',
              },
              data: {
                subscription_status: 'expired',
                updated_at: now,
              },
            })
          );
        }
      }
    }

    if (updates.length) {
      await Promise.allSettled(updates);
    }
  } catch (e: unknown) {
    logWorkspaceAccessError('[workspace-access] enforceTrialExpirationBestEffort failed (ignored)', {
      message: getErrorMessage(e),
    });
  }
}
