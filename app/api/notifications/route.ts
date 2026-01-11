/**
 * Notifications API
 * 
 * Handles fetching notifications for the current user
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '../../../lib/auth';
import { supabase } from '../../../lib/supabase';
import { getUsers } from '../../../lib/db';
import { requireWorkspaceAccessByOrgSlugApi } from '@/lib/server/workspace';

export async function GET(request: NextRequest) {
    try {
        const user = await getAuthenticatedUser();

        const headerOrgId = request.headers.get('x-org-id') || request.headers.get('x-orgid');
        let workspaceId: string | null = null;
        if (headerOrgId) {
            const workspace = await requireWorkspaceAccessByOrgSlugApi(headerOrgId);
            workspaceId = workspace.id;
        } else {
            // Strict mode: no unscoped notifications
            return NextResponse.json({ notifications: [] }, { status: 200 });
        }
        
        if (!supabase) {
            return NextResponse.json({ notifications: [] }, { status: 200 });
        }

        // Get user from database by email
        if (!user.email) {
            return NextResponse.json({ notifications: [] }, { status: 200 });
        }

        const dbUsers = await getUsers({ email: user.email, tenantId: workspaceId ?? undefined });
        const dbUser = dbUsers.length > 0 ? dbUsers[0] : null;

        if (!dbUser) {
            return NextResponse.json({ notifications: [] }, { status: 200 });
        }

        // Fetch notifications for this user
        let baseQuery = supabase
            .from('misrad_notifications')
            .select('*')
            .eq('recipient_id', dbUser.id)
            .order('created_at', { ascending: false })
            .limit(50);

        // Strict mode: always tenant-scope
        baseQuery = baseQuery.eq('organization_id', workspaceId);

        let notifications: any[] | null = null;
        let error: any = null;

        // Some installations use camelCase (isRead), others use snake_case (is_read).
        // If neither exists, fall back to returning latest notifications without unread filter.
        ({ data: notifications, error } = await baseQuery.eq('isRead', false));
        if (error?.code === '42703') {
            ({ data: notifications, error } = await baseQuery.eq('is_read', false));
        }
        if (error?.code === '42703') {
            // Strict mode: missing expected columns (tenant_id / isRead / is_read) => treat as empty
            return NextResponse.json({ notifications: [] }, { status: 200 });
        }

        if (error) {
            console.error('[API] Error fetching notifications:', error);
            // Return empty instead of crashing (missing column / RLS / other DB issues)
            return NextResponse.json({ notifications: [] }, { status: 200 });
        }

        return NextResponse.json({ notifications: notifications || [] }, { status: 200 });

    } catch (error: any) {
        console.error('[API] Error in /api/notifications GET:', error);
        const isUnauthorized = Boolean(error?.message && String(error.message).includes('Unauthorized'));
        if (isUnauthorized) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.json({ notifications: [] }, { status: 200 });
    }
}
