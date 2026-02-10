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
import { getAuthenticatedUser } from '@/lib/auth';
import { syncTaskToCalendar, syncCalendarToTasks } from '@/lib/integrations/google-calendar';
import prisma from '@/lib/prisma';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { APIError, getWorkspaceOrThrow } from '@/lib/server/api-workspace';
import { asObject, getErrorMessage } from '@/lib/server/workspace-access/utils';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

const IS_PROD = process.env.NODE_ENV === 'production';

async function selectDbUserId(params: { workspaceId: string; email: string | null | undefined }): Promise<string | null> {
    const email = String(params.email || '').trim().toLowerCase();
    if (!email) return null;

    const row = await prisma.nexusUser.findFirst({
        where: {
            email,
            organizationId: String(params.workspaceId),
        },
        select: { id: true },
    });

    return row?.id ? String(row.id) : null;
}
async function POSTHandler(request: NextRequest) {
    try {
        const { workspace } = await getWorkspaceOrThrow(request);

        const clerkUser = await getAuthenticatedUser();

        const dbUserId = await selectDbUserId({ workspaceId: workspace.id, email: clerkUser.email });
        
        if (!dbUserId) {
            return apiError('User not found in database. Please sync your account first.', { status: 404 });
        }
        
        const bodyJson: unknown = await request.json().catch(() => ({}));
        const bodyObj = asObject(bodyJson) ?? {};
        const direction = typeof bodyObj.direction === 'string' ? bodyObj.direction : '';
        const taskId = bodyObj.taskId == null ? null : String(bodyObj.taskId);

        if (!direction || !['to_google', 'from_google', 'bidirectional'].includes(direction)) {
            return apiError('Invalid direction. Must be "to_google", "from_google", or "bidirectional"', { status: 400 });
        }

        if (direction === 'to_google' || direction === 'bidirectional') {
            if (taskId) {
                // Sync specific task (scoped by org when provided)
                const row = await prisma.nexusTask.findFirst({
                    where: {
                        id: String(taskId),
                        organizationId: String(workspace.id),
                    },
                });

                if (row) {
                    const eventId = await syncTaskToCalendar(row, dbUserId, workspace.id);
                    return apiSuccess({
                        eventId,
                        message: 'Task synced to Google Calendar'
                    });
                } else {
                    return apiError('Task not found', { status: 404 });
                }
            } else {
                // Sync all tasks (limited to recent ones)
                const recentTasks = await prisma.nexusTask.findMany({
                    where: {
                        organizationId: String(workspace.id),
                        dueDate: { not: null },
                    },
                    orderBy: { dueDate: 'asc' },
                    take: 50,
                });
                
                const results = await Promise.all(
                    recentTasks.map((task) => syncTaskToCalendar(task, dbUserId, workspace.id))
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

    } catch (error: unknown) {
        if (IS_PROD) console.error('[API] Error syncing calendar');
        else console.error('[API] Error syncing calendar:', error);
        if (error instanceof APIError) {
            const safeMsg =
                error.status === 400
                    ? 'Bad request'
                    : error.status === 401
                        ? 'Unauthorized'
                        : error.status === 404
                            ? 'Not found'
                            : 'Forbidden';
            return apiError(error, { status: error.status, message: IS_PROD ? safeMsg : error.message || safeMsg });
        }
        const safeMsg = 'Failed to sync calendar';
        const msg = getErrorMessage(error) || safeMsg;
        return apiError(IS_PROD ? safeMsg : error, { status: 500, message: IS_PROD ? safeMsg : msg });
    }
}


export const POST = shabbatGuard(POSTHandler);
