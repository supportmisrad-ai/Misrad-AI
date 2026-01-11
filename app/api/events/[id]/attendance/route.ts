/**
 * Event Attendance API
 * 
 * Handles RSVP and attendance tracking for team events
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '../../../../../lib/auth';
import { supabase } from '../../../../../lib/supabase';
import { getUsers } from '../../../../../lib/db';

export async function GET(
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

        const dbUsers = await getUsers({ email: user.email });
        const dbUser = dbUsers.length > 0 ? dbUsers[0] : null;

        if (!dbUser) {
            return NextResponse.json(
                { error: 'User not found in database' },
                { status: 404 }
            );
        }

        // Get event to check permissions
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

        // Check if user can view attendance (organizer, admin, or invited user)
        const isOrganizer = event.organizer_id === dbUser.id;
        const isAdmin = dbUser.isSuperAdmin || dbUser.role === 'מנכ״ל' || dbUser.role === 'מנכ"ל' || dbUser.role === 'אדמין';
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
        const { data: attendance, error } = await supabase
            .from('nexus_event_attendance')
            .select('*')
            .eq('event_id', eventId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('[API] Error fetching attendance:', error);
            return NextResponse.json(
                { error: 'שגיאה בטעינת נוכחות' },
                { status: 500 }
            );
        }

        return NextResponse.json({ attendance: attendance || [] }, { status: 200 });

    } catch (error: any) {
        console.error('[API] Error in /api/events/[id]/attendance GET:', error);
        return NextResponse.json(
            { error: error.message || 'שגיאה בטעינת נוכחות' },
            { status: error.message?.includes('Unauthorized') ? 401 : 500 }
        );
    }
}

export async function POST(
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

        const dbUsers = await getUsers({ email: user.email });
        const dbUser = dbUsers.length > 0 ? dbUsers[0] : null;

        if (!dbUser) {
            return NextResponse.json(
                { error: 'User not found in database' },
                { status: 404 }
            );
        }

        // Get event
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

        // Upsert attendance record
        const { data: attendance, error } = await supabase
            .from('nexus_event_attendance')
            .upsert({
                event_id: eventId,
                user_id: dbUser.id,
                status,
                rsvp_at: new Date().toISOString(),
                notes: notes || null
            }, {
                onConflict: 'event_id,user_id',
                ignoreDuplicates: false
            })
            .select()
            .single();

        if (error) {
            console.error('[API] Error creating/updating attendance:', error);
            return NextResponse.json(
                { error: 'שגיאה בשמירת אישור הגעה' },
                { status: 500 }
            );
        }

        return NextResponse.json(
            { attendance, message: 'אישור הגעה נשמר בהצלחה' },
            { status: 200 }
        );

    } catch (error: any) {
        console.error('[API] Error in /api/events/[id]/attendance POST:', error);
        return NextResponse.json(
            { error: error.message || 'שגיאה בשמירת אישור הגעה' },
            { status: error.message?.includes('Unauthorized') ? 401 : 500 }
        );
    }
}
