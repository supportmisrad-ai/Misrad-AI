/**
 * API Route: Support Ticket by ID
 * PATCH /api/support/[id] - Update support ticket (status, assignment, response)
 */

import { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '../../../../lib/auth';
import prisma from '@/lib/prisma';
import { Priority, SupportTicket, SupportTicketCategory, SupportTicketStatus } from '../../../../types';
import { isTenantAdminRole } from '@/lib/constants/roles';
import { APIError, getWorkspaceOrThrow } from '@/lib/server/api-workspace';
import { apiError, apiSuccess } from '@/lib/server/api-response';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

function toIsoString(input: any): string | undefined {
    if (!input) return undefined;
    if (input instanceof Date) return input.toISOString();
    if (typeof input === 'string') return input;
    return undefined;
}

function normalizeMetadata(input: any): Record<string, unknown> | undefined {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return undefined;
    return input as Record<string, unknown>;
}

const SUPPORT_TICKET_CATEGORIES: SupportTicketCategory[] = ['Tech', 'Account', 'Billing', 'Feature'];
const SUPPORT_TICKET_STATUSES: SupportTicketStatus[] = ['open', 'in_progress', 'resolved', 'closed'];

function normalizeCategory(input: any): SupportTicketCategory {
    return SUPPORT_TICKET_CATEGORIES.includes(input) ? input : 'Tech';
}

function normalizeStatus(input: any): SupportTicketStatus {
    return SUPPORT_TICKET_STATUSES.includes(input) ? input : 'open';
}

function normalizePriority(input: any): Priority {
    if (input === Priority.LOW || input === 'low') return Priority.LOW;
    if (input === Priority.MEDIUM || input === 'medium') return Priority.MEDIUM;
    if (input === Priority.HIGH || input === 'high') return Priority.HIGH;
    if (input === Priority.URGENT || input === 'urgent') return Priority.URGENT;
    return Priority.MEDIUM;
}

function normalizeTicket(ticket: any): SupportTicket {
    return {
        id: String(ticket.id),
        user_id: String(ticket.user_id),
        tenant_id: ticket.tenant_id ? String(ticket.tenant_id) : undefined,
        category: normalizeCategory(ticket.category),
        subject: String(ticket.subject || ''),
        message: String(ticket.message || ''),
        ticket_number: String(ticket.ticket_number || ''),
        status: normalizeStatus(ticket.status),
        priority: normalizePriority(ticket.priority),
        assigned_to: ticket.assigned_to ? String(ticket.assigned_to) : undefined,
        resolved_by: ticket.resolved_by ? String(ticket.resolved_by) : undefined,
        created_at: toIsoString(ticket.created_at) || new Date().toISOString(),
        updated_at: toIsoString(ticket.updated_at),
        resolved_at: toIsoString(ticket.resolved_at),
        closed_at: toIsoString(ticket.closed_at),
        admin_response: ticket.admin_response ? String(ticket.admin_response) : undefined,
        resolution_notes: ticket.resolution_notes ? String(ticket.resolution_notes) : undefined,
        metadata: normalizeMetadata(ticket.metadata) ?? {},
    };
}

async function PATCHHandler(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getAuthenticatedUser();

        const { workspaceId } = await getWorkspaceOrThrow(request);

        const { id: ticketId } = await params;

        if (!ticketId) {
            return apiError('Ticket ID is required', { status: 400 });
        }

        // Get existing ticket
        const existingTicket = await prisma.scale_support_tickets.findUnique({
            where: { id: String(ticketId) },
        });

        if (!existingTicket) {
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
        const updatedTicket = await prisma.scale_support_tickets.update({
            where: { id: String(ticketId) },
            data: updateData,
        });

        const transformedTicket: SupportTicket = normalizeTicket(updatedTicket);

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
