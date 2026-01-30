/**
 * API Route: Support Ticket by ID
 * PATCH /api/support/[id] - Update support ticket (status, assignment, response)
 */

import { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '../../../../lib/auth';
import { createClient } from '../../../../lib/supabase';
import { SupportTicket } from '../../../../types';
import { isTenantAdminRole } from '@/lib/constants/roles';
import { APIError, getWorkspaceOrThrow } from '@/lib/server/api-workspace';
import { apiError, apiSuccess } from '@/lib/server/api-response';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
async function PATCHHandler(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getAuthenticatedUser();

        const { workspaceId } = await getWorkspaceOrThrow(request);

        const supabase = createClient();

        const { id: ticketId } = await params;

        if (!ticketId) {
            return apiError('Ticket ID is required', { status: 400 });
        }

        // Get existing ticket
        const { data: existingTicket, error: getError } = await supabase
            .from('misrad_support_tickets')
            .select('*')
            .eq('id', ticketId)
            .single();

        if (getError || !existingTicket) {
            return apiError('קריאת תמיכה לא נמצאה', { status: 404 });
        }

        // Zero-trust: ensure the ticket belongs to the current workspace context.
        if (String(existingTicket.tenant_id || '') !== String(workspaceId)) {
            return apiError('Forbidden', { status: 403 });
        }

        // Check permissions
        const isAdmin = user.isSuperAdmin || isTenantAdminRole(user.role);
        const isOwner = existingTicket.user_id === user.id;

        // Only owner (if open) or admin can update
        if (!isAdmin && (!isOwner || existingTicket.status !== 'open')) {
            return apiError('אין הרשאה לעדכן קריאת תמיכה זו', { status: 403 });
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
            return apiError('אין שינויים לעדכן', { status: 400 });
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
            return apiError('שגיאה בעדכון קריאת תמיכה', { status: 500 });
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

        return apiSuccess({
            ticket: transformedTicket,
            message: 'קריאת תמיכה עודכנה בהצלחה'
        });

    } catch (error: any) {
        console.error('[API] Error in /api/support/[id] PATCH:', error);
        if (error instanceof APIError) {
            return apiError(error, { status: error.status, message: error.message || 'Forbidden' });
        }
        return apiError(error, {
            status: error.message?.includes('Unauthorized') ? 401 : 500,
            message: error.message || 'שגיאה בעדכון קריאת תמיכה',
        });
    }
}

export const PATCH = shabbatGuard(PATCHHandler);
