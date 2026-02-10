import { NextRequest } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';

import { getAuthenticatedUser } from '@/lib/auth';
import prisma, { queryRawTenantScoped } from '@/lib/prisma';
import { APIError, getWorkspaceOrThrow } from '@/lib/server/api-workspace';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { isTenantAdminRole } from '@/lib/constants/roles';
import type { SupportTicketEvent } from '@/types';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
import { asObject } from '@/lib/shared/unknown';

const IS_PROD = process.env.NODE_ENV === 'production';

function toIsoString(input: unknown): string {
  if (input instanceof Date) return input.toISOString();
  if (typeof input === 'string') return input;
  return new Date().toISOString();
}

type EventRow = {
  id: unknown;
  ticket_id: unknown;
  tenant_id: unknown;
  actor_id: unknown;
  action: unknown;
  content: unknown;
  metadata: unknown;
  created_at: unknown;
};

function normalizeEvent(row: EventRow): SupportTicketEvent {
  const md = asObject(row.metadata) ?? {};
  const action = String(row.action || 'updated') as SupportTicketEvent['action'];
  return {
    id: String(row.id || ''),
    ticket_id: String(row.ticket_id || ''),
    tenant_id: row.tenant_id ? String(row.tenant_id) : undefined,
    actor_id: row.actor_id ? String(row.actor_id) : undefined,
    action,
    content: row.content == null ? null : String(row.content),
    metadata: md,
    created_at: toIsoString(row.created_at),
  };
}

async function resolveActorNames(actorIds: string[]): Promise<Record<string, string>> {
  const ids = Array.from(new Set(actorIds.map((x) => String(x || '').trim()).filter(Boolean)));
  if (ids.length === 0) return {};

  const result: Record<string, string> = {};

  try {
    const clerk = await clerkClient();
    for (const id of ids) {
      try {
        const user = await clerk.users.getUser(id);
        const first = user?.firstName ? String(user.firstName).trim() : '';
        const last = user?.lastName ? String(user.lastName).trim() : '';
        const full = `${first} ${last}`.trim();
        const email = user?.emailAddresses?.[0]?.emailAddress ? String(user.emailAddresses[0].emailAddress) : '';
        result[id] = full || email || id;
      } catch {
        result[id] = id;
      }
    }
  } catch {
    return result;
  }

  return result;
}

async function GETHandler(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthenticatedUser();
    const { workspaceId } = await getWorkspaceOrThrow(request);
    const { id: ticketId } = params;

    if (!ticketId) {
      return apiError('Ticket ID is required', { status: 400 });
    }

    const ticket = await prisma.scale_support_tickets.findUnique({ where: { id: String(ticketId) } });
    if (!ticket) {
      return apiError('קריאת תמיכה לא נמצאה', { status: 404 });
    }

    if (String(ticket.tenant_id || '') !== String(workspaceId)) {
      return apiError('Forbidden', { status: 403 });
    }

    const isAdmin = user.isSuperAdmin || isTenantAdminRole(user.role);
    if (!isAdmin && String(ticket.user_id) !== String(user.id)) {
      return apiError('Forbidden', { status: 403 });
    }

    let rows: EventRow[] = [];
    try {
      rows = await queryRawTenantScoped<EventRow[]>(prisma, {
        tenantId: String(workspaceId),
        reason: 'support_ticket_events_list',
        query:
          'select id, ticket_id, tenant_id, actor_id, action, content, metadata, created_at from support_ticket_events where tenant_id = $1 and ticket_id = $2 order by created_at asc limit 500',
        values: [String(workspaceId), String(ticketId)],
      });
    } catch {
      const legacyRows = await queryRawTenantScoped<Omit<EventRow, 'content'>[]>(prisma, {
        tenantId: String(workspaceId),
        reason: 'support_ticket_events_list_legacy',
        query:
          'select id, ticket_id, tenant_id, actor_id, action, metadata, created_at from support_ticket_events where tenant_id = $1 and ticket_id = $2 order by created_at asc limit 500',
        values: [String(workspaceId), String(ticketId)],
      });
      rows = (Array.isArray(legacyRows) ? legacyRows : []).map((r) => {
        const next: EventRow = { ...r, content: null };
        return next;
      });
    }

    const events = (Array.isArray(rows) ? rows : []).map(normalizeEvent);

    const actorIds = events.map((e) => e.actor_id).filter((x): x is string => Boolean(x));
    const actorNames = await resolveActorNames(actorIds);

    const enriched = events.map((e) => ({
      ...e,
      metadata: {
        ...(e.metadata || {}),
        actor_name: (e.actor_id && actorNames[e.actor_id]) || (e.metadata?.actor_name as string) || null,
      },
    }));

    return apiSuccess({ events: enriched });
  } catch (error: unknown) {
    if (IS_PROD) console.error('[API] Error in /api/support/[id]/events GET');
    else console.error('[API] Error in /api/support/[id]/events GET:', error);
    if (error instanceof APIError) {
      return apiError(error, { status: error.status, message: error.message || 'Forbidden' });
    }
    const safeMsg = 'שגיאה בטעינת היסטוריית הקריאה';
    return apiError(IS_PROD ? safeMsg : error, {
      status: 500,
      message: safeMsg,
    });
  }
}

export const GET = shabbatGuard(GETHandler);
