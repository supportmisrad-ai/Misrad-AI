/**
 * API Route: Support Ticket by ID
 * PATCH /api/support/[id] - Update support ticket (status, assignment, response)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '../../../../lib/auth';
import { createClient } from '../../../../lib/supabase';
import { SupportTicket } from '../../../../types';
import { requireWorkspaceAccessByOrgSlugApi } from '@/lib/server/workspace';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
async function PATCHHandler(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getAuthenticatedUser();

        const orgIdFromHeader = request.headers.get('x-org-id') || request.headers.get('x-orgid');
        let workspaceId: string | null = null;
        if (orgIdFromHeader) {
            const workspace = await requireWorkspaceAccessByOrgSlugApi(orgIdFromHeader);
            workspaceId = workspace.id;
        } else if (!user.isSuperAdmin) {
            return NextResponse.json({ error: 'Missing x-org-id header' }, { status: 400 });
        }

        const supabase = createClient();

        const { id: ticketId } = await params;

        if (!ticketId) {
            return NextResponse.json(
                { error: 'Ticket ID is required' },
                { status: 400 }
            );
        }

        // Get existing ticket
        const { data: existingTicket, error: getError } = await supabase
            .from('misrad_support_tickets')
            .select('*')
            .eq('id', ticketId)
            .single();

        if (getError || !existingTicket) {
            return NextResponse.json(
                { error: 'קריאת תמיכה לא נמצאה' },
                { status: 404 }
            );
        }

        // Zero-trust: ensure the ticket belongs to the current workspace context.
        if (workspaceId && String(existingTicket.tenant_id || '') !== String(workspaceId)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Check permissions
        const isAdmin = user.isSuperAdmin || user.role === 'מנכ״ל' || user.role === 'מנכ"ל' || user.role === 'אדמין';
        const isOwner = existingTicket.user_id === user.id;

        // Only owner (if open) or admin can update
        if (!isAdmin && (!isOwner || existingTicket.status !== 'open')) {
            return NextResponse.json(
                { error: 'אין הרשאה לעדכן קריאת תמיכה זו' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { status, priority, assigned_to, admin_response, resolution_notes } = body;

        // Build update data
        const updateData: any = {};

        // Only admins can change status, assign, or add responses
        if (isAdmin) {
            if (status) {
                const validStatuses = ['open', 'in_progress', 'resolved', 'closed'];
                if (validStatuses.includes(status)) {
                    updateData.status = status;
                    if (status === 'resolved' && !existingTicket.resolved_by) {
                        updateData.resolved_by = user.id;
                    }
                }
            }
            if (priority) {
                const validPriorities = ['low', 'medium', 'high', 'urgent'];
                if (validPriorities.includes(priority)) {
                    updateData.priority = priority;
                }
            }
            if (assigned_to !== undefined) {
                updateData.assigned_to = assigned_to || null;
            }
            if (admin_response !== undefined) {
                updateData.admin_response = admin_response;
            }
            if (resolution_notes !== undefined) {
                updateData.resolution_notes = resolution_notes;
            }
        }

        // Users can only update their own open tickets (subject/message)
        if (isOwner && existingTicket.status === 'open') {
            if (body.subject) updateData.subject = body.subject;
            if (body.message) updateData.message = body.message;
        }

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json(
                { error: 'אין שינויים לעדכן' },
                { status: 400 }
            );
        }

        // Update ticket
        const { data: updatedTicket, error: updateError } = await supabase
            .from('misrad_support_tickets')
            .update(updateData)
            .eq('id', ticketId)
            .select()
            .single();

        if (updateError) {
            console.error('[API] Error updating support ticket:', updateError);
            return NextResponse.json(
                { error: 'שגיאה בעדכון קריאת תמיכה' },
                { status: 500 }
            );
        }

        // Transform response
        const transformedTicket: SupportTicket = {
            id: updatedTicket.id,
            user_id: updatedTicket.user_id,
            tenant_id: updatedTicket.tenant_id,
            category: updatedTicket.category,
            subject: updatedTicket.subject,
            message: updatedTicket.message,
            ticket_number: updatedTicket.ticket_number,
            status: updatedTicket.status,
            priority: updatedTicket.priority,
            assigned_to: updatedTicket.assigned_to,
            resolved_by: updatedTicket.resolved_by,
            created_at: updatedTicket.created_at,
            updated_at: updatedTicket.updated_at,
            resolved_at: updatedTicket.resolved_at,
            closed_at: updatedTicket.closed_at,
            admin_response: updatedTicket.admin_response,
            resolution_notes: updatedTicket.resolution_notes,
            metadata: updatedTicket.metadata || {}
        };

        return NextResponse.json({
            success: true,
            ticket: transformedTicket,
            message: 'קריאת תמיכה עודכנה בהצלחה'
        });

    } catch (error: any) {
        console.error('[API] Error in /api/support/[id] PATCH:', error);
        return NextResponse.json(
            { error: error.message || 'שגיאה בעדכון קריאת תמיכה' },
            { status: error.message?.includes('Unauthorized') ? 401 : 500 }
        );
    }
}

export const PATCH = shabbatGuard(PATCHHandler);
