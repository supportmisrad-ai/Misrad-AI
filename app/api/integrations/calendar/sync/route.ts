/**
 * API Route: Sync Calendar
 * 
 * POST /api/integrations/calendar/sync
 * 
 * Syncs tasks to/from Google Calendar
 * 
 * Body:
 *   - direction: 'to_google' | 'from_google' | 'bidirectional'
 *   - taskId: Optional - specific task to sync
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '../../../../../lib/auth';
import { syncTaskToCalendar, syncCalendarToTasks } from '../../../../../lib/integrations/google-calendar';
import { getUsers } from '../../../../../lib/db';
import { requireWorkspaceAccessByOrgSlugApi } from '@/lib/server/workspace';
import { createClient } from '@/lib/supabase';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
async function POSTHandler(request: NextRequest) {
    try {
        const orgIdFromHeader = request.headers.get('x-org-id') || request.headers.get('x-orgid');
        if (!orgIdFromHeader) {
            return NextResponse.json({ error: 'Missing x-org-id header' }, { status: 400 });
        }
        const workspace = await requireWorkspaceAccessByOrgSlugApi(orgIdFromHeader);

        const clerkUser = await getAuthenticatedUser();
        
        // Convert Clerk ID to Supabase UUID
        const dbUsers = await getUsers({ email: clerkUser.email, tenantId: workspace.id });
        const dbUser = dbUsers.length > 0 ? dbUsers[0] : null;
        
        if (!dbUser) {
            return NextResponse.json(
                { error: 'User not found in database. Please sync your account first.' },
                { status: 404 }
            );
        }
        
        const body = await request.json();
        const { direction, taskId } = body;

        if (!direction || !['to_google', 'from_google', 'bidirectional'].includes(direction)) {
            return NextResponse.json(
                { error: 'Invalid direction. Must be "to_google", "from_google", or "bidirectional"' },
                { status: 400 }
            );
        }

        if (direction === 'to_google' || direction === 'bidirectional') {
            if (taskId) {
                // Sync specific task (scoped by org when provided)
                const supabase = createClient();
                const query = workspace?.id
                    ? supabase
                          .from('nexus_tasks')
                          .select('*')
                          .eq('id', String(taskId))
                          .eq('organization_id', workspace.id)
                          .limit(1)
                          .maybeSingle()
                    : supabase
                          .from('nexus_tasks')
                          .select('*')
                          .eq('id', String(taskId))
                          .limit(1)
                          .maybeSingle();

                const { data: row, error } = await query;
                if (!error && row) {
                    const eventId = await syncTaskToCalendar(row as any, dbUser.id);
                    return NextResponse.json({
                        success: true,
                        eventId,
                        message: 'Task synced to Google Calendar'
                    });
                } else {
                    return NextResponse.json(
                        { error: 'Task not found' },
                        { status: 404 }
                    );
                }
            } else {
                // Sync all tasks (limited to recent ones)
                const supabase = createClient();
                const query = workspace?.id
                    ? supabase
                          .from('nexus_tasks')
                          .select('*')
                          .not('due_date', 'is', null)
                          .eq('organization_id', workspace.id)
                          .order('due_date', { ascending: true })
                          .limit(50)
                    : supabase
                          .from('nexus_tasks')
                          .select('*')
                          .not('due_date', 'is', null)
                          .order('due_date', { ascending: true })
                          .limit(50);

                const { data } = await query;
                const recentTasks = (data || []) as any[];
                
                const results = await Promise.all(
                    recentTasks.map(task => syncTaskToCalendar(task, dbUser.id))
                );

                return NextResponse.json({
                    success: true,
                    synced: results.filter(r => r !== null).length,
                    total: recentTasks.length,
                    message: 'Tasks synced to Google Calendar'
                });
            }
        }

        if (direction === 'from_google' || direction === 'bidirectional') {
            const syncedIds = await syncCalendarToTasks(dbUser.id);
            return NextResponse.json({
                success: true,
                synced: syncedIds.length,
                message: 'Calendar events synced to tasks'
            });
        }

        return NextResponse.json(
            { error: 'Invalid direction' },
            { status: 400 }
        );

    } catch (error: any) {
        console.error('[API] Error syncing calendar:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to sync calendar' },
            { status: 500 }
        );
    }
}


export const POST = shabbatGuard(POSTHandler);
