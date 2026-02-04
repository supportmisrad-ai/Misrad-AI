/**
 * API Route: Support Tickets
 * GET /api/support - Get support tickets
 * POST /api/support - Create new support ticket
 */

import { NextRequest } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { getAuthenticatedUser, requirePermission } from '../../../lib/auth';
import { Priority, SupportTicket, SupportTicketCategory, SupportTicketStatus } from '../../../types';
import { isTenantAdminRole } from '@/lib/constants/roles';
import { APIError, getWorkspaceOrThrow } from '@/lib/server/api-workspace';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import prisma, { executeRawTenantScoped } from '@/lib/prisma';
import { randomUUID } from 'crypto';
import { sendSupportTicketAdminNotificationEmail, sendSupportTicketReceivedEmail } from '@/lib/email';
import { getSystemEmailSettingsUnsafe } from '@/lib/server/systemEmailSettings';
import { sendWebPushNotificationToEmails } from '@/lib/server/web-push';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

function toIsoString(input: any): string | undefined {
    if (!input) return undefined;
    if (input instanceof Date) return input.toISOString();
    if (typeof input === 'string') return input;
    return undefined;
}

function computeSlaPolicy(category: string): { hours: number; priority: string } {
    const c = String(category || '').trim().toLowerCase();
    if (c === 'tech' || c === 'technical' || c === 'bug') return { hours: 4, priority: 'high' };
    if (c === 'billing' || c === 'account') return { hours: 24, priority: 'medium' };
    if (c === 'feature' || c === 'other') return { hours: 72, priority: 'low' };
    return { hours: 24, priority: 'medium' };
}

function normalizeMetadata(input: any): Record<string, unknown> | undefined {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return undefined;
    return input as Record<string, unknown>;
}

const SUPPORT_TICKET_CATEGORIES: SupportTicketCategory[] = ['Tech', 'Account', 'Billing', 'Feature'];
const SUPPORT_TICKET_STATUSES: SupportTicketStatus[] = ['open', 'in_progress', 'waiting_for_customer', 'resolved', 'closed'];

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
        read_at: toIsoString(ticket.read_at),
        handled_at: toIsoString(ticket.handled_at),
        sla_deadline: toIsoString(ticket.sla_deadline),
        first_response_at: toIsoString(ticket.first_response_at),
        resolution_time_minutes: typeof ticket.resolution_time_minutes === 'number' ? ticket.resolution_time_minutes : undefined,
        last_updated_by: ticket.last_updated_by ? String(ticket.last_updated_by) : undefined,
        admin_response: ticket.admin_response ? String(ticket.admin_response) : undefined,
        resolution_notes: ticket.resolution_notes ? String(ticket.resolution_notes) : undefined,
        metadata: normalizeMetadata(ticket.metadata) ?? {},
    };
}

async function insertTicketEvent(params: {
    workspaceId: string;
    ticketId: string;
    actorId: string;
    action: string;
    content?: string | null;
    metadata: Record<string, unknown>;
}) {
    try {
        await executeRawTenantScoped(prisma, {
            tenantId: String(params.workspaceId),
            reason: 'support_ticket_event_insert',
            query:
                'insert into support_ticket_events (ticket_id, tenant_id, actor_id, action, content, metadata) values ($1, $2, $3, $4, $5, $6::jsonb)',
            values: [
                String(params.ticketId),
                String(params.workspaceId),
                String(params.actorId),
                String(params.action),
                params.content == null ? null : String(params.content),
                JSON.stringify(params.metadata ?? {}),
            ],
        });
    } catch (error) {
        try {
            await executeRawTenantScoped(prisma, {
                tenantId: String(params.workspaceId),
                reason: 'support_ticket_event_insert_legacy',
                query:
                    'insert into support_ticket_events (ticket_id, tenant_id, actor_id, action, metadata) values ($1, $2, $3, $4, $5::jsonb)',
                values: [
                    String(params.ticketId),
                    String(params.workspaceId),
                    String(params.actorId),
                    String(params.action),
                    JSON.stringify(params.metadata ?? {}),
                ],
            });
        } catch {
            console.warn('[support][events] insert failed', error);
        }
    }
}

