/**
 * Secure Time Entries API
 * 
 * Server-side API with proper authorization
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, hasPermission } from '../../../lib/auth';
import { logAuditEvent } from '../../../lib/audit';
import { getTimeEntries, createRecord, updateRecord, deleteRecord } from '../../../lib/db';
import { resolveWorkspaceCurrentUserForApi } from '@/lib/server/workspaceUser';
import { TimeEntry } from '../../../types';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
function isUUID(id: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

async function GETHandler(request: NextRequest) {
    try {
        const headerOrgId = request.headers.get('x-org-id') || request.headers.get('x-orgid');
        if (!headerOrgId) {
            return NextResponse.json({ error: 'Missing organization context (x-org-id)' }, { status: 400 });
        }

        // Resolve workspace + DB user in a zero-trust way
        const resolved = await resolveWorkspaceCurrentUserForApi(headerOrgId);
        const workspace = resolved.workspace;
        const dbUser = resolved.user;

        // 1. Authenticate user (kept for permission checks / consistency)
        const user = await getAuthenticatedUser();
        
        // 2. Check permissions
        const canManageTeam = await hasPermission('manage_team');
        
        // 3. Log access
        await logAuditEvent('data.read', 'time_entry', {
            success: true
        });
        
        // 4. Get query parameters
        const searchParams = request.nextUrl.searchParams;
        const userId = searchParams.get('userId');
        const dateFrom = searchParams.get('dateFrom');
        const dateTo = searchParams.get('dateTo');

        // Pagination (fail-safe defaults)
        const pageRaw = searchParams.get('page');
        const pageSizeRaw = searchParams.get('pageSize');
        const page = Math.max(1, Number.parseInt(String(pageRaw ?? '1'), 10) || 1);
        const requestedPageSize = Number.parseInt(String(pageSizeRaw ?? '50'), 10) || 50;
        const pageSize = Math.min(200, Math.max(1, requestedPageSize));

        // Normalize to DB UUIDs
        const requestedUserId = userId ? (isUUID(userId) ? userId : null) : null;
        if (userId && !requestedUserId) {
            return NextResponse.json({ error: 'Invalid userId' }, { status: 400 });
        }

        // Enforce access BEFORE hitting DB
        if (requestedUserId && requestedUserId !== dbUser.id && !canManageTeam) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Decide DB-level scoping
        const queryUserId = requestedUserId ? requestedUserId : (canManageTeam ? undefined : dbUser.id);
        
        // 5. Fetch time entries from database
        // NOTE: getTimeEntries isn't org-scoped; we scope here by querying and filtering.
        // Prefer fetching by userId when possible.
        const timeEntries = await getTimeEntries({
            userId: queryUserId,
            dateFrom: dateFrom || undefined,
            dateTo: dateTo || undefined,
            tenantId: workspace.id,
            page,
            pageSize,
        });

        const hasMore = Array.isArray(timeEntries) && timeEntries.length > pageSize;
        const trimmed = hasMore ? timeEntries.slice(0, pageSize) : timeEntries;

        return NextResponse.json({
            timeEntries: trimmed,
            page,
            pageSize,
            hasMore,
        });
        
    } catch (error: any) {
        await logAuditEvent('data.read', 'time_entry', {
            success: false,
            error: error.message
        });
        
        if (error.message.includes('Unauthorized')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        if (error.message.includes('Forbidden')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

async function PATCHHandler(request: NextRequest) {
    try {
        const headerOrgId = request.headers.get('x-org-id') || request.headers.get('x-orgid');
        if (!headerOrgId) {
            return NextResponse.json({ error: 'Missing organization context (x-org-id)' }, { status: 400 });
        }

        const resolved = await resolveWorkspaceCurrentUserForApi(headerOrgId);
        const workspace = resolved.workspace;
        const dbUser = resolved.user;

        const user = await getAuthenticatedUser();
        const canManageTeam = await hasPermission('manage_team');

        const searchParams = request.nextUrl.searchParams;
        const entryId = searchParams.get('id');
        if (!entryId) {
            return NextResponse.json({ error: 'Entry ID is required' }, { status: 400 });
        }

        const entries = await getTimeEntries({ entryId, tenantId: workspace.id });
        const entry = entries[0];
        if (!entry) {
            return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
        }

        if (entry.userId !== dbUser.id && !canManageTeam) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json().catch(() => ({}));
        const endTime = typeof body?.endTime === 'string' ? body.endTime : new Date().toISOString();

        const startTimeMs = new Date(entry.startTime).getTime();
        const endTimeMs = new Date(endTime).getTime();
        const durationMinutes = endTimeMs > startTimeMs ? Math.round((endTimeMs - startTimeMs) / 60000) : 0;

        const updated = await updateRecord<TimeEntry>('time_entries', entryId, {
            endTime,
            durationMinutes,
        }, {
            organizationId: workspace.id
        });

        await logAuditEvent('data.write', 'time_entry', {
            resourceId: entryId,
            details: { updatedBy: user.id, action: 'clock_out' }
        });

        return NextResponse.json({ success: true, entry: updated });
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message },
            { status: error.message.includes('Forbidden') ? 403 : error.message.includes('Unauthorized') ? 401 : 500 }
        );
    }
}

async function POSTHandler(request: NextRequest) {
    try {
        const headerOrgId = request.headers.get('x-org-id') || request.headers.get('x-orgid');
        if (!headerOrgId) {
            return NextResponse.json({ error: 'Missing organization context (x-org-id)' }, { status: 400 });
        }

        const resolved = await resolveWorkspaceCurrentUserForApi(headerOrgId);
        const workspace = resolved.workspace;
        const dbUser = resolved.user;

        const user = await getAuthenticatedUser();
        const body = await request.json();
        
        // Users can only create entries for themselves (unless manager)
        const canManageTeam = await hasPermission('manage_team');
        const requestedUserId = typeof body.userId === 'string' && isUUID(body.userId) ? body.userId : null;
        if (requestedUserId && requestedUserId !== dbUser.id && !canManageTeam) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        
        // Create time entry in database
        const newEntry = await createRecord('time_entries', {
            ...body,
            userId: requestedUserId || dbUser.id,
        }, {
            organizationId: workspace.id
        });
        
        await logAuditEvent('data.write', 'time_entry', {
            resourceId: newEntry.id,
            details: { createdBy: user.id }
        });
        
        return NextResponse.json({ success: true, entry: newEntry });
        
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message },
            { status: error.message.includes('Forbidden') ? 403 : 500 }
        );
    }
}

async function DELETEHandler(request: NextRequest) {
    try {
        const headerOrgId = request.headers.get('x-org-id') || request.headers.get('x-orgid');
        if (!headerOrgId) {
            return NextResponse.json({ error: 'Missing organization context (x-org-id)' }, { status: 400 });
        }

        const resolved = await resolveWorkspaceCurrentUserForApi(headerOrgId);
        const workspace = resolved.workspace;
        const dbUser = resolved.user;

        const user = await getAuthenticatedUser();
        const searchParams = request.nextUrl.searchParams;
        const entryId = searchParams.get('id');
        
        if (!entryId) {
            return NextResponse.json(
                { error: 'Entry ID is required' },
                { status: 400 }
            );
        }
        
        // Fetch entry from database to check ownership
        const entries = await getTimeEntries({ entryId, tenantId: workspace.id });
        const entry = entries[0];
        
        if (!entry) {
            return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
        }
        
        // Check ownership
        const canManageTeam = await hasPermission('manage_team');
        if (entry.userId !== dbUser.id && !canManageTeam) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        
        // Delete from database
        await deleteRecord('time_entries', entryId, { organizationId: workspace.id });
        
        await logAuditEvent('data.delete', 'time_entry', {
            resourceId: entryId,
            details: { deletedBy: user.id }
        });
        
        return NextResponse.json({ success: true });
        
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}


export const GET = shabbatGuard(GETHandler);

export const POST = shabbatGuard(POSTHandler);

export const PATCH = shabbatGuard(PATCHHandler);

export const DELETE = shabbatGuard(DELETEHandler);
