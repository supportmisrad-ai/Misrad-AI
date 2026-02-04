/**
 * API Route: Support Ticket by ID
 * PATCH /api/support/[id] - Update support ticket (status, assignment, response)
 */

import { NextRequest } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { getAuthenticatedUser } from '../../../../lib/auth';
import prisma, { executeRawTenantScoped } from '@/lib/prisma';
import { Priority, SupportTicket, SupportTicketCategory, SupportTicketStatus } from '../../../../types';
import { isTenantAdminRole } from '@/lib/constants/roles';
import { APIError, getWorkspaceOrThrow } from '@/lib/server/api-workspace';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { sendSupportTicketReplyEmail } from '@/lib/email';
import { getSystemEmailSettingsUnsafe } from '@/lib/server/systemEmailSettings';
import { sendWebPushNotificationToEmails } from '@/lib/server/web-push';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

function toIsoString(input: any): string | undefined {
    if (!input) return undefined;
    if (input instanceof Date) return input.toISOString();
    if (typeof input === 'string') return input;
    return undefined;
}

function formatStatusLabel(s: string): string {
    if (s === 'open') return 'open';
    if (s === 'in_progress') return 'in_progress';
    if (s === 'resolved') return 'resolved';
    if (s === 'closed') return 'closed';
    return String(s || '');
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

function minutesBetween(from: unknown, to: Date): number | null {
    const d = from instanceof Date ? from : null;
    if (!d) return null;
    const diffMs = to.getTime() - d.getTime();
    if (!Number.isFinite(diffMs)) return null;
    return Math.max(0, Math.round(diffMs / 60000));
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

async function PATCHHandler(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getAuthenticatedUser();

        const { workspaceId, orgKey } = await getWorkspaceOrThrow(request);

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

        const existingTicketMeta = existingTicket as typeof existingTicket & {
            handled_at?: Date | null;
            read_at?: Date | null;
        };
        if (String(existingTicket.tenant_id || '') !== String(workspaceId)) {
            return apiError('Forbidden', { status: 403 });
        }

        // Check permissions
        const isAdmin = user.isSuperAdmin || isTenantAdminRole(user.role);
        const isOwner = existingTicket.user_id === user.id;

        // Only owner or admin can update
        if (!isAdmin && !isOwner) {
            return apiError('אין הרשאה לעדכן קריאת תמיכה זו', { status: 403 });
        }

        const body = await request.json();
        const { status, priority, assigned_to, admin_response, comment, resolution_notes, read_at, send_email } = body;

        // Build update data
        const updateData: any = {};
        const now = new Date();
        const eventsToWrite: Array<{ action: string; metadata: Record<string, unknown> }> = [];

        const commentText = typeof comment === 'string' ? comment.trim() : '';

        // Only admins can change status, assign, or add responses
        if (isAdmin) {
            if (status) {
                const validStatuses = ['open', 'in_progress', 'waiting_for_customer', 'resolved', 'closed'];
                if (validStatuses.includes(status)) {
                    updateData.status = status;
                    if (status === 'resolved' && !existingTicket.resolved_by) {
                        updateData.resolved_by = user.id;
                    }
                    if (['in_progress', 'resolved', 'closed'].includes(status) && !existingTicketMeta.handled_at) {
                        updateData.handled_at = now;
                    }

                    if (status === 'resolved' && !(existingTicket as any)?.resolved_at) {
                        updateData.resolved_at = now;
                    }
                    if (status === 'closed' && !(existingTicket as any)?.closed_at) {
                        updateData.closed_at = now;
                    }

                    if ((status === 'resolved' || status === 'closed') && (existingTicket as any)?.resolution_time_minutes == null) {
                        const mins = minutesBetween((existingTicket as any)?.created_at ?? null, now);
                        if (mins != null) updateData.resolution_time_minutes = mins;
                    }

                    if (String(existingTicket.status || '') !== String(status)) {
                        eventsToWrite.push({
                            action: 'status_changed',
                            metadata: {
                                from: existingTicket.status,
                                to: status,
                                description: `Status changed from ${formatStatusLabel(String(existingTicket.status || ''))} to ${formatStatusLabel(String(status || ''))}`,
                            },
                        });
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
                if (admin_response && !existingTicketMeta.handled_at) {
                    updateData.handled_at = now;
                }

                const prev = String((existingTicket as any)?.admin_response || '').trim();
                const next = String(admin_response || '').trim();
                if (next && !prev) {
                    if (!(existingTicket as any)?.first_response_at) {
                        updateData.first_response_at = now;
                    }
                    eventsToWrite.push({
                        action: 'admin_replied',
                        metadata: {
                            via: send_email ? 'email+portal' : 'portal',
                        },
                    });
                } else if (next && prev && next !== prev) {
                    eventsToWrite.push({
                        action: 'admin_replied',
                        metadata: {
                            via: send_email ? 'email+portal' : 'portal',
                            edited: true,
                        },
                    });
                }
            }
            if (resolution_notes !== undefined) {
                updateData.resolution_notes = resolution_notes;
            }
            if (read_at === true && !existingTicketMeta.read_at) {
                updateData.read_at = now;
                eventsToWrite.push({ action: 'marked_read', metadata: {} });
            }

            if (commentText) {
                if (!updateData.status) {
                    updateData.status = 'waiting_for_customer';
                }
                if (!existingTicketMeta.handled_at) {
                    updateData.handled_at = now;
                }
                if (!(existingTicket as any)?.first_response_at) {
                    updateData.first_response_at = now;
                }
            }
        }

        // Users can only update their own open tickets (subject/message)
        if (isOwner && existingTicket.status === 'open') {
            if (body.subject) updateData.subject = body.subject;
            if (body.message) updateData.message = body.message;

            if (body.subject || body.message) {
                eventsToWrite.push({
                    action: 'updated',
                    metadata: {
                        fields: {
                            subject: body.subject ? true : false,
                            message: body.message ? true : false,
                        },
                    },
                });
            }
        }

        if (!isAdmin && isOwner && commentText) {
            const current = String(existingTicket.status || 'open');
            const nextStatus = current === 'closed' || current === 'resolved' ? 'open' : 'in_progress';
            if (!updateData.status && current !== nextStatus) {
                updateData.status = nextStatus;
            }
        }

        if (
            updateData.status &&
            String(existingTicket.status || '') !== String(updateData.status) &&
            !eventsToWrite.some((e) => e.action === 'status_changed')
        ) {
            eventsToWrite.push({
                action: 'status_changed',
                metadata: {
                    from: existingTicket.status,
                    to: updateData.status,
                    description: `Status changed from ${formatStatusLabel(String(existingTicket.status || ''))} to ${formatStatusLabel(String(updateData.status || ''))}`,
                },
            });
        }

        if (Object.keys(updateData).length === 0) {
            return apiError('אין שינויים לעדכן', { status: 400 });
        }

        updateData.last_updated_by = user.id;
        updateData.updated_at = now;

        // Update ticket
        const updatedTicket = await prisma.scale_support_tickets.update({
            where: { id: String(ticketId) },
            data: updateData,
        });

        const transformedTicket: SupportTicket = normalizeTicket(updatedTicket);

        for (const ev of eventsToWrite) {
            await insertTicketEvent({
                workspaceId,
                ticketId: transformedTicket.id,
                actorId: user.id,
                action: ev.action,
                content: null,
                metadata: ev.metadata,
            });
        }

        if (commentText) {
            await insertTicketEvent({
                workspaceId,
                ticketId: transformedTicket.id,
                actorId: user.id,
                action: 'COMMENT',
                content: commentText,
                metadata: {
                    role: isAdmin ? 'admin' : 'customer',
                },
            });
        }

        if (isAdmin && commentText && send_email) {
            const userEmail = await resolveUserEmail(String(existingTicket.user_id));
            if (userEmail) {
                await sendSupportTicketReplyEmail({
                    toEmail: userEmail,
                    name: null,
                    ticketNumber: transformedTicket.ticket_number,
                    subject: transformedTicket.subject,
                    reply: commentText,
                    orgSlug: String(orgKey || workspaceId),
                });
            }
        }

        if (!isAdmin && commentText) {
            try {
                const settings = await getSystemEmailSettingsUnsafe();
                const recipients = splitRecipients(settings.supportEmail);
                if (recipients.length) {
                    await sendWebPushNotificationToEmails({
                        organizationId: String(workspaceId),
                        emails: recipients,
                        payload: {
                            title: 'תגובה חדשה לדיווח תקלה',
                            body: `${transformedTicket.ticket_number} · ${transformedTicket.subject}`,
                            url: '/app/admin/client/support',
                            tag: `support-ticket-${transformedTicket.id}`,
                            category: 'system',
                        },
                    });
                }
            } catch {
            }
        }

        if (isAdmin && admin_response && send_email) {
            const userEmail = await resolveUserEmail(String(existingTicket.user_id));
            if (userEmail) {
                await sendSupportTicketReplyEmail({
                    toEmail: userEmail,
                    name: null,
                    ticketNumber: transformedTicket.ticket_number,
                    subject: transformedTicket.subject,
                    reply: String(admin_response),
                    orgSlug: String(orgKey || workspaceId),
                });
            }
        }

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
