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

import { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '../../../../../lib/auth';
import { syncTaskToCalendar, syncCalendarToTasks } from '../../../../../lib/integrations/google-calendar';
import { createClient } from '@/lib/supabase';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { APIError, getWorkspaceOrThrow } from '@/lib/server/api-workspace';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

async function selectDbUserId(params: { supabase: any; workspaceId: string; email: string | null | undefined }): Promise<string | null> {
    const email = String(params.email || '').trim().toLowerCase();
    if (!email) return null;

    const byOrg = await params.supabase
        .from('nexus_users')
        .select('id')
        .eq('email', email)
        .eq('organization_id', params.workspaceId)
        .limit(1)
        .maybeSingle();

    if ((byOrg as any)?.error?.code === '42703') {
        throw new Error('[SchemaMismatch] nexus_users is missing organization_id');
    }

    return byOrg.data?.id ? String(byOrg.data.id) : null;
}
async function POSTHandler(request: NextRequest) {
    try {
        const { workspace } = await getWorkspaceOrThrow(request);

        const clerkUser = await getAuthenticatedUser();

        const supabase = createClient();
        const dbUserId = await selectDbUserId({ supabase, workspaceId: workspace.id, email: clerkUser.email });
        
        if (!dbUserId) {
            return apiError('User not found in database. Please sync your account first.', { status: 404 });
        }
        
        const body = await request.json();
        const { direction, taskId } = body;

        if (!direction || !['to_google', 'from_google', 'bidirectional'].includes(direction)) {
            return apiError('Invalid direction. Must be "to_google", "from_google", or "bidirectional"', { status: 400 });
        }

        if (direction === 'to_google' || direction === 'bidirectional') {
            if (taskId) {
                // Sync specific task (scoped by org when provided)
                const supabase = createClient();
                const query = supabase
                          .from('nexus_tasks')
                          .select('*')
                          .eq('id', String(taskId))
                          .eq('organization_id', workspace.id)
                          .limit(1)
                          .maybeSingle();

                const { data: row, error } = await query;
                if (!error && row) {
                    const eventId = await syncTaskToCalendar(row as any, dbUserId, workspace.id);
                    return apiSuccess({
                        eventId,
                        message: 'Task synced to Google Calendar'
                    });
                } else {
                    return apiError('Task not found', { status: 404 });
                }
            } else {
                // Sync all tasks (limited to recent ones)
                const supabase = createClient();
                const query = supabase
                          .from('nexus_tasks')
                          .select('*')
                          .not('due_date', 'is', null)
                          .eq('organization_id', workspace.id)
                          .order('due_date', { ascending: true })
                          .limit(50);

                const { data } = await query;
                const recentTasks = (data || []) as any[];
                
                const results = await Promise.all(
                    recentTasks.map(task => syncTaskToCalendar(task, dbUserId, workspace.id))
                );

                return apiSuccess({
                    synced: results.filter(r => r !== null).length,
                    total: recentTasks.length,
                    message: 'Tasks synced to Google Calendar'
                });
            }
        }

        if (direction === 'from_google' || direction === 'bidirectional') {
            const syncedIds = await syncCalendarToTasks(dbUserId, workspace.id);
            return apiSuccess({
                synced: syncedIds.length,
                message: 'Calendar events synced to tasks'
            });
        }

        return apiError('Invalid direction', { status: 400 });

    } catch (error: any) {
        console.error('[API] Error syncing calendar:', error);
        if (error instanceof APIError) {
            return apiError(error.message || 'Forbidden', { status: error.status });
        }
        return apiError(error, { status: 500, message: 'Failed to sync calendar' });
    }
}


export const POST = shabbatGuard(POSTHandler);
