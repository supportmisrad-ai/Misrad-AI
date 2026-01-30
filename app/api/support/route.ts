/**
 * API Route: Support Tickets
 * GET /api/support - Get support tickets
 * POST /api/support - Create new support ticket
 */

import { NextRequest } from 'next/server';
import { getAuthenticatedUser, requirePermission } from '../../../lib/auth';
import { createClient } from '../../../lib/supabase';
import { SupportTicket } from '../../../types';
import { isTenantAdminRole } from '@/lib/constants/roles';
import { APIError, getWorkspaceOrThrow } from '@/lib/server/api-workspace';
import { apiError, apiSuccess } from '@/lib/server/api-response';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
async function GETHandler(request: NextRequest) {
    try {
        const user = await getAuthenticatedUser();

        const { workspaceId } = await getWorkspaceOrThrow(request);

        const supabase = createClient();

        const searchParams = request.nextUrl.searchParams;
        const ticketId = searchParams.get('id');
        const status = searchParams.get('status');
        const userId = searchParams.get('userId');

        // Check if user is admin
        const isAdmin = user.isSuperAdmin || isTenantAdminRole(user.role);

        let query = supabase
            .from('misrad_support_tickets')
            .select('*')
            .order('created_at', { ascending: false });

        query = query.eq('tenant_id', workspaceId);

        // If not admin, only show user's own tickets
        if (!isAdmin) {
            query = query.eq('user_id', user.id);
        } else if (userId) {
            // Admin can filter by specific user
            query = query.eq('user_id', userId);
        }

        // Filter by ticket ID
        if (ticketId) {
            query = query.eq('id', ticketId).limit(1);
        }

        // Filter by status
        if (status) {
            query = query.eq('status', status);
        }

        const { data: tickets, error } = await query;

        if (error) {
            console.error('[API] Error fetching support tickets:', error);
            return apiError('שגיאה בטעינת קריאות תמיכה', { status: 500 });
        }

        // Transform to match TypeScript interface
        const transformedTickets: SupportTicket[] = (tickets || []).map((ticket: any) => ({
            id: ticket.id,
            user_id: ticket.user_id,
            tenant_id: ticket.tenant_id,
            category: ticket.category,
            subject: ticket.subject,
            message: ticket.message,
            ticket_number: ticket.ticket_number,
            status: ticket.status,
            priority: ticket.priority,
            assigned_to: ticket.assigned_to,
            resolved_by: ticket.resolved_by,
            created_at: ticket.created_at,
            updated_at: ticket.updated_at,
            resolved_at: ticket.resolved_at,
            closed_at: ticket.closed_at,
            admin_response: ticket.admin_response,
            resolution_notes: ticket.resolution_notes,
            metadata: ticket.metadata || {}
        }));

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
        const supabase = createClient();
        
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
            metadata: {}
        };

        const { data: ticket, error: createError } = await supabase
            .from('misrad_support_tickets')
            .insert(ticketData)
            .select()
            .single();

        if (createError) {
            console.error('[API] Error creating support ticket:', createError);
            return apiError('שגיאה ביצירת קריאת תמיכה', { status: 500 });
        }

        // Transform response
        const transformedTicket: SupportTicket = {
            id: ticket.id,
            user_id: ticket.user_id,
            tenant_id: ticket.tenant_id,
            category: ticket.category,
            subject: ticket.subject,
            message: ticket.message,
            ticket_number: ticket.ticket_number,
            status: ticket.status,
            priority: ticket.priority,
            assigned_to: ticket.assigned_to,
            resolved_by: ticket.resolved_by,
            created_at: ticket.created_at,
            updated_at: ticket.updated_at,
            resolved_at: ticket.resolved_at,
            closed_at: ticket.closed_at,
            admin_response: ticket.admin_response,
            resolution_notes: ticket.resolution_notes,
            metadata: ticket.metadata || {}
        };

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