function splitRecipients(input: string | null | undefined): string[] {
    return String(input || '')
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);
}

async function resolveUserEmail(userId: string): Promise<string | null> {
    try {
        const clerk = await clerkClient();
        const user = await clerk.users.getUser(userId);
        const email = user?.emailAddresses?.[0]?.emailAddress ? String(user.emailAddresses[0].emailAddress) : null;
        return email ? email.trim() : null;
    } catch {
        return null;
    }
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

        const { workspaceId, orgKey } = await getWorkspaceOrThrow(request);
        
        const body = await request.json();
        const { category, subject, message, priority, screenshot_url } = body;

        // Validate required fields
        if (!category || !subject || !message) {
            return apiError('נא למלא את כל השדות החובה: נושא, כותרת ופירוט', { status: 400 });
        }

        const screenshotUrl = screenshot_url ? String(screenshot_url).trim() : '';
        const cleanMessage = String(message).trim();
        const minDetailedChars = 120;
        if (!screenshotUrl && cleanMessage.length < minDetailedChars) {
            return apiError('נא לצרף צילום מסך (קישור) או לתאר את התקלה בצורה מפורטת יותר', { status: 400 });
        }

        // Validate category
        const validCategories = ['Tech', 'Account', 'Billing', 'Feature'];
        if (!validCategories.includes(category)) {
            return apiError('קטגוריה לא תקינה', { status: 400 });
        }

        // Create ticket
        const sla = computeSlaPolicy(String(category));
        const computedPriority = priority || sla.priority;
        const now = new Date();

        const ticketData = {
            user_id: user.id,
            tenant_id: workspaceId,
            category: category,
            subject: subject.trim(),
            message: cleanMessage,
            priority: computedPriority,
            status: 'open',
            last_updated_by: user.id,
            sla_deadline: new Date(now.getTime() + sla.hours * 60 * 60 * 1000),
            metadata: screenshotUrl ? { screenshot_url: screenshotUrl } : {},
            ticket_number: `TKT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${randomUUID().slice(0, 8)}`
        };

        const ticket = await prisma.scale_support_tickets.create({
            data: ticketData as any,
        });

        const transformedTicket: SupportTicket = normalizeTicket(ticket);

        await insertTicketEvent({
            workspaceId,
            ticketId: transformedTicket.id,
            actorId: user.id,
            action: 'created',
            content: null,
            metadata: {
                ticket_number: transformedTicket.ticket_number,
                category: transformedTicket.category,
                subject: transformedTicket.subject,
                description: 'Ticket created',
            },
        });

        await insertTicketEvent({
            workspaceId,
            ticketId: transformedTicket.id,
            actorId: user.id,
            action: 'COMMENT',
            content: cleanMessage,
            metadata: {
                role: 'customer',
                kind: 'initial_report',
                ...(screenshotUrl ? { screenshot_url: screenshotUrl } : {}),
            },
        });

        const userEmail = await resolveUserEmail(String(user.id));
        if (userEmail) {
            await sendSupportTicketReceivedEmail({
                toEmail: userEmail,
                name: [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || null,
                ticketNumber: transformedTicket.ticket_number,
                subject: transformedTicket.subject,
                message: transformedTicket.message,
                orgSlug: String(orgKey || workspaceId),
            });
        }

        await sendSupportTicketAdminNotificationEmail({
            ticketNumber: transformedTicket.ticket_number,
            subject: transformedTicket.subject,
            message: transformedTicket.message,
            orgSlug: String(orgKey || workspaceId),
            requesterName: [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || null,
            requesterEmail: userEmail,
        });

        try {
            const settings = await getSystemEmailSettingsUnsafe();
            const recipients = splitRecipients(settings.supportEmail);
            if (recipients.length) {
                await sendWebPushNotificationToEmails({
                    organizationId: String(workspaceId),
                    emails: recipients,
                    payload: {
                        title: 'דיווח תקלה חדש',
                        body: `${transformedTicket.ticket_number} · ${transformedTicket.subject}`,
                        url: '/app/admin/client/support',
                        tag: `support-ticket-${transformedTicket.id}`,
                        category: 'system',
                    },
                });
            }
        } catch {
        }

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
