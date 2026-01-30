/**
 * Announcements API
 * 
 * Handles creating, fetching, and deleting system announcements
 * - All users: recipientType = 'all'
 * - Super Admins only: recipientType = 'super_admins'
 */

import { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '../../../lib/auth';
import { createClient } from '../../../lib/supabase';
import { APIError, getWorkspaceOrThrow } from '@/lib/server/api-workspace';
import { apiError, apiSuccess } from '@/lib/server/api-response';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

function mapDbUserRow(row: any): any {
    return {
        id: row?.id,
        name: row?.name,
        email: row?.email,
        role: row?.role,
        isSuperAdmin: Boolean(row?.is_super_admin ?? false),
    };
}

async function selectUserInWorkspaceByEmail(params: { supabase: any; workspaceId: string; email: string }) {
    const email = String(params.email || '').trim().toLowerCase();
    if (!email) return null;

    const byOrg = await params.supabase
        .from('nexus_users')
        .select('id, name, email, role, is_super_admin')
        .eq('email', email)
        .eq('organization_id', params.workspaceId)
        .limit(1)
        .maybeSingle();

    if ((byOrg as any)?.error?.code === '42703') {
        throw new Error('[SchemaMismatch] nexus_users is missing organization_id');
    }

    return byOrg.data ? mapDbUserRow(byOrg.data) : null;
}

async function selectUserIdsInWorkspacePage(params: { supabase: any; workspaceId: string; from: number; to: number }) {
    const byOrg = await params.supabase
        .from('nexus_users')
        .select('id')
        .eq('organization_id', params.workspaceId)
        .range(params.from, params.to);

    if ((byOrg as any)?.error?.code === '42703') {
        throw new Error('[SchemaMismatch] nexus_users is missing organization_id');
    }

    return (Array.isArray(byOrg.data) ? byOrg.data : []).map((r: any) => String(r?.id)).filter(Boolean);
}

async function selectSuperAdminIdsInWorkspace(params: { supabase: any; workspaceId: string; from: number; to: number }) {
    const byOrg = await params.supabase
        .from('nexus_users')
        .select('id')
        .eq('organization_id', params.workspaceId)
        .eq('is_super_admin', true)
        .range(params.from, params.to);

    if ((byOrg as any)?.error?.code === '42703') {
        throw new Error('[SchemaMismatch] nexus_users is missing organization_id');
    }

    return (Array.isArray(byOrg.data) ? byOrg.data : []).map((r: any) => String(r?.id)).filter(Boolean);
}
async function GETHandler(request: NextRequest) {
    try {
        const user = await getAuthenticatedUser();

        let supabase: any;
        try {
            supabase = createClient();
        } catch (e: any) {
            console.error('[API] Supabase client init failed in GET /api/announcements:', e);
            return apiError(e?.message || 'Database not configured', { status: 500 });
        }

        const { workspace } = await getWorkspaceOrThrow(request);

        // Get user from database by email
        if (!user.email) {
            return apiError('User email not found', { status: 400 });
        }

        const dbUser = await selectUserInWorkspaceByEmail({ supabase, workspaceId: workspace.id, email: user.email });

        if (!dbUser) {
            return apiSuccess({ announcements: [] }, { status: 200 });
        }

        // Determine which announcements to show
        const isSuperAdmin = dbUser.isSuperAdmin === true;
        
        // Fetch announcements for this user (scoped to workspace)
        const baseQuery = () => supabase
            .from('announcements')
            .select('*')
            .or(`recipient_type.eq.all${isSuperAdmin ? ',recipient_type.eq.super_admins' : ''}`)
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(50);

        const byOrg = await baseQuery().eq('organization_id', workspace.id);
        const announcements = (byOrg as any).data;
        let error = (byOrg as any).error;

        if (error?.code === '42703') {
            return apiError('[SchemaMismatch] announcements is missing organization_id', { status: 500 });
        }

        if (error) {
            // The project schema currently does not include an `announcements` table.
            // Fail soft to keep the SaaS console usable.
            const msg = String((error as any)?.message || '').toLowerCase();
            if (msg.includes('could not find the table') || msg.includes('schema cache')) {
                return apiSuccess({ announcements: [] }, { status: 200 });
            }

            console.error('[API] Error fetching announcements:', error);
            return apiError('שגיאה בטעינת הודעות', { status: 500 });
        }

        return apiSuccess({ announcements: announcements || [] }, { status: 200 });

    } catch (error: any) {
        console.error('[API] Error in GET /api/announcements:', error);
        if (error instanceof APIError) {
            return apiError(error, { status: error.status, message: error.message || 'Forbidden' });
        }
        return apiError(error, { status: 500, message: error.message || 'שגיאה בטעינת הודעות' });
    }
}

async function POSTHandler(request: NextRequest) {
    try {
        const user = await getAuthenticatedUser();

        let supabase: any;
        try {
            supabase = createClient();
        } catch (e: any) {
            console.error('[API] Supabase client init failed in POST /api/announcements:', e);
            return apiError(e?.message || 'Database not configured', { status: 500 });
        }

        const { workspace } = await getWorkspaceOrThrow(request);

        // Get user from database first to check permissions
        if (!user.email) {
            return apiError('User email not found', { status: 400 });
        }

        const dbUser = await selectUserInWorkspaceByEmail({ supabase, workspaceId: workspace.id, email: user.email });

        if (!dbUser) {
            return apiError('User not found in database', { status: 404 });
        }

        // Only Super Admins can create announcements
        if (!dbUser.isSuperAdmin) {
            return apiError('Forbidden - Only Super Admins can create announcements', { status: 403 });
        }

        const body = await request.json();
        const { title, message, recipientType } = body;

        if (!title || !message || !recipientType) {
            return apiError('Missing required fields: title, message, recipientType', { status: 400 });
        }

        if (!['all', 'super_admins'].includes(recipientType)) {
            return apiError('Invalid recipientType. Must be "all" or "super_admins"', { status: 400 });
        }

        // Create announcement (scoped to workspace)
        const byOrg = await supabase
            .from('announcements')
            .insert({
                organization_id: workspace.id,
                title,
                message,
                recipient_type: recipientType,
                created_by: dbUser.id,
                is_active: true
            })
            .select()
            .single();

        let announcement = (byOrg as any).data;
        let error = (byOrg as any).error;

        if (error?.code === '42703') {
            return apiError('[SchemaMismatch] announcements is missing organization_id', { status: 500 });
        }

        if (error) {
            const msg = String((error as any)?.message || '').toLowerCase();
            if (msg.includes('could not find the table') || msg.includes('schema cache')) {
                return apiError('Announcements table is not configured in the database', { status: 501 });
            }

            console.error('[API] Error creating announcement:', error);
            return apiError('שגיאה ביצירת הודעה', { status: 500 });
        }

        // Create notifications for all eligible users
        const actorName = dbUser.name || 'מערכת';
        const pageSize = 1000;
        let page = 0;
        while (true) {
            const from = page * pageSize;
            const to = from + pageSize - 1;
            const recipientIds =
                recipientType === 'all'
                    ? await selectUserIdsInWorkspacePage({ supabase, workspaceId: workspace.id, from, to })
                    : await selectSuperAdminIdsInWorkspace({ supabase, workspaceId: workspace.id, from, to });

            if (recipientIds.length === 0) break;

            const notifications = recipientIds.map((recipientId: string) => ({
                organization_id: workspace.id,
                recipient_id: recipientId,
                type: 'system',
                text: title,
                actor_name: actorName,
                related_id: announcement.id,
                is_read: false,
                metadata: {
                    announcementId: announcement.id,
                    message: message
                }
            }));

            const { error: notifError } = await supabase
                .from('misrad_notifications')
                .insert(notifications);

            if (notifError) {
                if (notifError.code !== '42P01' && !String(notifError.message || '').includes('does not exist')) {
                    throw new Error(`[SchemaMismatch] misrad_notifications insert failed: ${notifError.message}`);
                }
                console.error('[API] Error creating notifications:', notifError);
            }

            page += 1;
        }

        return apiSuccess({ announcement }, { status: 201 });

    } catch (error: any) {
        console.error('[API] Error in POST /api/announcements:', error);
        if (error instanceof APIError) {
            return apiError(error, { status: error.status, message: error.message || 'Forbidden' });
        }
        return apiError(error, { status: 500, message: error.message || 'שגיאה ביצירת הודעה' });
    }
}


export const GET = shabbatGuard(GETHandler);

export const POST = shabbatGuard(POSTHandler);
