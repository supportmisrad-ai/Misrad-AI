/**
 * Announcement Management API
 * 
 * Handles updating and deleting individual announcements
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '../../../../lib/auth';
import { createClient } from '../../../../lib/supabase';
import { requireWorkspaceAccessByOrgSlugApi } from '@/lib/server/workspace';

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
        return await params.supabaseClient
            .from('announcements')
            .update(params.patch)
            .eq('id', params.announcementId)
            .eq('tenant_id', params.workspaceId)
            .select()
            .single();
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
            return NextResponse.json(
                { error: 'Forbidden - Only Super Admins can delete announcements' },
                { status: 403 }
            );
        }

        let supabase: any;
        try {
            supabase = createClient();
        } catch (e: any) {
            return NextResponse.json(
                { error: e?.message || 'Database not configured' },
                { status: 500 }
            );
        }

        const orgHeader = request.headers.get('x-org-id') || request.headers.get('x-orgid');
        if (!orgHeader) {
            return NextResponse.json({ error: 'Missing x-org-id header' }, { status: 400 });
        }

        const workspace = await requireWorkspaceAccessByOrgSlugApi(orgHeader);

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
                return NextResponse.json(
                    { error: 'Announcements table is not configured in the database' },
                    { status: 501 }
                );
            }
            console.error('[API] Error deleting announcement:', error);
            return NextResponse.json(
                { error: 'שגיאה במחיקת הודעה' },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true }, { status: 200 });

    } catch (error: any) {
        console.error('[API] Error in DELETE /api/announcements/[id]:', error);
        return NextResponse.json(
            { error: error.message || 'שגיאה במחיקת הודעה' },
            { status: 500 }
        );
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
            return NextResponse.json(
                { error: 'Forbidden - Only Super Admins can update announcements' },
                { status: 403 }
            );
        }

        let supabase: any;
        try {
            supabase = createClient();
        } catch (e: any) {
            return NextResponse.json(
                { error: e?.message || 'Database not configured' },
                { status: 500 }
            );
        }

        const orgHeader = request.headers.get('x-org-id') || request.headers.get('x-orgid');
        if (!orgHeader) {
            return NextResponse.json({ error: 'Missing x-org-id header' }, { status: 400 });
        }

        const workspace = await requireWorkspaceAccessByOrgSlugApi(orgHeader);

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
                return NextResponse.json(
                    { error: 'Announcements table is not configured in the database' },
                    { status: 501 }
                );
            }
            console.error('[API] Error updating announcement:', error);
            return NextResponse.json(
                { error: 'שגיאה בעדכון הודעה' },
                { status: 500 }
            );
        }

        return NextResponse.json({ announcement }, { status: 200 });

    } catch (error: any) {
        console.error('[API] Error in PATCH /api/announcements/[id]:', error);
        return NextResponse.json(
            { error: error.message || 'שגיאה בעדכון הודעה' },
            { status: 500 }
        );
    }
}


export const PATCH = shabbatGuard(PATCHHandler);

export const DELETE = shabbatGuard(DELETEHandler);
