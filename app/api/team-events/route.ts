/**
 * Team Events API
 * 
 * Handles CRUD operations for team events (training, fun days, group meetings, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '../../../lib/auth';
import { supabase } from '../../../lib/supabase';
import { getUsers, createRecord } from '../../../lib/db';
import { TeamEvent } from '../../../types';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
async function GETHandler(request: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        
        if (!supabase) {
            return NextResponse.json(
                { error: 'Database not configured' },
                { status: 500 }
            );
        }

        // Get user from database by email
        if (!user.email) {
            return NextResponse.json(
                { error: 'User email not found' },
                { status: 400 }
            );
        }

        const dbUsers = await getUsers({ email: user.email });
        const dbUser = dbUsers.length > 0 ? dbUsers[0] : null;

        if (!dbUser || !dbUser.tenantId) {
            // Return empty array instead of error - user might not be synced yet
            return NextResponse.json({ events: [] }, { status: 200 });
        }

        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get('start_date');
        const endDate = searchParams.get('end_date');
        const eventType = searchParams.get('event_type');
        const status = searchParams.get('status');

        // Build query
        let query = supabase
            .from('nexus_team_events')
            .select('*')
            .eq('tenant_id', dbUser.tenantId)
            .order('start_date', { ascending: true });

        if (startDate) {
            query = query.gte('start_date', startDate);
        }
        if (endDate) {
            query = query.lte('end_date', endDate);
        }
        if (eventType) {
            query = query.eq('event_type', eventType);
        }
        if (status) {
            query = query.eq('status', status);
        }

        const { data: events, error } = await query;

        if (error) {
            console.error('[API] Error fetching team events:', error);
            return NextResponse.json(
                { error: 'שגיאה בטעינת אירועים' },
                { status: 500 }
            );
        }

        return NextResponse.json({ events: events || [] }, { status: 200 });

    } catch (error: any) {
        console.error('[API] Error in /api/team-events GET:', error);
        return NextResponse.json(
            { error: error.message || 'שגיאה בטעינת אירועים' },
            { status: error.message?.includes('Unauthorized') ? 401 : 500 }
        );
    }
}

async function POSTHandler(request: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        
        if (!supabase) {
            return NextResponse.json(
                { error: 'Database not configured' },
                { status: 500 }
            );
        }

        // Get user from database by email
        if (!user.email) {
            return NextResponse.json(
                { error: 'User email not found' },
                { status: 400 }
            );
        }

        let dbUsers = await getUsers({ email: user.email });
        let dbUser = dbUsers.length > 0 ? dbUsers[0] : null;

        // Auto-sync: If user not found, try to create them automatically
        if (!dbUser) {
            try {
                // Try to auto-sync the user (same logic as /api/users/sync)
                const { createRecord } = await import('../../../lib/db');
                const role = user.role || 'עובד';
                const isSuperAdmin = user.isSuperAdmin || false;
                
                const newUserData: any = {
                    name: user.firstName && user.lastName
                        ? `${user.firstName} ${user.lastName}`.trim()
                        : user.firstName || user.lastName || 'User',
                    role: role,
                    department: undefined,
                    avatar: user.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.email)}&background=6366f1&color=fff`,
                    online: true,
                    capacity: 0,
                    email: user.email,
                    phone: undefined,
                    location: undefined,
                    bio: undefined,
                    paymentType: undefined,
                    hourlyRate: undefined,
                    monthlySalary: undefined,
                    commissionPct: undefined,
                    bonusPerTask: undefined,
                    accumulatedBonus: 0,
                    streakDays: 0,
                    weeklyScore: undefined,
                    pendingReward: undefined,
                    targets: undefined,
                    notificationPreferences: {
                        emailNewTask: true,
                        browserPush: true,
                        morningBrief: true,
                        soundEffects: false,
                        marketing: true
                    },
                    twoFactorEnabled: false,
                    isSuperAdmin: isSuperAdmin,
                    billingInfo: undefined
                };

                const newUser = await createRecord('users', newUserData) as any;
                dbUser = newUser;
                console.log('[API] Auto-synced user to database', {
                    userId: user.id,
                    tenantId: workspace.id,
                });
                
                // Re-fetch to ensure we have the latest user data (including tenantId if set)
                dbUsers = await getUsers({ email: user.email });
                dbUser = dbUsers.length > 0 ? dbUsers[0] : null;
                
                if (!dbUser) {
                    throw new Error('User created but not found after creation');
                }
            } catch (syncError: any) {
                console.error('[API] Auto-sync failed:', syncError);
            return NextResponse.json(
                    { error: 'User not found in database. Please sync your account first by calling POST /api/users/sync' },
                { status: 404 }
            );
            }
        }

        const body = await request.json();
        const {
            title,
            description,
            eventType,
            startDate,
            endDate,
            allDay = false,
            location,
            requiredAttendees = [],
            optionalAttendees = [],
            status = 'scheduled',
            requiresApproval = false,
            reminderDaysBefore = 1,
            metadata = {}
        } = body;

        // Validation
        if (!title || !eventType || !startDate || !endDate) {
            return NextResponse.json(
                { error: 'כותרת, סוג אירוע, תאריך התחלה ותאריך סיום נדרשים' },
                { status: 400 }
            );
        }

        // Create event
        const { data: event, error } = await supabase
            .from('nexus_team_events')
            .insert({
                tenant_id: dbUser.tenantId,
                title,
                description,
                event_type: eventType,
                start_date: startDate,
                end_date: endDate,
                all_day: allDay,
                location,
                organizer_id: dbUser.id,
                required_attendees: requiredAttendees,
                optional_attendees: optionalAttendees,
                status,
                requires_approval: requiresApproval,
                reminder_days_before: reminderDaysBefore,
                metadata,
                created_by: dbUser.id
            })
            .select()
            .single();

        if (error) {
            console.error('[API] Error creating team event:', error);
            return NextResponse.json(
                { error: 'שגיאה ביצירת אירוע' },
                { status: 500 }
            );
        }

        // Create attendance records for required and optional attendees
        if (event && (requiredAttendees.length > 0 || optionalAttendees.length > 0)) {
            const allAttendees = [...requiredAttendees, ...optionalAttendees];
            const attendanceRecords = allAttendees.map(attendeeId => ({
                event_id: event.id,
                user_id: attendeeId,
                status: 'invited' as const
            }));

            const { error: attendanceError } = await supabase
                .from('nexus_event_attendance')
                .insert(attendanceRecords);

            if (attendanceError) {
                console.error('[API] Error creating attendance records:', attendanceError);
                // Don't fail the request, just log the error
            }
        }

        // Send notifications to required attendees
        if (event && requiredAttendees.length > 0 && supabase) {
            try {
                const allUsers = await getUsers();
                const organizer = allUsers.find(u => u.id === dbUser.id);
                const organizerName = organizer?.name || 'מערכת';
                
                const notifications = requiredAttendees.filter((attendeeId: string) => attendeeId !== user.id).map((attendeeId: string) => ({
                    recipient_id: attendeeId,
                    type: 'team_event',
                    text: `הוזמנת לאירוע: ${title}`,
                    actor_id: dbUser.id,
                    actor_name: organizerName,
                    related_id: event.id,
                    is_read: false,
                    metadata: {
                        eventId: event.id,
                        eventTitle: title,
                        eventType: eventType,
                        startDate: startDate,
                        endDate: endDate,
                        location: location
                    },
                    created_at: new Date().toISOString()
                }));
                
                const { error: notifError } = await supabase
                    .from('misrad_notifications')
                    .insert(notifications);
                
                if (notifError) {
                    console.warn('[API] Could not create event notifications:', notifError);
                }
            } catch (notifError) {
                console.warn('[API] Error sending event notifications:', notifError);
                // Don't fail the request if notification fails
            }
        }

        return NextResponse.json(
            { event, message: 'אירוע נוצר בהצלחה' },
            { status: 201 }
        );

    } catch (error: any) {
        console.error('[API] Error in /api/team-events POST:', error);
        return NextResponse.json(
            { error: error.message || 'שגיאה ביצירת אירוע' },
            { status: error.message?.includes('Unauthorized') ? 401 : 500 }
        );
    }
}

export const GET = shabbatGuard(GETHandler);

export const POST = shabbatGuard(POSTHandler);
