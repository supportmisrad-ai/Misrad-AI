/**
 * API Route: Support Tickets
 * GET /api/support - Get support tickets
 * POST /api/support - Create new support ticket
 */

import { NextRequest } from 'next/server';
import { getAuthenticatedUser, requirePermission } from '../../../lib/auth';
import { Priority, SupportTicket, SupportTicketCategory, SupportTicketStatus } from '../../../types';
import { isTenantAdminRole } from '@/lib/constants/roles';
import { APIError, getWorkspaceOrThrow } from '@/lib/server/api-workspace';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import prisma from '@/lib/prisma';
import { randomUUID } from 'crypto';

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

async function GETHandler(request: NextRequest) {
    try {
        const user = await getAuthenticatedUser();

        const { workspaceId } = await getWorkspaceOrThrow(request);

        const searchParams = request.nextUrl.searchParams;
        const ticketId = searchParams.get('id');
        const status = searchParams.get('status');
        const userId = searchParams.get('userId');

        // Check if user is admin
        const isAdmin = user.isSuperAdmin || isTenantAdminRole(user.role);

        const where: any = {
            tenant_id: String(workspaceId),
        };

        // If not admin, only show user's own tickets
        if (!isAdmin) {
            where.user_id = String(user.id);
        } else if (userId) {
            // Admin can filter by specific user
            where.user_id = String(userId);
        }

        // Filter by ticket ID
        if (ticketId) {
            where.id = String(ticketId);
        }

        // Filter by status
        if (status) {
            where.status = String(status);
        }

        const tickets = await prisma.scale_support_tickets.findMany({
            where,
            orderBy: { created_at: 'desc' },
        });

        const transformedTickets: SupportTicket[] = (tickets || []).map(normalizeTicket);

        if (ticketId) {
            return apiSuccess(transformedTickets[0] || null);
        }

        return apiSuccess({ tickets: transformedTickets });

    } catch (error: any) {
        console.error('[API] Error in /api/support GET:', error);
        if (error instanceof APIError) {
            return apiError(error, { status: error.status, message: error.message || 'Forbidden' });
        }
        return apiError(error, {
            status: error.message?.includes('Unauthorized') ? 401 : 500,
            message: error.message || 'שגיאה בטעינת קריאות תמיכה',
        });
    }
}

async function POSTHandler(request: NextRequest) {
    try {
        const user = await getAuthenticatedUser();

        const { workspaceId } = await getWorkspaceOrThrow(request);
        
        const body = await request.json();
        const { category, subject, message, priority } = body;

        // Validate required fields
        if (!category || !subject || !message) {
            return apiError('נא למלא את כל השדות החובה: נושא, כותרת ופירוט', { status: 400 });
        }

        // Validate category
        const validCategories = ['Tech', 'Account', 'Billing', 'Feature'];
        if (!validCategories.includes(category)) {
            return apiError('קטגוריה לא תקינה', { status: 400 });
        }

        // Create ticket
        const ticketData = {
            user_id: user.id,
            tenant_id: workspaceId,
            category: category,
            subject: subject.trim(),
            message: message.trim(),
            priority: priority || 'medium',
            status: 'open',
            metadata: {},
            ticket_number: `TKT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${randomUUID().slice(0, 8)}`
        };

        const ticket = await prisma.scale_support_tickets.create({
            data: ticketData as any,
        });

        const transformedTicket: SupportTicket = normalizeTicket(ticket);

        return apiSuccess(
            {
                ticket: transformedTicket,
                message: 'קריאת תמיכה נוצרה בהצלחה',
            },
            { status: 201 }
        );

    } catch (error: any) {
        console.error('[API] Error in /api/support POST:', error);
        if (error instanceof APIError) {
            return apiError(error, { status: error.status, message: error.message || 'Forbidden' });
        }
        return apiError(error, {
            status: error.message?.includes('Unauthorized') ? 401 : 500,
            message: error.message || 'שגיאה ביצירת קריאת תמיכה',
        });
    }
}

export const GET = shabbatGuard(GETHandler);

export const POST = shabbatGuard(POSTHandler);
