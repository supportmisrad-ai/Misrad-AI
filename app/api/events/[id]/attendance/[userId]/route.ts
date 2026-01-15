/**
 * Update Attendance Status API
 * 
 * For organizers to mark attendance (attended/absent) after event
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '../../../../../../lib/auth';
import { supabase } from '../../../../../../lib/supabase';
import { getUsers } from '../../../../../../lib/db';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
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

        const dbUsers = await getUsers({ email: user.email });
        const dbUser = dbUsers.length > 0 ? dbUsers[0] : null;

        if (!dbUser) {
            return NextResponse.json(
                { error: 'User not found in database' },
                { status: 404 }
            );
        }

        // Get event to check if user is organizer
        const { data: event, error: eventError } = await supabase
            .from('nexus_team_events')
            .select('*')
            .eq('id', eventId)
            .single();

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

        const { data: attendance, error } = await supabase
            .from('nexus_event_attendance')
            .update(updateData)
            .eq('event_id', eventId)
            .eq('user_id', userId)
            .select()
            .single();

        if (error) {
            // If record doesn't exist, create it
            if (error.code === 'PGRST116') {
                const { data: newAttendance, error: createError } = await supabase
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
        console.error('[API] Error in /api/events/[id]/attendance/[userId] PATCH:', error);
        return NextResponse.json(
            { error: error.message || 'שגיאה בעדכון נוכחות' },
            { status: error.message?.includes('Unauthorized') ? 401 : 500 }
        );
    }
}

export const PATCH = shabbatGuard(PATCHHandler);
