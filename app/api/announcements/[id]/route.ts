/**
 * Announcement Management API
 * 
 * Handles updating and deleting individual announcements
 */

import { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '../../../../lib/auth';
import { createClient } from '../../../../lib/supabase';
import { APIError, getWorkspaceOrThrow } from '@/lib/server/api-workspace';
import { apiError, apiSuccess } from '@/lib/server/api-response';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

async function updateAnnouncementInWorkspace(params: { supabaseClient: any; announcementId: string; workspaceId: string; patch: any }) {
    const byOrg = await params.supabaseClient
        .from('announcements')
        .update(params.patch)
        .eq('id', params.announcementId)
        .eq('organization_id', params.workspaceId)
        .select()
        .single();

    if ((byOrg as any)?.error?.code === '42703') {
        throw new Error('[SchemaMismatch] announcements is missing organization_id');
    }

    return byOrg;
}

async function DELETEHandler(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getAuthenticatedUser();
        
        // Only Super Admins can delete announcements
        if (!user.isSuperAdmin) {
            return apiError('Forbidden - Only Super Admins can delete announcements', { status: 403 });
        }

        let supabase: any;
        try {
            supabase = createClient();
        } catch (e: any) {
            return apiError(e?.message || 'Database not configured', { status: 500 });
        }

        const { workspace } = await getWorkspaceOrThrow(request);

        const { id } = await params;

        // Soft delete - set is_active to false
        const res = await updateAnnouncementInWorkspace({
            supabaseClient: supabase,
            announcementId: id,
            workspaceId: workspace.id,
            patch: { is_active: false },
        });
        const error = (res as any)?.error;

        if (error) {
            const msg = String((error as any)?.message || '').toLowerCase();
            if (msg.includes('could not find the table') || msg.includes('schema cache')) {
                return apiError('Announcements table is not configured in the database', { status: 501 });
            }
            console.error('[API] Error deleting announcement:', error);
            return apiError('שגיאה במחיקת הודעה', { status: 500 });
        }

        return apiSuccess({ ok: true }, { status: 200 });

    } catch (error: any) {
        console.error('[API] Error in DELETE /api/announcements/[id]:', error);
        if (error instanceof APIError) {
            return apiError(error, { status: error.status, message: error.message || 'Forbidden' });
        }
        return apiError(error, { status: 500, message: error.message || 'שגיאה במחיקת הודעה' });
    }
}

async function PATCHHandler(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getAuthenticatedUser();
        
        // Only Super Admins can update announcements
        if (!user.isSuperAdmin) {
            return apiError('Forbidden - Only Super Admins can update announcements', { status: 403 });
        }

        let supabase: any;
        try {
            supabase = createClient();
        } catch (e: any) {
            return apiError(e?.message || 'Database not configured', { status: 500 });
        }

        const { workspace } = await getWorkspaceOrThrow(request);

        const { id } = await params;
        const body = await request.json();

        const allowedUpdates: any = {};
        if (body.title !== undefined) allowedUpdates.title = body.title;
        if (body.message !== undefined) allowedUpdates.message = body.message;
        if (body.is_active !== undefined) allowedUpdates.is_active = body.is_active;

        const res = await updateAnnouncementInWorkspace({
            supabaseClient: supabase,
            announcementId: id,
            workspaceId: workspace.id,
            patch: allowedUpdates,
        });

        const announcement = (res as any)?.data;
        const error = (res as any)?.error;

        if (error) {
            const msg = String((error as any)?.message || '').toLowerCase();
            if (msg.includes('could not find the table') || msg.includes('schema cache')) {
                return apiError('Announcements table is not configured in the database', { status: 501 });
            }
            console.error('[API] Error updating announcement:', error);
            return apiError('שגיאה בעדכון הודעה', { status: 500 });
        }

        return apiSuccess({ announcement }, { status: 200 });

    } catch (error: any) {
        console.error('[API] Error in PATCH /api/announcements/[id]:', error);
        if (error instanceof APIError) {
            return apiError(error, { status: error.status, message: error.message || 'Forbidden' });
        }
        return apiError(error, { status: 500, message: error.message || 'שגיאה בעדכון הודעה' });
    }
}


export const PATCH = shabbatGuard(PATCHHandler);

export const DELETE = shabbatGuard(DELETEHandler);
