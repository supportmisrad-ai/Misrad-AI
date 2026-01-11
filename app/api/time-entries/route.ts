/**
 * Secure Time Entries API
 * 
 * Server-side API with proper authorization
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, hasPermission } from '../../../lib/auth';
import { logAuditEvent } from '../../../lib/audit';
import { getTimeEntries, createRecord, updateRecord, deleteRecord } from '../../../lib/db';

export async function GET(request: NextRequest) {
    try {
        // 1. Authenticate user
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
        
        // 5. Fetch time entries from database
        let timeEntries = await getTimeEntries({
            userId: userId || undefined,
            dateFrom: dateFrom || undefined,
            dateTo: dateTo || undefined
        });
        
        // 6. Filter based on permissions
        if (userId) {
            // Check if user can view this user's time entries
            if (userId !== user.id && !canManageTeam) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
            
            timeEntries = timeEntries.filter(e => e.userId === userId);
        } else {
            // If no userId specified, return only current user's entries (unless manager)
            if (!canManageTeam) {
                timeEntries = timeEntries.filter(e => e.userId === user.id);
            }
        }
        
        // 7. Filter by date range if requested
        if (dateFrom && dateTo) {
            timeEntries = timeEntries.filter(e => {
                const entryDate = new Date(e.startTime).toISOString().split('T')[0];
                return entryDate >= dateFrom && entryDate <= dateTo;
            });
        }
        
        return NextResponse.json({ timeEntries });
        
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

export async function POST(request: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        const body = await request.json();
        
        // Users can only create entries for themselves (unless manager)
        const canManageTeam = await hasPermission('manage_team');
        if (body.userId && body.userId !== user.id && !canManageTeam) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        
        // Create time entry in database
        const newEntry = await createRecord('time_entries', {
            ...body,
            userId: body.userId || user.id
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

export async function DELETE(request: NextRequest) {
    try {
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
        const entries = await getTimeEntries({ entryId });
        const entry = entries[0];
        
        if (!entry) {
            return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
        }
        
        // Check ownership
        const canManageTeam = await hasPermission('manage_team');
        if (entry.userId !== user.id && !canManageTeam) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        
        // Delete from database
        await deleteRecord('time_entries', entryId);
        
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

