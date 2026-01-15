/**
 * Secure Tasks API
 * 
 * Server-side API with proper authorization
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getAuthenticatedUser, hasPermission, canAccessResource } from '../../../lib/auth';
import { logAuditEvent } from '../../../lib/audit';
import { getUsers } from '../../../lib/db';
import { createClient } from '@/lib/supabase';
import { Task } from '../../../types';
import { requireWorkspaceAccessByOrgSlugApi } from '@/lib/server/workspace';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
function toTaskDto(row: any): Task {
    return {
        id: row.id,
        title: row.title,
        description: row.description || '',
        status: row.status,
        priority: row.priority,
        assigneeIds: row.assignee_ids ?? row.assigneeIds ?? [],
        assigneeId:
            row.assignee_id === null || row.assigneeId === null
                ? null
                : (row.assignee_id ?? row.assigneeId ?? undefined),
        creatorId: row.creator_id ?? row.creatorId ?? undefined,
        tags: row.tags || [],
        createdAt: row.created_at ?? row.createdAt ?? new Date().toISOString(),
        dueDate: row.due_date ?? row.dueDate ?? undefined,
        dueTime: row.due_time ?? row.dueTime ?? undefined,
        timeSpent: row.time_spent ?? row.timeSpent ?? 0,
        estimatedTime: row.estimated_time ?? row.estimatedTime ?? undefined,
        approvalStatus: row.approval_status ?? row.approvalStatus ?? undefined,
        isTimerRunning: Boolean(row.is_timer_running ?? row.isTimerRunning),
        messages: (() => {
            const v = row.messages;
            if (Array.isArray(v)) return v;
            if (typeof v === 'string') {
                try {
                    return JSON.parse(v);
                } catch {
                    return [];
                }
            }
            return v ?? [];
        })(),
        clientId: row.client_id ?? row.clientId ?? undefined,
        isPrivate: row.is_private ?? row.isPrivate ?? undefined,
        audioUrl: row.audio_url ?? row.audioUrl ?? undefined,
        snoozeCount: row.snooze_count ?? row.snoozeCount ?? undefined,
        isFocus: row.is_focus ?? row.isFocus ?? undefined,
        completionDetails: row.completion_details ?? row.completionDetails ?? undefined,
        department: row.department ?? undefined,
    } as Task;
}

async function GETHandler(request: NextRequest) {
    try {
        const headerOrgId = request.headers.get('x-org-id');
        const queryOrgId = request.nextUrl.searchParams.get('orgId');
        const effectiveOrgId = headerOrgId || queryOrgId;
        if (!effectiveOrgId) {
            return NextResponse.json({ error: 'Missing orgId' }, { status: 400 });
        }
        const workspace = await requireWorkspaceAccessByOrgSlugApi(effectiveOrgId);

        // 1. Authenticate user
        const user = await getAuthenticatedUser();

        // Resolve database user UUID (tasks are stored using DB UUIDs, not Clerk IDs)
        const isUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        let dbUserId: string | null = null;
        if (typeof user?.email === 'string' && user.email.length > 0) {
            try {
                const dbUsers = await getUsers({ email: user.email });
                if (dbUsers.length > 0 && typeof dbUsers[0]?.id === 'string') {
                    dbUserId = dbUsers[0].id;
                }
            } catch (dbError) {
                console.warn('[API] Failed to resolve dbUserId for tasks scoping:', dbError);
            }
        }
        const effectiveUserId = dbUserId || (isUUID(user.id) ? user.id : null);

        // Get query parameters
        const searchParams = request.nextUrl.searchParams;
        const taskId = searchParams.get('id');
        const assigneeId = searchParams.get('assigneeId');
        const status = searchParams.get('status');

        // Fetch tasks from database FIRST (most important - don't wait for auth/permissions)
        let tasks: Task[] = [];
        try {
            const supabaseClient = createClient();

            let query = supabaseClient
                .from('nexus_tasks')
                .select('*')
                .eq('organization_id', workspace.id)
                .order('due_date', { ascending: true })
                .order('created_at', { ascending: false })
                .limit(500);

            if (taskId) {
                query = query.eq('id', taskId);
            }
            if (status) {
                query = query.eq('status', status);
            }
            if (assigneeId) {
                query = query.or(`assignee_id.eq.${assigneeId},assignee_ids.cs.{${assigneeId}}`);
            }

            const { data, error } = await query;
            if (error) {
                throw new Error(error.message);
            }
            tasks = (data || []).map(toTaskDto);
        } catch (dbError: any) {
            console.error('[API] Error fetching tasks from database:', dbError);
            tasks = [];
        }

        // Check permissions
        const canViewCrm = await hasPermission('view_crm');
        if (!canViewCrm) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Log access ASYNC (don't block response)
        logAuditEvent('data.read', 'task', {
            success: true
        }).catch(() => {
            // Silently fail - don't block response
        });

        // 6. Filter based on permissions
        if (taskId) {
            // Single task request
            const task = tasks.find(t => t.id === taskId);
            if (!task) {
                return NextResponse.json({ error: 'Task not found' }, { status: 404 });
            }

            // Check if user can access this task
            const canAccess = await canAccessResource('task', taskId, 'read');
            if (!canAccess) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }

            // Users can only see their own tasks unless they're managers
            const isAssignee = Boolean(
                effectiveUserId &&
                (task.assigneeIds?.includes(effectiveUserId) || task.creatorId === effectiveUserId)
            );
            const isManager = await hasPermission('manage_team');

            if (!isAssignee && !isManager) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }

            return NextResponse.json(task);
        }

        // 7. List tasks - filter by permissions
        const isManager = await hasPermission('manage_team');

        if (!isManager) {
            // Non-managers only see their own tasks
            if (effectiveUserId) {
                tasks = tasks.filter(t =>
                    t.assigneeIds?.includes(effectiveUserId) ||
                    t.creatorId === effectiveUserId
                );
            } else {
                tasks = [];
            }
        }

        // Note: assignee/status filtering already applied at DB level above.

        return NextResponse.json({ tasks });

    } catch (error: any) {
        console.error('[API] Error in GET /api/tasks:', error);
        console.error('[API] Error stack:', error.stack);
        console.error('[API] Error message:', error.message);

        try {
            await logAuditEvent('data.read', 'task', {
                success: false,
                error: error.message || 'Unknown error'
            });
        } catch (auditError) {
            console.error('[API] Failed to log audit event:', auditError);
        }

        if (error.message?.includes('Unauthorized') || error.message?.includes('No user ID')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (error.message?.includes('Forbidden')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        return NextResponse.json(
            {
                error: 'Internal server error',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            },
            { status: 500 }
        );
    }
}

async function POSTHandler(request: NextRequest) {
    try {
        const headerOrgId = request.headers.get('x-org-id');
        const queryOrgId = request.nextUrl.searchParams.get('orgId');
        const effectiveOrgId = headerOrgId || queryOrgId;
        if (!effectiveOrgId) {
            return NextResponse.json({ error: 'Missing orgId' }, { status: 400 });
        }
        const workspace = await requireWorkspaceAccessByOrgSlugApi(effectiveOrgId);

        // 1. Authenticate user
        const user = await getAuthenticatedUser();

        // 2. Check permissions
        await requirePermission('view_crm');

        const body = await request.json();

        // Validate input
        if (!body.title) {
            return NextResponse.json(
                { error: 'Title is required' },
                { status: 400 }
            );
        }

        // Get the database user ID (UUID) from the users table by email
        // This is needed because tasks table expects UUID, not Clerk ID
        let dbUserId: string | undefined = undefined;
        if (user.email) {
            try {
                const dbUsers = await getUsers({ email: user.email });
                if (dbUsers.length > 0) {
                    dbUserId = dbUsers[0].id; // This is the UUID from Supabase
                } else {
                    console.warn('[API] User not found in database, cannot create task');
                    return NextResponse.json(
                        { error: 'User not found in database. Please sync your account first.' },
                        { status: 400 }
                    );
                }
            } catch (dbError: any) {
                console.error('[API] Error fetching user from database:', dbError);
                return NextResponse.json(
                    { error: 'Failed to verify user in database' },
                    { status: 500 }
                );
            }
        }

        // Convert assigneeIds from Clerk IDs to database UUIDs if needed
        let assigneeIds: string[] = [];
        let assigneeId: string | undefined = undefined;

        // Helper function to check if a string is a UUID
        const isUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

        if (body.assigneeIds && body.assigneeIds.length > 0) {
            for (const id of body.assigneeIds) {
                if (isUUID(id)) {
                    // Already a UUID, use it directly
                    assigneeIds.push(id);
                } else {
                    // Clerk ID - skip non-UUID IDs and log a warning
                    console.warn('[API] Assignee ID is not a UUID, skipping:', id);
                }
            }
        }

        // If assigneeId is provided, check if it's a UUID
        if (body.assigneeId) {
            if (isUUID(body.assigneeId)) {
                assigneeId = body.assigneeId;
                if (!assigneeIds.includes(body.assigneeId)) {
                    assigneeIds.push(body.assigneeId);
                }
            } else {
                console.warn('[API] Assignee ID is not a UUID, skipping:', body.assigneeId);
            }
        }

        // If no assignee specified, assign to creator
        if (assigneeIds.length === 0 && dbUserId) {
            assigneeIds = [dbUserId];
            assigneeId = dbUserId;
        }

        // Validate creatorId - must be UUID or use dbUserId
        let finalCreatorId: string | undefined = dbUserId;
        if (body.creatorId) {
            if (isUUID(body.creatorId)) {
                finalCreatorId = body.creatorId;
            } else {
                // Clerk ID provided - use dbUserId instead
                console.warn('[API] Creator ID is not a UUID, using dbUserId instead:', body.creatorId);
                finalCreatorId = dbUserId;
            }
        }

        // Create task in database
        const taskData: Omit<Task, 'id'> = {
            title: body.title,
            description: body.description || '',
            status: body.status || 'Todo',
            priority: body.priority || 'Medium',
            assigneeIds: assigneeIds.length > 0 ? assigneeIds : [],
            assigneeId: assigneeId,
            creatorId: finalCreatorId,
            tags: body.tags || [],
            createdAt: body.createdAt || new Date().toISOString(),
            dueDate: body.dueDate || null,
            dueTime: body.dueTime || null,
            timeSpent: body.timeSpent || 0,
            estimatedTime: body.estimatedTime || null,
            approvalStatus: body.approvalStatus || null,
            isTimerRunning: body.isTimerRunning || false,
            messages: body.messages || [],
            clientId: body.clientId || null,
            isPrivate: body.isPrivate || false,
            audioUrl: body.audioUrl || null,
            snoozeCount: body.snoozeCount || 0,
            isFocus: body.isFocus || false,
            completionDetails: body.completionDetails || null,
            department: body.department || user.role || null
        };

        const supabaseClient = createClient();
        const ensuredTaskId =
            typeof body.id === 'string' && body.id.trim().length > 0
                ? body.id
                : randomUUID();
        const insertPayload: any = {
            id: ensuredTaskId,
            organization_id: workspace.id,
            title: taskData.title,
            description: taskData.description || null,
            status: taskData.status,
            priority: String(taskData.priority),
            assignee_ids: taskData.assigneeIds || [],
            assignee_id: taskData.assigneeId || null,
            creator_id: taskData.creatorId || null,
            tags: taskData.tags || [],
            created_at: taskData.createdAt || new Date().toISOString(),
            updated_at: new Date().toISOString(),
            due_date: taskData.dueDate || null,
            due_time: taskData.dueTime || null,
            time_spent: taskData.timeSpent || 0,
            estimated_time: taskData.estimatedTime ?? null,
            approval_status: taskData.approvalStatus ?? null,
            is_timer_running: Boolean(taskData.isTimerRunning),
            messages: Array.isArray(taskData.messages) ? taskData.messages : (taskData.messages ?? []),
            client_id: taskData.clientId || null,
            is_private: Boolean(taskData.isPrivate),
            audio_url: taskData.audioUrl || null,
            snooze_count: taskData.snoozeCount || 0,
            is_focus: Boolean(taskData.isFocus),
            completion_details: taskData.completionDetails ?? null,
            department: (taskData.department as any) || null,
        };

        const { data: created, error: createError } = await supabaseClient
            .from('nexus_tasks')
            .insert(insertPayload)
            .select('*')
            .single();

        if (createError || !created) {
            throw new Error(createError?.message || 'Failed to create task');
        }

        const newTask = toTaskDto(created);

        // Log audit event asynchronously (don't wait for it)
        logAuditEvent('data.write', 'task', {
            resourceId: newTask.id,
            details: { createdBy: user.id }
        }).catch((auditError) => {
            // Ignore audit errors - don't block the response
            console.error('[API] Audit logging failed:', auditError);
        });

        // Send notifications to assignees (if task is assigned to someone other than creator)
        if (assigneeIds.length > 0) {
            try {
                const allUsers = await getUsers();
                const creator = allUsers.find(u => u.id === finalCreatorId);
                const creatorName = creator?.name || 'מערכת';

                const notifications = assigneeIds
                    .filter(assigneeId => assigneeId !== finalCreatorId) // Don't notify creator if they assigned to themselves
                    .map(assigneeId => ({
                        recipient_id: assigneeId,
                        type: 'task_assigned',
                        text: `שויכת למשימה: ${newTask.title}`,
                        actor_id: user.id,
                        actor_name: creatorName,
                        related_id: newTask.id,
                        is_read: false,
                        metadata: {
                            taskId: newTask.id,
                            taskTitle: newTask.title,
                            priority: newTask.priority,
                            dueDate: newTask.dueDate,
                            dueTime: newTask.dueTime
                        },
                        created_at: new Date().toISOString()
                    }));

                if (notifications.length > 0) {
                    const { error: notifError } = await supabaseClient
                        .from('misrad_notifications')
                        .insert(notifications);

                    if (notifError) {
                        console.warn('[API] Could not create task assignment notifications:', notifError);
                    }
                }
            } catch (notifError) {
                console.warn('[API] Error sending task assignment notifications:', notifError);
                // Don't fail the request if notification fails
            }
        }

        return NextResponse.json({
            success: true,
            task: newTask
        }, { status: 201 });

    } catch (error: any) {
        console.error('[API] Error in POST /api/tasks:', error);
        console.error('[API] Error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });

        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: error.message?.includes('Forbidden') ? 403 : error.message?.includes('Unauthorized') ? 401 : 500 }
        );
    }
}

async function DELETEHandler(request: NextRequest) {
    try {
        const headerOrgId = request.headers.get('x-org-id');
        const queryOrgId = request.nextUrl.searchParams.get('orgId');
        const effectiveOrgId = headerOrgId || queryOrgId;
        if (!effectiveOrgId) {
            return NextResponse.json({ error: 'Missing orgId' }, { status: 400 });
        }
        const workspace = await requireWorkspaceAccessByOrgSlugApi(effectiveOrgId);

        const user = await getAuthenticatedUser();
        await requirePermission('view_crm');

        const searchParams = request.nextUrl.searchParams;
        const taskId = searchParams.get('id');
        if (!taskId) {
            return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
        }

        const isSuperAdmin = (user as any)?.isSuperAdmin === true;
        const canAccess = isSuperAdmin ? true : await canAccessResource('task', taskId, 'write');
        if (!canAccess) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const supabaseClient = createClient();
        const { error } = await supabaseClient
            .from('nexus_tasks')
            .delete()
            .eq('id', taskId)
            .eq('organization_id', workspace.id);

        if (error) {
            throw new Error(error.message);
        }

        logAuditEvent('data.delete', 'task', {
            resourceId: taskId,
            details: { organizationId: workspace.id },
            success: true,
        }).catch(() => {
            // ignore
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[API] Error in DELETE /api/tasks:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: error.message?.includes('Forbidden') ? 403 : error.message?.includes('Unauthorized') ? 401 : 500 }
        );
    }
}

async function PATCHHandler(request: NextRequest) {
    try {
        const headerOrgId = request.headers.get('x-org-id');
        const queryOrgId = request.nextUrl.searchParams.get('orgId');
        const effectiveOrgId = headerOrgId || queryOrgId;
        if (!effectiveOrgId) {
            return NextResponse.json({ error: 'Missing orgId' }, { status: 400 });
        }
        const workspace = await requireWorkspaceAccessByOrgSlugApi(effectiveOrgId);

        // 1. Authenticate user
        const user = await getAuthenticatedUser();

        const body = await request.json();
        const { taskId, updates } = body;

        if (!taskId) {
            return NextResponse.json(
                { error: 'Task ID is required' },
                { status: 400 }
            );
        }

        // Check if user can modify this task
        const isSuperAdmin = (user as any)?.isSuperAdmin === true;
        const canAccess = isSuperAdmin ? true : await canAccessResource('task', taskId, 'write');
        if (!canAccess) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Get existing task (scoped by org)
        const supabaseClient = createClient();

        const { data: existing, error: existingError } = await supabaseClient
            .from('nexus_tasks')
            .select('*')
            .eq('id', taskId)
            .eq('organization_id', workspace.id)
            .maybeSingle();

        if (existingError) {
            throw new Error(existingError.message);
        }

        if (!existing) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        }

        // Use for later comparisons and notification logic
        const existingTask = toTaskDto(existing);

        const patch: any = {};
        if (updates.title !== undefined) patch.title = updates.title;
        if (updates.description !== undefined) patch.description = updates.description;
        if (updates.status !== undefined) patch.status = updates.status;
        if (updates.priority !== undefined) patch.priority = updates.priority;
        if (updates.assigneeIds !== undefined) patch.assignee_ids = updates.assigneeIds;
        if (updates.assigneeId !== undefined) patch.assignee_id = updates.assigneeId;
        if (updates.creatorId !== undefined) patch.creator_id = updates.creatorId;
        if (updates.tags !== undefined) patch.tags = updates.tags;
        if (updates.dueDate !== undefined) patch.due_date = updates.dueDate;
        if (updates.dueTime !== undefined) patch.due_time = updates.dueTime;
        if (updates.timeSpent !== undefined) patch.time_spent = updates.timeSpent;
        if (updates.estimatedTime !== undefined) patch.estimated_time = updates.estimatedTime;
        if (updates.approvalStatus !== undefined) patch.approval_status = updates.approvalStatus;
        if (updates.isTimerRunning !== undefined) patch.is_timer_running = updates.isTimerRunning;
        if (updates.messages !== undefined) patch.messages = updates.messages;
        if (updates.clientId !== undefined) patch.client_id = updates.clientId;
        if (updates.isPrivate !== undefined) patch.is_private = updates.isPrivate;
        if (updates.audioUrl !== undefined) patch.audio_url = updates.audioUrl;
        if (updates.snoozeCount !== undefined) patch.snooze_count = updates.snoozeCount;
        if (updates.isFocus !== undefined) patch.is_focus = updates.isFocus;
        if (updates.completionDetails !== undefined) patch.completion_details = updates.completionDetails;
        if (updates.department !== undefined) patch.department = updates.department;

        const { data: updated, error: updateError } = await supabaseClient
            .from('nexus_tasks')
            .update(patch)
            .eq('id', taskId)
            .eq('organization_id', workspace.id)
            .select('*')
            .single();

        if (updateError || !updated) {
            throw new Error(updateError?.message || 'Failed to update task');
        }

        const updatedTask = toTaskDto(updated);

        await logAuditEvent('data.write', 'task', {
            resourceId: taskId,
            details: { updatedBy: user.id, updates }
        });

        // Send notifications for important changes
        if (existingTask) {
            try {
                const allUsers = await getUsers();
                const updater = allUsers.find(u => u.id === user.id);
                const updaterName = updater?.name || 'מערכת';

                // 1. Notify assignees if task was newly assigned
                if (updates.assigneeIds && Array.isArray(updates.assigneeIds)) {
                    const oldAssignees = existingTask.assigneeIds || [];
                    const newAssignees = updates.assigneeIds.filter((id: string) => !oldAssignees.includes(id));

                    if (newAssignees.length > 0) {
                        const notifications = newAssignees.map((assigneeId: string) => ({
                            recipient_id: assigneeId,
                            type: 'task_assigned',
                            text: `שויכת למשימה: ${updatedTask.title}`,
                            actor_id: user.id,
                            actor_name: updaterName,
                            related_id: taskId,
                            is_read: false,
                            metadata: {
                                taskId: taskId,
                                taskTitle: updatedTask.title,
                                priority: updatedTask.priority
                            },
                            created_at: new Date().toISOString()
                        }));

                        const { error: notifError } = await supabaseClient
                            .from('misrad_notifications')
                            .insert(notifications);

                        if (notifError) {
                            console.warn('[API] Could not create task assignment notifications:', notifError);
                        }
                    }
                }

                // 2. Notify creator if status changed to Done or Waiting for Review
                if (updates.status && updates.status !== existingTask.status) {
                    const importantStatuses = ['Done', 'Waiting for Review'];
                    if (importantStatuses.includes(updates.status) && existingTask.creatorId && existingTask.creatorId !== user.id) {
                        const notification = {
                            recipient_id: existingTask.creatorId,
                            type: 'task_status',
                            text: `סטטוס משימה השתנה ל-${updates.status}: ${updatedTask.title}`,
                            actor_id: user.id,
                            actor_name: updaterName,
                            related_id: taskId,
                            is_read: false,
                            metadata: {
                                taskId: taskId,
                                taskTitle: updatedTask.title,
                                oldStatus: existingTask.status,
                                newStatus: updates.status
                            },
                            created_at: new Date().toISOString()
                        };

                        const { error: notifError } = await supabaseClient
                            .from('misrad_notifications')
                            .insert(notification);

                        if (notifError) {
                            console.warn('[API] Could not create task status notification:', notifError);
                        }
                    }
                }
            } catch (notifError) {
                console.warn('[API] Error sending task update notifications:', notifError);
                // Don't fail the request if notification fails
            }
        }

        return NextResponse.json({
            success: true,
            task: updatedTask
        });

    } catch (error: any) {
        return NextResponse.json(
            { error: error.message },
            { status: error.message.includes('Forbidden') ? 403 : 500 }
        );
    }
}

// Helper
async function requirePermission(permission: string) {
    const { requirePermission: reqPerm } = await import('../../../lib/auth');
    await reqPerm(permission as any);
}


export const GET = shabbatGuard(GETHandler);

export const POST = shabbatGuard(POSTHandler);

export const PATCH = shabbatGuard(PATCHHandler);

export const DELETE = shabbatGuard(DELETEHandler);
