/**
 * Event Attendance API
 * 
 * Handles RSVP and attendance tracking for team events
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { isTenantAdminRole } from '@/lib/constants/roles';
import { APIError, getWorkspaceOrThrow } from '@/lib/server/api-workspace';
import { asObject, getErrorMessage } from '@/lib/server/workspace-access/utils';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

const IS_PROD = process.env.NODE_ENV === 'production';

function toIso(input: unknown): string | null {
    if (!input) return null;
    if (input instanceof Date) return input.toISOString();
    if (typeof input === 'string') return input;
    return null;
}

function normalizeAttendanceRow(row: unknown) {
    const obj = asObject(row) ?? {};
    return {
        id: obj.id,
        organization_id: obj.organizationId ?? obj.organization_id,
        event_id: obj.event_id,
        user_id: obj.user_id,
        status: obj.status,
        rsvp_at: toIso(obj.rsvp_at),
        attended_at: toIso(obj.attended_at),
        notes: obj.notes ?? null,
        created_at: toIso(obj.created_at),
        updated_at: toIso(obj.updated_at),
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
        ? { id: String(byOrg.id), role: String(byOrg.role || ''), isSuperAdmin: Boolean(byOrg.isSuperAdmin) }
        : null;
}

async function loadTeamEventInWorkspace(params: { eventId: string; workspaceId: string }) {
    return prisma.nexusTeamEvent.findFirst({
        where: { id: String(params.eventId), organizationId: String(params.workspaceId) },
    });
}

async function GETHandler(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await getAuthenticatedUser();

        const { workspace } = await getWorkspaceOrThrow(request);

        const { id: eventId } = params;

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
        const attendanceRows = await prisma.nexusEventAttendance.findMany({
            where: { event_id: String(eventId), organizationId: String(workspace.id) },
            orderBy: { created_at: 'asc' },
        });

        return NextResponse.json({ attendance: (attendanceRows || []).map(normalizeAttendanceRow) }, { status: 200 });

    } catch (error: unknown) {
        if (IS_PROD) console.error('[API] Error in /api/events/[id]/attendance GET');
        else console.error('[API] Error in /api/events/[id]/attendance GET:', error);
        if (error instanceof APIError) {
            const safeMsg =
                error.status === 400
                    ? 'Bad request'
                    : error.status === 401
                        ? 'Unauthorized'
                        : error.status === 404
                            ? 'Not found'
                            : error.status === 500
                                ? 'Internal server error'
                                : 'Forbidden';
            return NextResponse.json(
                { error: IS_PROD ? safeMsg : error.message || safeMsg },
                { status: error.status }
            );
        }
        const message = getErrorMessage(error);
        const safeMsg = 'שגיאה בטעינת נוכחות';
        return NextResponse.json(
            { error: IS_PROD ? safeMsg : message || safeMsg },
            { status: message.includes('Unauthorized') ? 401 : 500 }
        );
    }
}

async function POSTHandler(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await getAuthenticatedUser();

        const { workspace } = await getWorkspaceOrThrow(request);

        const { id: eventId } = params;

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

        const bodyJson: unknown = await request.json().catch(() => ({}));
        const bodyObj = asObject(bodyJson) ?? {};
        const status = typeof bodyObj.status === 'string' ? bodyObj.status : '';
        const notes = typeof bodyObj.notes === 'string' ? bodyObj.notes : null;

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

        const existing = await prisma.nexusEventAttendance.findFirst({
            where: { event_id: String(eventId), user_id: String(dbUser.id), organizationId: String(workspace.id) },
            select: { id: true },
        });

        if (existing?.id) {
            await prisma.nexusEventAttendance.updateMany({
                where: { id: String(existing.id), organizationId: String(workspace.id) },
                data: {
                    status,
                    rsvp_at: now,
                    notes: notes || null,
                    updated_at: now,
                },
            });
        } else {
            await prisma.nexusEventAttendance.create({
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
        }

        const attendance = await prisma.nexusEventAttendance.findFirst({
            where: { event_id: String(eventId), user_id: String(dbUser.id), organizationId: String(workspace.id) },
        });

        return NextResponse.json(
            { attendance: normalizeAttendanceRow(attendance), message: 'אישור הגעה נשמר בהצלחה' },
            { status: 200 }
        );

    } catch (error: unknown) {
        if (IS_PROD) console.error('[API] Error in /api/events/[id]/attendance POST');
        else console.error('[API] Error in /api/events/[id]/attendance POST:', error);
        if (error instanceof APIError) {
            const safeMsg =
                error.status === 400
                    ? 'Bad request'
                    : error.status === 401
                        ? 'Unauthorized'
                        : error.status === 404
                            ? 'Not found'
                            : error.status === 500
                                ? 'Internal server error'
                                : 'Forbidden';
            return NextResponse.json(
                { error: IS_PROD ? safeMsg : error.message || safeMsg },
                { status: error.status }
            );
        }
        const message = getErrorMessage(error);
        const safeMsg = 'שגיאה בשמירת אישור הגעה';
        return NextResponse.json(
            { error: IS_PROD ? safeMsg : message || safeMsg },
            { status: message.includes('Unauthorized') ? 401 : 500 }
        );
    }
}

export const GET = shabbatGuard(GETHandler);

export const POST = shabbatGuard(POSTHandler);
