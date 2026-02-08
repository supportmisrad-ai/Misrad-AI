import { asObject, getErrorMessage } from '@/lib/shared/unknown';
/**
 * Notifications API
 * 
 * Handles fetching notifications for the current user
 */

import { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '../../../lib/auth';
import { APIError, getWorkspaceOrThrow } from '@/lib/server/api-workspace';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import prisma, { queryRawOrgScoped } from '@/lib/prisma';
import { assertNoProdEntitlementsBypass, isBypassModuleEntitlementsEnabled, isE2eTestingEnv } from '@/lib/server/workspace';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

const IS_PROD = process.env.NODE_ENV === 'production';

async function selectDbUserId(params: { workspaceId: string; email: string }): Promise<string | null> {
    const email = String(params.email || '').trim().toLowerCase();
    if (!email) return null;

    const rows = await queryRawOrgScoped<unknown[]>(prisma, {
        organizationId: params.workspaceId,
        reason: 'notifications_resolve_user_id',
        query: `
            select id::text as id
            from nexus_users
            where organization_id::uuid = $1::uuid
              and lower(email) = $2::text
            order by updated_at desc nulls last, created_at desc nulls last
            limit 1
        `,
        values: [params.workspaceId, email],
    });

    const row = Array.isArray(rows) ? rows[0] : null;
    const rowObj = asObject(row);
    return rowObj?.id ? String(rowObj.id) : null;
}

async function GETHandler(request: NextRequest) {
    try {
        const user = await getAuthenticatedUser();

        const { workspaceId } = await getWorkspaceOrThrow(request);

        const allowUnscoped = isBypassModuleEntitlementsEnabled();
        if (allowUnscoped) {
            assertNoProdEntitlementsBypass('api/notifications');
        }

        const isDev = process.env.NODE_ENV === 'development';
        const isE2E = isE2eTestingEnv();
        if (allowUnscoped && !isDev && !isE2E) {
            console.error('[Security Risk] allowUnscoped attempted in Production');
            return apiError('Unscoped access forbidden in production', { status: 403 });
        }

        const email = String(user?.email || '').trim().toLowerCase();
        if (!email) {
            return apiSuccess({ notifications: [] }, { status: 200 });
        }

        const dbUserId = await selectDbUserId({ workspaceId, email });
        if (!dbUserId) {
            return apiSuccess({ notifications: [] }, { status: 200 });
        }

        const tenantNotifications = await queryRawOrgScoped<unknown[]>(prisma, {
            organizationId: workspaceId,
            reason: 'notifications_list_tenant',
            query: `
                select *
                from misrad_notifications
                where organization_id::uuid = $1::uuid
                  and recipient_id::text = $2::text
                order by created_at desc
                limit 50
            `,
            values: [workspaceId, String(dbUserId)],
        });

        const combined = (Array.isArray(tenantNotifications) ? tenantNotifications : [])
            .filter((n) => {
                const obj = asObject(n);
                return Boolean(obj && obj.id);
            })
            .sort((a, b) => {
                const aa = String(asObject(a)?.created_at || '');
                const bb = String(asObject(b)?.created_at || '');
                return bb.localeCompare(aa);
            })
            .slice(0, 100);

        return apiSuccess({ notifications: combined }, { status: 200 });

    } catch (error: unknown) {
        if (IS_PROD) console.error('[API] Error in /api/notifications GET');
        else console.error('[API] Error in /api/notifications GET:', error);
        if (error instanceof APIError) {
            return apiSuccess({ notifications: [] }, { status: 200 });
        }
        const message = getErrorMessage(error);
        const isUnauthorized = Boolean(message && message.includes('Unauthorized'));
        if (isUnauthorized) {
            // Notifications are non-blocking. Returning 200 avoids noisy client errors
            // during auth initialization / navigation.
            return apiSuccess({ notifications: [] }, { status: 200 });
        }
        return apiSuccess({ notifications: [] }, { status: 200 });
    }
}

export const GET = shabbatGuard(GETHandler);
