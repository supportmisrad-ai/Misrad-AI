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

import { shabbatGuard } from '@/lib/api-shabbat-guard';

async function selectDbUserId(params: { workspaceId: string; email: string }): Promise<string | null> {
    const email = String(params.email || '').trim().toLowerCase();
    if (!email) return null;

    const rows = await queryRawOrgScoped<any[]>(prisma, {
        organizationId: params.workspaceId,
        reason: 'notifications_resolve_user_id',
        query: `
            select id::text as id
            from nexus_users
            where organization_id = $1::uuid
              and lower(email) = $2::text
            order by updated_at desc nulls last, created_at desc nulls last
            limit 1
        `,
        values: [params.workspaceId, email],
    });

    const row = Array.isArray(rows) ? rows[0] : null;
    return row?.id ? String(row.id) : null;
}

async function GETHandler(request: NextRequest) {
    try {
        const user = await getAuthenticatedUser();

        const { workspaceId } = await getWorkspaceOrThrow(request);

        const bypassTenantIsolationE2e =
            String(process.env.E2E_BYPASS_MODULE_ENTITLEMENTS || '').toLowerCase() === '1' ||
            String(process.env.E2E_BYPASS_MODULE_ENTITLEMENTS || '').toLowerCase() === 'true';

        const isDev = process.env.NODE_ENV === 'development';
        const isE2E = String(process.env.IS_E2E_TESTING || '').toLowerCase() === 'true';
        const allowUnscoped = bypassTenantIsolationE2e;
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

        const tenantNotifications = await queryRawOrgScoped<any[]>(prisma, {
            organizationId: workspaceId,
            reason: 'notifications_list_tenant',
            query: `
                select *
                from misrad_notifications
                where organization_id = $1::uuid
                  and recipient_id::text = $2::text
                order by created_at desc
                limit 50
            `,
            values: [workspaceId, String(dbUserId)],
        });

        const combined = (Array.isArray(tenantNotifications) ? tenantNotifications : [])
            .filter((n: any) => n && n.id)
            .sort((a: any, b: any) => {
                const aa = String(a?.created_at || '');
                const bb = String(b?.created_at || '');
                return bb.localeCompare(aa);
            })
            .slice(0, 100);

        return apiSuccess({ notifications: combined }, { status: 200 });

    } catch (error: any) {
        console.error('[API] Error in /api/notifications GET:', error);
        if (error instanceof APIError) {
            return apiError(error, { status: error.status, message: error.message || 'Forbidden' });
        }
        const isUnauthorized = Boolean(error?.message && String(error.message).includes('Unauthorized'));
        if (isUnauthorized) {
            return apiError('Unauthorized', { status: 401 });
        }
        return apiSuccess({ notifications: [] }, { status: 200 });
    }
}

export const GET = shabbatGuard(GETHandler);
