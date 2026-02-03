/**
 * Event Attendance API
 * 
 * Handles RSVP and attendance tracking for team events
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '../../../../../lib/auth';
import prisma from '@/lib/prisma';
import { isTenantAdminRole } from '@/lib/constants/roles';
import { APIError, getWorkspaceOrThrow } from '@/lib/server/api-workspace';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

function toIso(input: any): string | null {
    if (!input) return null;
    if (input instanceof Date) return input.toISOString();
    if (typeof input === 'string') return input;
    return null;
}

function normalizeAttendanceRow(row: any) {
    return {
        id: row?.id,
        organization_id: row?.organizationId ?? row?.organization_id,
        event_id: row?.event_id,
        user_id: row?.user_id,
        status: row?.status,
        rsvp_at: toIso(row?.rsvp_at),
        attended_at: toIso(row?.attended_at),
        notes: row?.notes ?? null,
        created_at: toIso(row?.created_at),
        updated_at: toIso(row?.updated_at),
    };
}

async function loadUserInWorkspaceByEmail(params: { workspaceId: string; email: string }) {
    const email = String(params.email || '').trim().toLowerCase();
    if (!email) return null;

    const byOrg = await prisma.nexusUser.findFirst({
        where: { email, organizationId: String(params.workspaceId) },
        select: { id: true, role: true, isSuperAdmin: true },
    });

    return byOrg
        ? { id: String(byOrg.id), role: String(byOrg.role || ''), isSuperAdmin: Boolean((byOrg as any).isSuperAdmin) }
        : null;
}

async function loadTeamEventInWorkspace(params: { eventId: string; workspaceId: string }) {
    return prisma.nexus_team_events.findFirst({
        where: { id: String(params.eventId), organizationId: String(params.workspaceId) },
    });
}

async function GETHandler(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getAuthenticatedUser();

        const { workspace } = await getWorkspaceOrThrow(request);

        const { id: eventId } = await params;

        if (!eventId) {
            return NextResponse.json(
                { error: 'Event ID is required' },
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

        const dbUser = await loadUserInWorkspaceByEmail({ workspaceId: workspace.id, email: user.email });

        if (!dbUser) {
            return NextResponse.json(
                { error: 'User not found in database' },
                { status: 404 }
            );
        }

        // Get event to check permissions
        const event = await loadTeamEventInWorkspace({ eventId, workspaceId: workspace.id });

        if (!event) {
            return NextResponse.json(
                { error: 'אירוע לא נמצא' },
                { status: 404 }
            );
        }

        // Check if user can view attendance (organizer, admin, or invited user)
        const isOrganizer = event.organizer_id === dbUser.id;
        const isAdmin = dbUser.isSuperAdmin || isTenantAdminRole(dbUser.role);
        const isInvited = 
            (event.required_attendees && event.required_attendees.includes(dbUser.id)) ||
            (event.optional_attendees && event.optional_attendees.includes(dbUser.id));

        if (!isOrganizer && !isAdmin && !isInvited) {
            return NextResponse.json(
                { error: 'אין הרשאה לצפות בנוכחות' },
                { status: 403 }
            );
        }

        // Get all attendance records for this event
        const attendanceRows = await prisma.nexus_event_attendance.findMany({
            where: { event_id: String(eventId), organizationId: String(workspace.id) },
            orderBy: { created_at: 'asc' },
        });

        return NextResponse.json({ attendance: (attendanceRows || []).map(normalizeAttendanceRow) }, { status: 200 });

    } catch (error: any) {
        console.error('[API] Error in /api/events/[id]/attendance GET:', error);
        if (error instanceof APIError) {
            return NextResponse.json({ error: error.message || 'Forbidden' }, { status: error.status });
        }
        return NextResponse.json(
            { error: error.message || 'שגיאה בטעינת נוכחות' },
            { status: error.message?.includes('Unauthorized') ? 401 : 500 }
        );
    }
}

async function POSTHandler(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getAuthenticatedUser();

        const { workspace } = await getWorkspaceOrThrow(request);

        const { id: eventId } = await params;

        if (!eventId) {
            return NextResponse.json(
                { error: 'Event ID is required' },
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

        const dbUser = await loadUserInWorkspaceByEmail({ workspaceId: workspace.id, email: user.email });

        if (!dbUser) {
            return NextResponse.json(
                { error: 'User not found in database' },
                { status: 404 }
            );
        }

        // Get event
        const event = await loadTeamEventInWorkspace({ eventId, workspaceId: workspace.id });

        if (!event) {
            return NextResponse.json(
                { error: 'אירוע לא נמצא' },
                { status: 404 }
            );
        }

        const body = await request.json();
        const { status, notes } = body;

        if (!status || !['attending', 'not_attending'].includes(status)) {
            return NextResponse.json(
                { error: 'סטטוס לא תקין. צריך להיות attending או not_attending' },
                { status: 400 }
            );
        }

        // Check if user is invited
        const isInvited = 
            (event.required_attendees && event.required_attendees.includes(dbUser.id)) ||
            (event.optional_attendees && event.optional_attendees.includes(dbUser.id));

        if (!isInvited) {
            return NextResponse.json(
                { error: 'אתה לא מוזמן לאירוע זה' },
                { status: 403 }
            );
        }

        const now = new Date();

        const existing = await prisma.nexus_event_attendance.findFirst({
            where: { event_id: String(eventId), user_id: String(dbUser.id), organizationId: String(workspace.id) },
            select: { id: true },
        });

        const attendance = existing?.id
            ? await prisma.nexus_event_attendance.update({
                  where: { id: String(existing.id) },
                  data: {
                      status,
                      rsvp_at: now,
                      notes: notes || null,
                      updated_at: now,
                  },
              })
            : await prisma.nexus_event_attendance.create({
                  data: {
                      organizationId: String(workspace.id),
                      event_id: String(eventId),
                      user_id: String(dbUser.id),
                      status,
                      rsvp_at: now,
                      notes: notes || null,
                      updated_at: now,
                  },
              });

        return NextResponse.json(
            { attendance: normalizeAttendanceRow(attendance), message: 'אישור הגעה נשמר בהצלחה' },
            { status: 200 }
        );

    } catch (error: any) {
        console.error('[API] Error in /api/events/[id]/attendance POST:', error);
        if (error instanceof APIError) {
            return NextResponse.json({ error: error.message || 'Forbidden' }, { status: error.status });
        }
        return NextResponse.json(
            { error: error.message || 'שגיאה בשמירת אישור הגעה' },
            { status: error.message?.includes('Unauthorized') ? 401 : 500 }
        );
    }
}

export const GET = shabbatGuard(GETHandler);

export const POST = shabbatGuard(POSTHandler);
