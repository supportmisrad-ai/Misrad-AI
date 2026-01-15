/**
 * Team Event by ID API
 * 
 * Handles update and delete operations for specific team events
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '../../../../lib/auth';
import { supabase } from '../../../../lib/supabase';
import { getUsers } from '../../../../lib/db';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
async function PATCHHandler(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getAuthenticatedUser();
        
        if (!supabase) {
            return NextResponse.json(
                { error: 'Database not configured' },
                { status: 500 }
            );
        }

        const { id } = await params;

        if (!id) {
            return NextResponse.json(
                { error: 'Event ID is required' },
                { status: 400 }
            );
        }

        // Get existing event
        const { data: existingEvent, error: getError } = await supabase
            .from('nexus_team_events')
            .select('*')
            .eq('id', id)
            .single();

        if (getError || !existingEvent) {
            return NextResponse.json(
                { error: 'אירוע לא נמצא' },
                { status: 404 }
            );
        }

        // Get user from database
        if (!user.email) {
            return NextResponse.json(
                { error: 'User email not found' },
                { status: 400 }
            );
        }
        const dbUsers = await getUsers({ email: user.email });
        const dbUser = dbUsers.length > 0 ? dbUsers[0] : null;

        if (!dbUser) {
            return NextResponse.json(
                { error: 'User not found in database' },
                { status: 404 }
            );
        }

        // Check permissions: organizer or admin
        const isOrganizer = existingEvent.organizer_id === dbUser.id;
        const isAdmin = dbUser.isSuperAdmin || dbUser.role === 'מנכ״ל' || dbUser.role === 'מנכ"ל' || dbUser.role === 'אדמין';

        if (!isOrganizer && !isAdmin) {
            return NextResponse.json(
                { error: 'אין הרשאה לעדכן אירוע זה' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const updateData: any = {};

        // Allowed fields to update
        if (body.title !== undefined) updateData.title = body.title;
        if (body.description !== undefined) updateData.description = body.description;
        if (body.eventType !== undefined) updateData.event_type = body.eventType;
        if (body.startDate !== undefined) updateData.start_date = body.startDate;
        if (body.endDate !== undefined) updateData.end_date = body.endDate;
        if (body.allDay !== undefined) updateData.all_day = body.allDay;
        if (body.location !== undefined) updateData.location = body.location;
        if (body.requiredAttendees !== undefined) updateData.required_attendees = body.requiredAttendees;
        if (body.optionalAttendees !== undefined) updateData.optional_attendees = body.optionalAttendees;
        if (body.status !== undefined) updateData.status = body.status;
        if (body.metadata !== undefined) updateData.metadata = body.metadata;

        // Approval handling (only admins/managers)
        if (isAdmin) {
            if (body.approved !== undefined) {
                if (body.approved) {
                    updateData.approved_by = dbUser.id;
                    updateData.approved_at = new Date().toISOString();
                    if (existingEvent.status === 'draft') {
                        updateData.status = 'scheduled';
                    }
                } else {
                    updateData.approved_by = null;
                    updateData.approved_at = null;
                }
            }
        }

        const { data: updatedEvent, error } = await supabase
            .from('nexus_team_events')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('[API] Error updating team event:', error);
            return NextResponse.json(
                { error: 'שגיאה בעדכון אירוע' },
                { status: 500 }
            );
        }

        return NextResponse.json(
            { event: updatedEvent, message: 'אירוע עודכן בהצלחה' },
            { status: 200 }
        );

    } catch (error: any) {
        console.error('[API] Error in /api/team-events/[id] PATCH:', error);
        return NextResponse.json(
            { error: error.message || 'שגיאה בעדכון אירוע' },
            { status: error.message?.includes('Unauthorized') ? 401 : 500 }
        );
    }
}

async function DELETEHandler(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getAuthenticatedUser();
        
        if (!supabase) {
            return NextResponse.json(
                { error: 'Database not configured' },
                { status: 500 }
            );
        }

        const { id } = await params;

        if (!id) {
            return NextResponse.json(
                { error: 'Event ID is required' },
                { status: 400 }
            );
        }

        // Get existing event
        const { data: existingEvent, error: getError } = await supabase
            .from('nexus_team_events')
            .select('*')
            .eq('id', id)
            .single();

        if (getError || !existingEvent) {
            return NextResponse.json(
                { error: 'אירוע לא נמצא' },
                { status: 404 }
            );
        }

        // Get user from database
        if (!user.email) {
            return NextResponse.json(
                { error: 'User email not found' },
                { status: 400 }
            );
        }
        const dbUsers = await getUsers({ email: user.email });
        const dbUser = dbUsers.length > 0 ? dbUsers[0] : null;

        if (!dbUser) {
            return NextResponse.json(
                { error: 'User not found in database' },
                { status: 404 }
            );
        }

        // Check permissions: organizer or admin
        const isOrganizer = existingEvent.organizer_id === dbUser.id;
        const isAdmin = dbUser.isSuperAdmin || dbUser.role === 'מנכ״ל' || dbUser.role === 'מנכ"ל' || dbUser.role === 'אדמין';

        if (!isOrganizer && !isAdmin) {
            return NextResponse.json(
                { error: 'אין הרשאה למחוק אירוע זה' },
                { status: 403 }
            );
        }

        // Delete event (cascade will delete attendance records)
        const { error } = await supabase
            .from('nexus_team_events')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('[API] Error deleting team event:', error);
            return NextResponse.json(
                { error: 'שגיאה במחיקת אירוע' },
                { status: 500 }
            );
        }

        return NextResponse.json(
            { message: 'אירוע נמחק בהצלחה' },
            { status: 200 }
        );

    } catch (error: any) {
        console.error('[API] Error in /api/team-events/[id] DELETE:', error);
        return NextResponse.json(
            { error: error.message || 'שגיאה במחיקת אירוע' },
            { status: error.message?.includes('Unauthorized') ? 401 : 500 }
        );
    }
}

export const PATCH = shabbatGuard(PATCHHandler);

export const DELETE = shabbatGuard(DELETEHandler);
