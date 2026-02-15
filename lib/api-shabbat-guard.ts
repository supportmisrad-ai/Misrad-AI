import { asObject } from '@/lib/shared/unknown';
/**
 * API Shabbat Guard
 * 
 * Wrapper function to protect API routes from being accessed during Shabbat
 */

import { isShabbatNow } from './shabbat';
import { apiError } from '@/lib/server/api-response';
import { enterTenantIsolationContext } from '@/lib/prisma-tenant-guard';
import { APIError, getWorkspaceContextOrThrow } from '@/lib/server/api-workspace';
import prisma from '@/lib/prisma';

function getErrorStatus(error: unknown): number | null {
  const obj = asObject(error);
  const status = obj?.status;
  return typeof status === 'number' && Number.isFinite(status) ? status : null;
}

function toWorkspaceCtx(value: unknown): { params?: unknown } | undefined {
  const obj = asObject(value);
  if (!obj) return undefined;
  return { params: obj.params };
}

/**
 * Wrapper function that blocks API access during Shabbat
 * 
 * Usage:
 * export const GET = shabbatGuard(async (request: NextRequest) => {
 *   // Your handler code
 * });
 */
export function shabbatGuard<TArgs extends unknown[]>(handler: (...args: TArgs) => Promise<Response>) {
  return async (...args: TArgs): Promise<Response> => {
    try {
      let workspaceId: string | null = null;
      try {
        const request = args[0] as unknown;
        const ctx = args.length > 1 ? (args[1] as unknown) : undefined;

        if (request && typeof request === 'object') {
          const resolved = await getWorkspaceContextOrThrow(request as Request, toWorkspaceCtx(ctx));
          workspaceId = resolved.workspaceId ? String(resolved.workspaceId) : null;
        }
      } catch (e: unknown) {
        if (e instanceof APIError && (e.status === 400 || e.status === 401)) {
          workspaceId = null;
        } else {
          const status = getErrorStatus(e);
          return apiError(e, { status: typeof status === 'number' ? status : 403 });
        }
      }

      const shabbatCheck = isShabbatNow();

      if (shabbatCheck.isShabbat) {
        if (!workspaceId) {
          return apiError('Shabbat Mode', {
            status: 503,
            message: 'המערכת לא פעילה בשבת. המערכת תתחיל לפעול לאחר צאת הכוכבים.',
          });
        }

        try {
          const org = await prisma.organization.findUnique({
            where: { id: String(workspaceId) },
            select: { is_shabbat_protected: true },
          });

          if (org?.is_shabbat_protected === false) {
            enterTenantIsolationContext({ source: 'api_shabbat_guard', organizationId: workspaceId });
            return await handler(...args);
          }
        } catch {
          // Fail closed.
        }

        return apiError('Shabbat Mode', {
          status: 503,
          message: 'המערכת לא פעילה בשבת. המערכת תתחיל לפעול לאחר צאת הכוכבים.',
        });
      }

      if (workspaceId) {
        enterTenantIsolationContext({ source: 'api_shabbat_guard', organizationId: workspaceId });
        return await handler(...args);
      }

      // Not Shabbat - proceed with the handler
      return handler(...args);
    } catch (error: unknown) {
      console.error('[ShabbatGuard] Error checking Shabbat:', error);
      // Fail closed: do not allow system activity if we cannot determine Shabbat state.
      return apiError(error, {
        status: 503,
        message: 'המערכת לא פעילה בשבת. המערכת תתחיל לפעול לאחר צאת הכוכבים.',
      });
    }
  };
}

/**
 * Calculate time until a specific date
 */
function calculateTimeUntil(date: Date): string {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  
  if (diff <= 0) return '0 דקות';
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours} שעות ו-${minutes} דקות`;
  }
  return `${minutes} דקות`;
}
