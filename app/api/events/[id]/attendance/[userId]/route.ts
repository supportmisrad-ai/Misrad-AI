/**
 * Update Attendance Status API
 * 
 * For organizers to mark attendance (attended/absent) after event
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '../../../../../../lib/auth';
import { createClient } from '../../../../../../lib/supabase';
import { isTenantAdminRole } from '@/lib/constants/roles';
import { APIError, getWorkspaceOrThrow } from '@/lib/server/api-workspace';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

async function loadUserInWorkspaceByEmail(params: { supabase: any; workspaceId: string; email: string }) {
    const email = String(params.email || '').trim().toLowerCase();
    if (!email) return null;

    const byOrg = await params.supabase
        .from('nexus_users')
        .select('id, role, is_super_admin')
        .eq('email', email)
        .eq('organization_id', params.workspaceId)
        .limit(1)
        .maybeSingle();

    if ((byOrg as any)?.error?.code === '42703') {
        throw new Error('[SchemaMismatch] nexus_users is missing organization_id');
    }

    return byOrg.data
        ? { id: String(byOrg.data.id), role: String(byOrg.data.role || 'עובד'), isSuperAdmin: Boolean((byOrg.data as any).is_super_admin) }
        : null;
}

async function loadTeamEventInWorkspace(params: { supabaseClient: any; eventId: string; workspaceId: string }) {
    const res = await params.supabaseClient
        .from('nexus_team_events')
        .select('*')
        .eq('id', params.eventId)
        .eq('organization_id', params.workspaceId)
        .single();

    if ((res as any)?.error?.code === '42703') {
        throw new Error('[SchemaMismatch] nexus_team_events is missing organization_id');
    }

    return res;
}

async function PATCHHandler(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; userId: string }> }
) {
    try {
        const user = await getAuthenticatedUser();

        let supabaseClient: any;
        try {
            supabaseClient = createClient();
        } catch {
            return NextResponse.json(
                { error: 'Database not configured' },
                { status: 500 }
            );
        }

        const { workspace } = await getWorkspaceOrThrow(request);

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

        const dbUser = await loadUserInWorkspaceByEmail({ supabase: supabaseClient, workspaceId: workspace.id, email: user.email });

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
        const isAdmin = dbUser.isSuperAdmin || isTenantAdminRole(dbUser.role);

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
            .eq('organization_id', workspace.id)
            .select()
            .single();

        if (error) {
            // If record doesn't exist, create it
            if (error.code === 'PGRST116') {
                const { data: newAttendance, error: createError } = await supabaseClient
                    .from('nexus_event_attendance')
                    .insert({
                        organization_id: workspace.id,
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
        console.error('[API] Error in /api/events/[id]/attendance/[userId] PATCH:', error);
        if (error instanceof APIError) {
            return NextResponse.json({ error: error.message || 'Forbidden' }, { status: error.status });
        }
        return NextResponse.json(
            { error: error.message || 'שגיאה בעדכון נוכחות' },
            { status: error.message?.includes('Unauthorized') ? 401 : 500 }
        );
    }
}

export const PATCH = shabbatGuard(PATCHHandler);
