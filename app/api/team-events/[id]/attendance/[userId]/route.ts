/**
 * Update Attendance Status API
 * 
 * For organizers to mark attendance (attended/absent) after event
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '../../../../../../lib/auth';
import { supabase } from '../../../../../../lib/supabase';
import { getUsers } from '../../../../../../lib/db';
import { requireWorkspaceAccessByOrgSlugApi } from '@/lib/server/workspace';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

async function loadTeamEventInWorkspace(params: { supabaseClient: any; eventId: string; workspaceId: string }) {
    const byTenant = await params.supabaseClient
        .from('nexus_team_events')
        .select('*')
        .eq('id', params.eventId)
        .eq('tenant_id', params.workspaceId)
        .single();

    if ((byTenant as any)?.error?.code === '42703') {
        return await params.supabaseClient
            .from('nexus_team_events')
            .select('*')
            .eq('id', params.eventId)
            .eq('organization_id', params.workspaceId)
            .single();
    }

    return byTenant;
}
async function PATCHHandler(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; userId: string }> }
) {
    try {
        const user = await getAuthenticatedUser();
        
        if (!supabase) {
            return NextResponse.json(
                { error: 'Database not configured' },
                { status: 500 }
            );
        }

        const supabaseClient = supabase;

        const orgHeader = request.headers.get('x-org-id') || request.headers.get('x-orgid');
        if (!orgHeader) {
            return NextResponse.json({ error: 'Missing x-org-id header' }, { status: 400 });
        }

        const workspace = await requireWorkspaceAccessByOrgSlugApi(orgHeader);

        const bypassTenantIsolationE2e =
            String(process.env.E2E_BYPASS_MODULE_ENTITLEMENTS || '').toLowerCase() === '1' ||
            String(process.env.E2E_BYPASS_MODULE_ENTITLEMENTS || '').toLowerCase() === 'true';

        const isDev = process.env.NODE_ENV === 'development';
        const isE2E = String(process.env.IS_E2E_TESTING || '').toLowerCase() === 'true';
        const allowUnscoped = bypassTenantIsolationE2e;
        if (allowUnscoped && !isDev && !isE2E) {
            console.error('[Security Risk] allowUnscoped attempted in Production');
            return new NextResponse('Unscoped access forbidden in production', { status: 403 });
        }

        const { id: eventId, userId } = await params;

        if (!eventId || !userId) {
            return NextResponse.json(
                { error: 'Event ID and User ID are required' },
                { status: 400 }
            );
        }

        // Get user from database
        if (!user.email) {
            return NextResponse.json(
                { error: 'User email not found' },
                { status: 400 }
            );
        }

        const dbUsers = await getUsers({
            email: user.email,
            tenantId: workspace.id,
            allowUnscoped: Boolean((user as any)?.isSuperAdmin) || bypassTenantIsolationE2e,
        });
        const dbUser = dbUsers.length > 0 ? dbUsers[0] : null;

        if (!dbUser) {
            return NextResponse.json(
                { error: 'User not found in database' },
                { status: 404 }
            );
        }

        // Get event to check if user is organizer
        const eventRes = await loadTeamEventInWorkspace({ supabaseClient, eventId, workspaceId: workspace.id });
        const event = (eventRes as any).data;
        const eventError = (eventRes as any).error;

        if (eventError || !event) {
            return NextResponse.json(
                { error: 'אירוע לא נמצא' },
                { status: 404 }
            );
        }

        // Check permissions: only organizer or admin can update attendance
        const isOrganizer = event.organizer_id === dbUser.id;
        const isAdmin = dbUser.isSuperAdmin || dbUser.role === 'מנכ״ל' || dbUser.role === 'מנכ"ל' || dbUser.role === 'אדמין';

        if (!isOrganizer && !isAdmin) {
            return NextResponse.json(
                { error: 'רק מארגן האירוע יכול לעדכן נוכחות' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { status, notes } = body;

        if (!status || !['attended', 'absent'].includes(status)) {
            return NextResponse.json(
                { error: 'סטטוס לא תקין. צריך להיות attended או absent' },
                { status: 400 }
            );
        }

        // Update attendance record
        const updateData: any = {
            status,
            attended_at: status === 'attended' ? new Date().toISOString() : null
        };

        if (notes !== undefined) {
            updateData.notes = notes;
        }

        const { data: attendance, error } = await supabaseClient
            .from('nexus_event_attendance')
            .update(updateData)
            .eq('event_id', eventId)
            .eq('user_id', userId)
            .select()
            .single();

        if (error) {
            // If record doesn't exist, create it
            if (error.code === 'PGRST116') {
                const { data: newAttendance, error: createError } = await supabaseClient
                    .from('nexus_event_attendance')
                    .insert({
                        event_id: eventId,
                        user_id: userId,
                        status,
                        attended_at: status === 'attended' ? new Date().toISOString() : null,
                        notes: notes || null
                    })
                    .select()
                    .single();

                if (createError) {
                    console.error('[API] Error creating attendance:', createError);
                    return NextResponse.json(
                        { error: 'שגיאה בעדכון נוכחות' },
                        { status: 500 }
                    );
                }

                return NextResponse.json(
                    { attendance: newAttendance, message: 'נוכחות עודכנה בהצלחה' },
                    { status: 200 }
                );
            }

            console.error('[API] Error updating attendance:', error);
            return NextResponse.json(
                { error: 'שגיאה בעדכון נוכחות' },
                { status: 500 }
            );
        }

        return NextResponse.json(
            { attendance, message: 'נוכחות עודכנה בהצלחה' },
            { status: 200 }
        );

    } catch (error: any) {
        console.error('[API] Error in /api/team-events/[id]/attendance/[userId] PATCH:', error);
        return NextResponse.json(
            { error: error.message || 'שגיאה בעדכון נוכחות' },
            { status: error.message?.includes('Unauthorized') ? 401 : 500 }
        );
    }
}

export const PATCH = shabbatGuard(PATCHHandler);
