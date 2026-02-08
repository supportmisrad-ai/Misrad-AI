/**
 * Update Attendance Status API
 * 
 * For organizers to mark attendance (attended/absent) after event
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '../../../../../../lib/auth';
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
        ? { id: String(byOrg.id), role: String(byOrg.role || 'עובד'), isSuperAdmin: Boolean(byOrg.isSuperAdmin) }
        : null;
}

async function loadTeamEventInWorkspace(params: { eventId: string; workspaceId: string }) {
    return prisma.nexus_team_events.findFirst({
        where: { id: String(params.eventId), organizationId: String(params.workspaceId) },
    });
}

async function PATCHHandler(
    request: NextRequest,
    { params }: { params: { id: string; userId: string } }
) {
    try {
        const user = await getAuthenticatedUser();

        const { workspace } = await getWorkspaceOrThrow(request);

        const { id: eventId, userId } = params;

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

        const dbUser = await loadUserInWorkspaceByEmail({ workspaceId: workspace.id, email: user.email });

        if (!dbUser) {
            return NextResponse.json(
                { error: 'User not found in database' },
                { status: 404 }
            );
        }

        // Get event to check if user is organizer
        const event = await loadTeamEventInWorkspace({ eventId, workspaceId: workspace.id });

        if (!event) {
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

        const bodyJson: unknown = await request.json().catch(() => ({}));
        const bodyObj = asObject(bodyJson) ?? {};
        const statusRaw = typeof bodyObj.status === 'string' ? bodyObj.status : '';
        const notesRaw = bodyObj.notes;
        const hasNotes = Object.prototype.hasOwnProperty.call(bodyObj, 'notes');

        if (!statusRaw || !['attended', 'absent'].includes(statusRaw)) {
            return NextResponse.json(
                { error: 'סטטוס לא תקין. צריך להיות attended או absent' },
                { status: 400 }
            );
        }

        const status = statusRaw === 'attended' ? 'attended' : 'absent';

        const now = new Date();

        // Update attendance record
        const updateData: { status: 'attended' | 'absent'; attended_at: Date | null; notes?: string | null } = {
            status,
            attended_at: status === 'attended' ? now : null
        };

        if (hasNotes) {
            updateData.notes = notesRaw == null ? null : typeof notesRaw === 'string' ? notesRaw : String(notesRaw);
        }

        const existing = await prisma.nexus_event_attendance.findFirst({
            where: { event_id: String(eventId), user_id: String(userId), organizationId: String(workspace.id) },
            select: { id: true },
        });

        const attendance = existing?.id
            ? await prisma.nexus_event_attendance.update({
                  where: { id: String(existing.id) },
                  data: {
                      ...updateData,
                      updated_at: now,
                  },
              })
            : await prisma.nexus_event_attendance.create({
                  data: {
                      organizationId: String(workspace.id),
                      event_id: String(eventId),
                      user_id: String(userId),
                      ...updateData,
                      updated_at: now,
                  },
              });

        return NextResponse.json(
            { attendance: normalizeAttendanceRow(attendance), message: 'נוכחות עודכנה בהצלחה' },
            { status: 200 }
        );

    } catch (error: unknown) {
        if (IS_PROD) console.error('[API] Error in /api/events/[id]/attendance/[userId] PATCH');
        else console.error('[API] Error in /api/events/[id]/attendance/[userId] PATCH:', error);
        if (error instanceof APIError) {
            const safeMsg =
                error.status === 400
                    ? 'Bad request'
                    : error.status === 401
                        ? 'Unauthorized'
                        : error.status === 404
                            ? 'Not found'
                            : 'Forbidden';
            return NextResponse.json(
                { error: IS_PROD ? safeMsg : error.message || safeMsg },
                { status: error.status }
            );
        }
        const message = getErrorMessage(error);
        const safeMsg = 'שגיאה בעדכון נוכחות';
        return NextResponse.json(
            { error: IS_PROD ? safeMsg : message || safeMsg },
            { status: message.includes('Unauthorized') ? 401 : 500 }
        );
    }
}

export const PATCH = shabbatGuard(PATCHHandler);
