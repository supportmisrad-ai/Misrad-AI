'use server';

import { revalidatePath } from 'next/cache';
import { logger } from '@/lib/server/logger';
import prisma from '@/lib/prisma';
import { createClientForWorkspace } from '@/app/actions/clients';
import { auth } from '@clerk/nextjs/server';
import { requireOrganizationId } from '@/lib/tenant-isolation';
import { Prisma } from '@prisma/client';
import type { SystemCalendarEvent, SystemLead, SystemLeadActivity } from '@prisma/client';
import type { Client } from '@/types/social';
import { withWorkspaceTenantContext } from '@/lib/server/workspace-tenant-context';

import { asObjectLoose as asObject, getUnknownErrorMessage } from '@/lib/shared/unknown';
import { insertMisradNotificationsForOrganizationId } from '@/lib/services/system/notifications';
import { ALLOW_SCHEMA_FALLBACKS, isSchemaMismatchError, reportSchemaFallback } from '@/lib/server/schema-fallbacks';
import {
  decodeSystemLeadsCursor,
  encodeSystemLeadsCursor,
  parseFollowUpDateFromHebrew,
} from '@/lib/server/system-leads-utils';
import {
  toLeadDto,
  toActivityDto,
  normalizeAddress,
  loadLeadDtoWithActivities,
  computeLeadAiScore,
  persistAiScore,
} from '@/lib/services/system/leads-service';

// Direct type re-exports to avoid Turbopack cache issues
export type SystemLeadDTO = {
  id: string;
  organization_id: string;
  name: string;
  company: string | null;
  phone: string;
  email: string | null;
  installation_address: string | null;
  source: string;
  status: string;
  value: number;
  last_contact: string;
  created_at: string;
  is_hot: boolean;
  score: number;
  assigned_agent_id: string | null;
  product_interest?: string | null;
  ai_tags?: string[];
  closure_probability?: number | null;
  closure_rationale?: string | null;
  recommended_action?: string | null;
  next_action_date?: string | null;
  next_action_date_suggestion?: string | null;
  next_action_note?: string | null;
  next_action_date_rationale?: string | null;
  activities?: SystemLeadActivityDTO[];
};

export type SystemLeadActivityDTO = {
  id: string;
  lead_id: string;
  type: string;
  content: string;
  timestamp: string;
  metadata?: unknown;
  direction: string | null;
};

type SystemLeadRow = SystemLead & { activities?: SystemLeadActivity[] };

function toDto(row: SystemLeadRow): SystemLeadDTO {
  return toLeadDto(row);
}

async function upsertCanonicalClientByEmail(params: {
  orgSlug: string;
  organizationId: string;
  clerkUserId: string;
  email: string;
  fullName: string;
  companyName: string;
  phone?: string | null;
}): Promise<{ canonicalClientId: string | null }> {
  const organizationId = params.organizationId;
  const normalizedEmail = String(params.email || '').trim().toLowerCase();

  if (!normalizedEmail) {
    return { canonicalClientId: null };
  }

  let existing: { id?: string } | null = null;
  let findError: unknown = null;
  try {
    existing = await prisma.clients.findFirst({
      where: {
        organization_id: String(organizationId),
        email: {
          equals: normalizedEmail,
          mode: 'insensitive',
        },
      },
      select: { id: true },
    });
  } catch (e: unknown) {
    if (isSchemaMismatchError(e) && !ALLOW_SCHEMA_FALLBACKS) {
      throw new Error(`[SchemaMismatch] clients lookup failed (${getUnknownErrorMessage(e) || 'missing relation'})`);
    }

    if (isSchemaMismatchError(e) && ALLOW_SCHEMA_FALLBACKS) {
      reportSchemaFallback({
        source: 'app/actions/system-leads.upsertCanonicalClientByEmail',
        reason: 'clients lookup schema mismatch (fallback to createClientForWorkspace dedupe)',
        error: e,
        extras: { organizationId, email: normalizedEmail },
      });
    }
    findError = e;
  }

  if (findError) {
    const findErrorObj = asObject(findError);
    const code = findErrorObj?.code;
    const details = findErrorObj?.details;
    logger.error('system-leads', 'failed to find existing canonical client', {
      message: findError instanceof Error ? findError.message : String(findErrorObj?.message || ''),
      code: typeof code === 'string' ? code : undefined,
      details: typeof details === 'string' ? details : undefined,
    });
    // Continue: fallback to createClientForWorkspace (which has its own dedupe).
  }

  // Use canonical action to ensure consistent schema + dedupe rules.
  // We pass orgSlug and use orgSlug as source of truth.
  const clientPayload: Partial<Client> = {
    name: params.fullName,
    companyName: params.companyName,
    email: normalizedEmail,
    phone: params.phone ?? undefined,
    status: 'Active',
    onboardingStatus: 'completed',
    postingRhythm: '3 פעמים בשבוע',
    brandVoice: '',
    dna: {
      brandSummary: '',
      voice: { formal: 50, funny: 50, length: 50 },
      vocabulary: { loved: [], forbidden: [] },
      colors: { primary: '#1e293b', secondary: '#334155' },
    },
    activePlatforms: [],
    quotas: [],
    credentials: [],
    autoRemindersEnabled: true,
    businessMetrics: {
      timeSpentMinutes: 0,
      expectedHours: 0,
      punctualityScore: 100,
      responsivenessScore: 100,
      revisionCount: 0,
    },
  };

  const result = await createClientForWorkspace(
    params.orgSlug,
    clientPayload,
    params.clerkUserId
  );

  if (result.success && result.data?.id) {
    return { canonicalClientId: String(result.data.id) };
  }

  if (existing?.id) {
    return { canonicalClientId: String(existing.id) };
  }

  logger.error('system-leads', 'failed to upsert canonical client', {
    error: result.error,
  });

  return { canonicalClientId: null };
}

export async function getSystemLeads(orgSlug: string): Promise<SystemLeadDTO[]> {
  const res = await getSystemLeadsPage({ orgSlug, pageSize: 200 });
  if (!res.success) {
    throw new Error(res.error || 'שגיאה בטעינת לידים');
  }
  return res.data.leads;
}

export async function getSystemCalendarEventsRange(params: {
  orgSlug: string;
  from: string;
  to: string;
  take?: number;
}): Promise<SystemCalendarEventDTO[]> {
  return await withWorkspaceTenantContext(
    params.orgSlug,
    async ({ organizationId }) => {
      requireOrganizationId('getSystemCalendarEventsRange', organizationId);

      const fromRaw = String(params.from || '').trim();
      const toRaw = String(params.to || '').trim();
      if (!fromRaw || !toRaw) return [];

      const fromDate = new Date(fromRaw);
      const toDate = new Date(toRaw);
      if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) return [];

      const take = Math.max(1, Math.min(200, Math.floor(params.take ?? 200)));

      // Prefer occursAt (indexed), but include legacy rows where occursAt is null and date is in range.
      // `date` is stored as ISO YYYY-MM-DD so lexical comparisons are safe.
      const fromDateStr = fromDate.toISOString().slice(0, 10);
      const toDateStr = toDate.toISOString().slice(0, 10);

      try {
        const where: Prisma.SystemCalendarEventWhereInput = {
          organizationId,
          OR: [
            { occursAt: { gte: fromDate, lt: toDate } },
            { occursAt: null, date: { gte: fromDateStr, lt: toDateStr } },
          ],
        };

        const rows = await prisma.systemCalendarEvent.findMany({
          where,
          select: SYSTEM_CALENDAR_EVENT_SELECT,
          orderBy: { createdAt: 'desc' },
          take,
        });

        return rows.map(toCalendarEventDto);
      } catch (e: unknown) {
        if (isSchemaMismatchError(e) && !ALLOW_SCHEMA_FALLBACKS) {
          throw new Error(
            `[SchemaMismatch] systemCalendarEvent query failed (${getUnknownErrorMessage(e) || 'missing relation'})`
          );
        }

        if (isSchemaMismatchError(e) && ALLOW_SCHEMA_FALLBACKS) {
          reportSchemaFallback({
            source: 'app/actions/system-leads.getSystemCalendarEventsRange',
            reason: 'systemCalendarEvent query schema mismatch (fallback to legacy date filter)',
            error: e,
            extras: { organizationId, from: fromDateStr, to: toDateStr },
          });
        }
        logger.error('system-leads', 'getSystemCalendarEventsRange failed; fallback to legacy date filter', e);
        const rows = await prisma.systemCalendarEvent.findMany({
          where: {
            organizationId,
            date: { gte: fromDateStr, lt: toDateStr },
          },
          select: SYSTEM_CALENDAR_EVENT_SELECT,
          orderBy: { createdAt: 'desc' },
          take,
        });

        return rows.map(toCalendarEventDto);
      }
    },
    { source: 'server_actions_system_leads', reason: 'getSystemCalendarEventsRange' }
  );
}

export type SystemLeadUserRole = 'admin' | 'agent';

export async function getSystemLeadsPage(params: {
  orgSlug: string;
  cursor?: string | null;
  pageSize?: number;
}): Promise<
  | { success: true; data: { leads: SystemLeadDTO[]; nextCursor: string | null; hasMore: boolean; userRole: SystemLeadUserRole; currentUserId: string | null } }
  | { success: false; error: string }
> {
  try {
    const orgSlug = String(params.orgSlug || '').trim();
    if (!orgSlug) return { success: false, error: 'orgSlug חסר' };

    return await withWorkspaceTenantContext(
      orgSlug,
      async ({ organizationId }) => {
        requireOrganizationId('getSystemLeadsPage', organizationId);

        // Resolve current user role for RBAC filtering
        const { userId: clerkUserId } = await auth();
        let userRole: SystemLeadUserRole = 'agent';
        let currentNexusUserId: string | null = null;

        if (clerkUserId) {
          const orgUser = await prisma.organizationUser.findUnique({
            where: { clerk_user_id: clerkUserId },
            select: { id: true, role: true },
          });
          if (orgUser) {
            currentNexusUserId = orgUser.id;
            const role = String(orgUser.role || '').toLowerCase();
            if (['super_admin', 'admin', 'owner'].includes(role)) {
              userRole = 'admin';
            }
          }
        }

        const pageSize = Math.min(200, Math.max(1, Math.floor(params.pageSize ?? 60)));
        const cursor = decodeSystemLeadsCursor(params.cursor);

        const agentFilter: Prisma.SystemLeadWhereInput =
          userRole === 'agent' && currentNexusUserId
            ? { OR: [{ assignedAgentId: currentNexusUserId }, { assignedAgentId: null }] }
            : {};

        const cursorFilter: Prisma.SystemLeadWhereInput = cursor
          ? {
              OR: [
                { createdAt: { lt: new Date(cursor.createdAt) } },
                { createdAt: { equals: new Date(cursor.createdAt) }, id: { lt: cursor.id } },
              ],
            }
          : {};

        const where: Prisma.SystemLeadWhereInput = {
          organizationId,
          AND: [agentFilter, cursorFilter].filter((f) => Object.keys(f).length > 0),
        };

        const rows = await prisma.systemLead.findMany({
          where,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: pageSize + 1,
        });

        const list = Array.isArray(rows) ? rows : [];
        const hasMore = list.length > pageSize;
        const trimmed = hasMore ? list.slice(0, pageSize) : list;

        const leads = trimmed.map((r) => toDto(r));

        const last = trimmed[trimmed.length - 1];
        const lastCreatedAt = last?.createdAt ? new Date(last.createdAt) : last?.lastContact ? new Date(last.lastContact) : null;
        const nextCursor =
          hasMore && last?.id && lastCreatedAt && !Number.isNaN(lastCreatedAt.getTime())
            ? encodeSystemLeadsCursor({ createdAt: lastCreatedAt.toISOString(), id: String(last.id) })
            : null;

        return { success: true, data: { leads, nextCursor, hasMore, userRole, currentUserId: currentNexusUserId } };
      },
      { source: 'server_actions_system_leads', reason: 'getSystemLeadsPage' }
    );
  } catch (e: unknown) {
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בטעינת לידים' };
  }
}

export type SystemCalendarEventDTO = {
  id: string;
  lead_id: string | null;
  title: string;
  lead_name: string;
  lead_company: string;
  day_name: string;
  date: string;
  time: string;
  type: string;
  location: string;
  participants: number | null;
  reminders: Prisma.JsonValue | null;
  post_meeting: Prisma.JsonValue | null;
};

 type SystemCalendarEventRow = Pick<
   SystemCalendarEvent,
   | 'id'
   | 'leadId'
   | 'title'
   | 'leadName'
   | 'leadCompany'
   | 'dayName'
   | 'date'
   | 'time'
   | 'type'
   | 'location'
   | 'participants'
   | 'reminders'
   | 'postMeeting'
 >;

 const SYSTEM_CALENDAR_EVENT_SELECT: Prisma.SystemCalendarEventSelect = {
   id: true,
   leadId: true,
   title: true,
   leadName: true,
   leadCompany: true,
   dayName: true,
   date: true,
   time: true,
   type: true,
   location: true,
   participants: true,
   reminders: true,
   postMeeting: true,
 };

function toCalendarEventDto(row: SystemCalendarEventRow): SystemCalendarEventDTO {
  return {
    id: String(row.id),
    lead_id: row.leadId ? String(row.leadId) : null,
    title: String(row.title || ''),
    lead_name: String(row.leadName || ''),
    lead_company: String(row.leadCompany || ''),
    day_name: String(row.dayName || ''),
    date: String(row.date || ''),
    time: String(row.time || ''),
    type: String(row.type || ''),
    location: String(row.location || ''),
    participants: row.participants == null ? null : Number(row.participants),
    reminders: row.reminders ?? null,
    post_meeting: row.postMeeting ?? null,
  };
}

export async function getSystemCalendarEvents(params: {
  orgSlug: string;
  take?: number;
}): Promise<SystemCalendarEventDTO[]> {
  return await withWorkspaceTenantContext(
    params.orgSlug,
    async ({ organizationId }) => {
      requireOrganizationId('getSystemCalendarEvents', organizationId);
      const take = Math.max(1, Math.min(200, Math.floor(params.take ?? 200)));

      try {
        const rows = await prisma.systemCalendarEvent.findMany({
          where: { organizationId },
          select: SYSTEM_CALENDAR_EVENT_SELECT,
          orderBy: { createdAt: 'desc' },
          take,
        });
        return rows.map(toCalendarEventDto);
      } catch (e: unknown) {
        if (isSchemaMismatchError(e) && !ALLOW_SCHEMA_FALLBACKS) {
          throw new Error(
            `[SchemaMismatch] systemCalendarEvent query failed (${getUnknownErrorMessage(e) || 'missing relation'})`
          );
        }

        if (isSchemaMismatchError(e) && ALLOW_SCHEMA_FALLBACKS) {
          reportSchemaFallback({
            source: 'app/actions/system-leads.getSystemCalendarEvents',
            reason: 'systemCalendarEvent query schema mismatch (fallback retry)',
            error: e,
            extras: { organizationId, take },
          });
        }

        // Backwards-compatible fallback for DBs that don't have occurs_at yet.
        const rows = await prisma.systemCalendarEvent.findMany({
          where: { organizationId },
          select: SYSTEM_CALENDAR_EVENT_SELECT,
          orderBy: { createdAt: 'desc' },
          take,
        });
        return rows.map(toCalendarEventDto);
      }
    },
    { source: 'server_actions_system_leads', reason: 'getSystemCalendarEvents' }
  );
}

export async function createSystemCalendarEvent(params: {
  orgSlug: string;
  leadId?: string | null;
  title: string;
  leadName: string;
  leadCompany: string;
  dayName: string;
  date: string;
  time: string;
  type: string;
  location: string;
  participants?: number | null;
  reminders?: Prisma.InputJsonValue | null;
  postMeeting?: Prisma.InputJsonValue | null;
}): Promise<{ ok: true; event: SystemCalendarEventDTO } | { ok: false; message: string }> {
  try {
    return await withWorkspaceTenantContext(
      params.orgSlug,
      async ({ organizationId }) => {
        requireOrganizationId('createSystemCalendarEvent', organizationId);

        const title = String(params.title || '').trim();
        const leadName = String(params.leadName || '').trim();
        const leadCompany = String(params.leadCompany || '').trim();
        const dayName = String(params.dayName || '').trim();
        const date = String(params.date || '').trim();
        const time = String(params.time || '').trim();
        const type = String(params.type || '').trim();
        const location = String(params.location || '').trim();

        if (!title) return { ok: false, message: 'חובה להזין כותרת' };
        if (!date) return { ok: false, message: 'חובה להזין תאריך' };
        if (!time) return { ok: false, message: 'חובה להזין שעה' };

        const leadId = params.leadId ? String(params.leadId).trim() : null;
        if (leadId) {
          const lead = await prisma.systemLead.findFirst({ where: { id: leadId, organizationId }, select: { id: true } });
          if (!lead?.id) return { ok: false, message: 'Lead not found' };
        }

        let occursAt: Date | null = null;
        try {
          if (/^\d{4}-\d{2}-\d{2}$/.test(date) && /^\d{1,2}:\d{2}$/.test(time)) {
            const iso = `${date}T${time.length === 4 ? `0${time}` : time}:00.000Z`;
            const parsed = new Date(iso);
            occursAt = Number.isNaN(parsed.getTime()) ? null : parsed;
          }
        } catch {
          occursAt = null;
        }

        let created: SystemCalendarEventRow;
        try {
          created = await prisma.systemCalendarEvent.create({
            data: {
              organizationId,
              leadId,
              title,
              leadName,
              leadCompany,
              dayName,
              date,
              time,
              occursAt,
              type,
              location,
              participants: params.participants == null ? null : Number(params.participants),
              reminders:
                params.reminders === undefined
                  ? undefined
                  : params.reminders === null
                    ? Prisma.DbNull
                    : params.reminders,
              postMeeting:
                params.postMeeting === undefined
                  ? undefined
                  : params.postMeeting === null
                    ? Prisma.DbNull
                    : params.postMeeting,
            } as unknown as Prisma.SystemCalendarEventUncheckedCreateInput,
            select: SYSTEM_CALENDAR_EVENT_SELECT,
          });
        } catch {
          created = await prisma.systemCalendarEvent.create({
            data: {
              organizationId,
              leadId,
              title,
              leadName,
              leadCompany,
              dayName,
              date,
              time,
              type,
              location,
              participants: params.participants == null ? null : Number(params.participants),
              reminders:
                params.reminders === undefined
                  ? undefined
                  : params.reminders === null
                    ? Prisma.DbNull
                    : params.reminders,
              postMeeting:
                params.postMeeting === undefined
                  ? undefined
                  : params.postMeeting === null
                    ? Prisma.DbNull
                    : params.postMeeting,
            },
            select: SYSTEM_CALENDAR_EVENT_SELECT,
          });
        }

        return { ok: true, event: toCalendarEventDto(created) };
      },
      { source: 'server_actions_system_leads', reason: 'createSystemCalendarEvent' }
    );
  } catch (e: unknown) {
    logger.error('system-leads', 'createSystemCalendarEvent failed', e);
    return { ok: false, message: getUnknownErrorMessage(e) || 'שגיאה ביצירת אירוע' };
  }
}

export async function updateSystemLeadFollowUp(params: {
  orgSlug: string;
  leadId: string;
  nextActionDate?: string | null;
  nextActionNote?: string | null;
}): Promise<{ ok: true; lead: SystemLeadDTO } | { ok: false; message: string }> {
  try {
    const orgSlug = String(params.orgSlug || '').trim();
    const leadId = String(params.leadId || '').trim();
    if (!orgSlug) throw new Error('orgSlug is required');
    if (!leadId) throw new Error('leadId is required');

    return await withWorkspaceTenantContext(
      orgSlug,
      async ({ organizationId }) => {
        const nextActionNote = params.nextActionNote == null ? null : String(params.nextActionNote);
        const nextActionDateRaw = params.nextActionDate == null ? null : String(params.nextActionDate).trim();
        const nextActionDate = nextActionDateRaw ? new Date(nextActionDateRaw) : null;
        if (nextActionDate && Number.isNaN(nextActionDate.getTime())) {
          return { ok: false, message: 'תאריך follow-up לא תקין' };
        }

        await prisma.systemLead.update({
          where: { id: leadId, organizationId },
          data: { nextActionDate, nextActionNote, nextActionDateSuggestion: null, nextActionDateRationale: null },
        });

        const hydrated = await loadLeadDtoWithActivities({ organizationId, leadId, takeActivities: 50 });
        if (!hydrated) return { ok: false, message: 'Lead not found' };
        return { ok: true, lead: hydrated };
      },
      { source: 'server_actions_system_leads', reason: 'updateSystemLeadFollowUp' }
    );
  } catch (e: unknown) {
    logger.error('system-leads', 'updateSystemLeadFollowUp failed', e);
    return { ok: false, message: getUnknownErrorMessage(e) || 'שגיאה בעדכון follow-up' };
  }
}

export async function createSystemLead(
  orgSlug: string,
  input: {
    name: string;
    company?: string;
    phone: string;
    email?: string;
    source?: string;
    value?: number;
    isHot?: boolean;
    productInterest?: string;
  }
): Promise<SystemLeadDTO> {
  return await withWorkspaceTenantContext(
    orgSlug,
    async ({ organizationId }) => {
      requireOrganizationId('createSystemLead', organizationId);

      const name = String(input.name || '').trim();
      const phone = String(input.phone || '').trim();
      const email = String(input.email || '').trim();

      if (!name) throw new Error('Name is required');
      if (!phone) throw new Error('Phone is required');
      // Email is optional at lead creation time; it's required only when converting to client/portal.

      const now = new Date();

      const company = input.company?.trim() || null;
      const source = input.source?.trim() || 'manual';
      const value = input.value ?? 0;
      const isHot = Boolean(input.isHot);
      const productInterest = input.productInterest || null;

      const row = await prisma.systemLead.create({
        data: {
          organizationId,
          name,
          company,
          phone,
          email: email || '',
          source,
          status: 'incoming',
          value,
          lastContact: now,
          isHot,
          score: 50,
          productInterest,
        },
      });

      revalidatePath(`/w/${orgSlug}/system`, 'page');
      revalidatePath(`/w/${orgSlug}/system/leads`, 'page');
      const dto = toDto(row);

      // Notify org members about new lead
      try {
        const orgOwner = await prisma.organization.findFirst({
          where: { id: organizationId },
          select: { owner_id: true },
        });
        if (orgOwner?.owner_id) {
          insertMisradNotificationsForOrganizationId({
            organizationId,
            recipientIds: [String(orgOwner.owner_id)],
            type: 'LEAD',
            text: `ליד חדש: ${name}${company ? ` (${company})` : ''}${isHot ? ' 🔥' : ''}`,
            reason: 'system_lead_created',
          }).catch(() => {});
        }
      } catch { /* best-effort */ }

      return dto;
    },
    { source: 'server_actions_system_leads', reason: 'createSystemLead' }
  );
}

export type UpdateSystemLeadStatusResult =
  | { ok: true; lead: SystemLeadDTO; syncedClientId?: string | null }
  | { ok: false; reason: 'blocked_no_email' | 'blocked_no_installation_address'; message: string };

// SystemLeadActivityDTO is now imported from leads-service

export type SystemCallHistoryDTO = {
  id: string;
  lead_id: string;
  lead_name: string;
  lead_phone: string;
  content: string;
  timestamp: string;
  direction: string | null;
};

type SystemCallHistoryRow = Prisma.SystemLeadActivityGetPayload<{
  include: {
    lead: {
      select: {
        id: true;
        name: true;
        phone: true;
      };
    };
  };
}>;

// toActivityDto, normalizeAddress, loadLeadDtoWithActivities now imported from leads-service

export async function getSystemLeadActivities(params: {
  orgSlug: string;
  leadId: string;
  take?: number;
}): Promise<SystemLeadActivityDTO[]> {
  return await withWorkspaceTenantContext(
    params.orgSlug,
    async ({ organizationId }) => {
      const leadId = String(params.leadId || '').trim();
      if (!leadId) throw new Error('leadId is required');

      const rows = await prisma.systemLeadActivity.findMany({
        where: { leadId, lead: { organizationId } },
        orderBy: { timestamp: 'desc' },
        take: Math.max(1, Math.min(200, Math.floor(params.take ?? 50))),
      });

      return rows.map(toActivityDto);
    },
    { source: 'server_actions_system_leads', reason: 'getSystemLeadActivities' }
  );
}

export async function getSystemCallHistory(params: {
  orgSlug: string;
  take?: number;
}): Promise<SystemCallHistoryDTO[]> {
  return await withWorkspaceTenantContext(
    params.orgSlug,
    async ({ organizationId }) => {
      const rows: SystemCallHistoryRow[] = await prisma.systemLeadActivity.findMany({
        where: {
          type: 'call',
          lead: { organizationId },
        },
        include: {
          lead: { select: { id: true, name: true, phone: true } },
        },
        orderBy: { timestamp: 'desc' },
        take: Math.max(1, Math.min(200, Math.floor(params.take ?? 100))),
      });

      return rows.map((r) => ({
        id: String(r.id),
        lead_id: String(r.leadId),
        lead_name: String(r.lead?.name || ''),
        lead_phone: String(r.lead?.phone || ''),
        content: String(r.content || ''),
        timestamp: new Date(r.timestamp ?? r.createdAt ?? new Date()).toISOString(),
        direction: r.direction != null ? String(r.direction) : null,
      }));
    },
    { source: 'server_actions_system_leads', reason: 'getSystemCallHistory' }
  );
}

export async function getSystemLeadAssignees(params: {
  orgSlug: string;
}): Promise<Array<{ id: string; name: string; email: string | null; avatarUrl: string | null }>> {
  return await withWorkspaceTenantContext(
    params.orgSlug,
    async ({ organizationId }) => {
      const rows = await prisma.profile.findMany({
        where: { organizationId },
        select: { id: true, fullName: true, email: true, avatarUrl: true },
        orderBy: [{ fullName: 'asc' }, { email: 'asc' }],
        take: 200,
      });

      return rows.map((r) => ({
        id: String(r.id),
        name: String(r.fullName || r.email || r.id),
        email: r.email ? String(r.email) : null,
        avatarUrl: r.avatarUrl ? String(r.avatarUrl) : null,
      }));
    },
    { source: 'server_actions_system_leads', reason: 'getSystemLeadAssignees' }
  );
}

export async function updateSystemLead(params: {
  orgSlug: string;
  leadId: string;
  name?: string;
  phone?: string;
  email?: string | null;
  assignedAgentId?: string | null;
  nextActionDate?: string | null;
  nextActionNote?: string | null;
}): Promise<{ ok: true; lead: SystemLeadDTO } | { ok: false; message: string }> {
  try {
    const orgSlug = String(params.orgSlug || '').trim();
    const leadId = String(params.leadId || '').trim();
    if (!orgSlug) throw new Error('orgSlug is required');
    if (!leadId) throw new Error('leadId is required');

    return await withWorkspaceTenantContext(
      orgSlug,
      async ({ organizationId }) => {
        const data: Prisma.SystemLeadUpdateManyMutationInput = {};

        if (params.name !== undefined) {
          const name = String(params.name || '').trim();
          if (!name) return { ok: false, message: 'חובה להזין שם' };
          data.name = name;
        }

        if (params.phone !== undefined) {
          const phone = String(params.phone || '').trim();
          if (!phone) return { ok: false, message: 'חובה להזין טלפון' };
          data.phone = phone;
        }

        if (params.email !== undefined) {
          const email = params.email == null ? '' : String(params.email || '').trim();
          data.email = email;
        }

        if (params.assignedAgentId !== undefined) {
          data.assignedAgentId = params.assignedAgentId == null ? null : String(params.assignedAgentId);
        }

        if (params.nextActionDate !== undefined) {
          const nextActionDateRaw = params.nextActionDate == null ? null : String(params.nextActionDate).trim();
          const nextActionDate = nextActionDateRaw ? new Date(nextActionDateRaw) : null;
          if (nextActionDate && Number.isNaN(nextActionDate.getTime())) {
            return { ok: false, message: 'תאריך follow-up לא תקין' };
          }
          data.nextActionDate = nextActionDate;
          data.nextActionDateSuggestion = null;
          data.nextActionDateRationale = null;
        }

        if (params.nextActionNote !== undefined) {
          data.nextActionNote = params.nextActionNote == null ? null : String(params.nextActionNote);
        }

        if (Object.keys(data).length === 0) {
          const existingLead = await loadLeadDtoWithActivities({ organizationId, leadId, takeActivities: 50 });
          if (!existingLead) return { ok: false, message: 'Lead not found' };
          return { ok: true, lead: existingLead };
        }

        data.lastContact = new Date();

        await prisma.systemLead.update({
          where: { id: leadId, organizationId },
          data,
        });

        const hydrated = await loadLeadDtoWithActivities({ organizationId, leadId, takeActivities: 50 });
        if (!hydrated) return { ok: false, message: 'Lead not found' };
        
        revalidatePath(`/w/${orgSlug}/system/sales_leads`, 'page');
        return { ok: true, lead: hydrated };
      },
      { source: 'server_actions_system_leads', reason: 'updateSystemLead' }
    );
  } catch (e: unknown) {
    logger.error('system-leads', 'updateSystemLead failed', e);
    return { ok: false, message: getUnknownErrorMessage(e) || 'שגיאה בעדכון ליד' };
  }
}

export async function recomputeSystemLeadAiScore(params: {
  orgSlug: string;
  leadId: string;
}): Promise<{ ok: true; lead: SystemLeadDTO } | { ok: false; message: string }> {
  try {
    const orgSlug = String(params.orgSlug || '').trim();
    const leadId = String(params.leadId || '').trim();
    if (!orgSlug) throw new Error('orgSlug is required');
    if (!leadId) throw new Error('leadId is required');

    return await withWorkspaceTenantContext(
      orgSlug,
      async ({ organizationId }) => {
        const leadRow = await prisma.systemLead.findFirst({
          where: { id: leadId, organizationId },
          select: {
            id: true,
            name: true,
            company: true,
            phone: true,
            email: true,
            status: true,
            value: true,
            source: true,
            isHot: true,
            score: true,
          },
        });

        if (!leadRow?.id) {
          return { ok: false, message: 'Lead not found' };
        }

        const activities = await prisma.systemLeadActivity.findMany({
          where: { leadId, lead: { organizationId } },
          orderBy: { timestamp: 'desc' },
          take: 30,
          select: { type: true, content: true, timestamp: true, direction: true },
        });

        const aiScoreResult = await computeLeadAiScore({
          organizationId,
          leadId,
          leadRow: {
            name: leadRow.name,
            company: leadRow.company,
            status: leadRow.status,
            source: leadRow.source,
            value: leadRow.value ? Number(leadRow.value) : null,
          },
          recentActivities: activities,
        });

        const updated = await persistAiScore({
          organizationId,
          leadId,
          result: aiScoreResult,
        });

        if (!updated) {
          return { ok: false, message: 'Lead not found' };
        }

        const hydrated = await loadLeadDtoWithActivities({ organizationId, leadId, takeActivities: 50 });
        if (!hydrated) {
          return { ok: false, message: 'Lead not found' };
        }

        return { ok: true, lead: hydrated };
      },
      { source: 'server_actions_system_leads', reason: 'recomputeSystemLeadAiScore' }
    );
  } catch (e: unknown) {
    logger.error('system-leads', 'recomputeSystemLeadAiScore failed', e);
    return { ok: false, message: getUnknownErrorMessage(e) || 'שגיאה בחישוב AI Score' };
  }
}

export async function createSystemLeadActivity(params: {
  orgSlug: string;
  leadId: string;
  type: string;
  content: string;
  direction?: string | null;
  metadata?: Prisma.InputJsonValue | null;
  recomputeScore?: boolean;
}): Promise<{ ok: true; SquareActivity: SystemLeadActivityDTO; lead?: SystemLeadDTO } | { ok: false; message: string }> {
  try {
    const orgSlug = String(params.orgSlug || '').trim();
    const leadId = String(params.leadId || '').trim();
    const type = String(params.type || '').trim();
    const content = String(params.content || '').trim();

    if (!orgSlug) throw new Error('orgSlug is required');
    if (!leadId) throw new Error('leadId is required');
    if (!type) throw new Error('type is required');
    if (!content) throw new Error('content is required');

    return await withWorkspaceTenantContext(
      orgSlug,
      async ({ organizationId }) => {
        requireOrganizationId('createSystemLeadActivity', organizationId);

        const now = new Date();
        const existing = await prisma.systemLead.findFirst({
          where: { id: leadId, organizationId },
          select: { id: true, nextActionDate: true, nextActionDateSuggestion: true },
        });
        if (!existing?.id) throw new Error('Lead not found');

        const row = await prisma.systemLeadActivity.create({
          data: {
            organizationId,
            leadId,
            type,
            content,
            direction: params.direction ? String(params.direction) : null,
            metadata:
              params.metadata === undefined
                ? undefined
                : params.metadata === null
                  ? Prisma.DbNull
                  : params.metadata,
          },
        });

        await prisma.systemLead.update({
          where: { id: leadId, organizationId },
          data: { lastContact: now },
        });

        if (!existing.nextActionDate && !existing.nextActionDateSuggestion) {
          const maybeFollowUp = parseFollowUpDateFromHebrew(content, now);
          if (maybeFollowUp) {
            await prisma.systemLead.update({
              where: { id: leadId, organizationId },
              data: {
                nextActionDateSuggestion: maybeFollowUp.date,
                nextActionDateRationale: maybeFollowUp.rationale,
              },
            });
          }
        }

        const baseLeadDto = await loadLeadDtoWithActivities({
          organizationId,
          leadId,
          takeActivities: 50,
        });
        let leadDto: SystemLeadDTO | undefined = baseLeadDto ?? undefined;

        if (params.recomputeScore !== false) {
          const scored = await recomputeSystemLeadAiScore({ orgSlug, leadId }).catch((error: unknown) => {
            if (isSchemaMismatchError(error) && !ALLOW_SCHEMA_FALLBACKS) {
              throw new Error(
                `[SchemaMismatch] recomputeSystemLeadAiScore failed (${getUnknownErrorMessage(error) || 'missing relation'})`
              );
            }

            if (isSchemaMismatchError(error) && ALLOW_SCHEMA_FALLBACKS) {
              reportSchemaFallback({
                source: 'app/actions/system-leads.createSystemLeadActivity',
                reason: 'recomputeSystemLeadAiScore schema mismatch (fallback to base lead dto)',
                error,
                extras: { orgSlug, leadId },
              });
            }
            return null;
          });
          if (scored && scored.ok) {
            leadDto = scored.lead;
          }
        }

        revalidatePath(`/w/${orgSlug}/system/sales_leads`, 'page');
        return { ok: true, SquareActivity: toActivityDto(row), lead: leadDto };
      },
      { source: 'server_actions_system_leads', reason: 'createSystemLeadActivity' }
    );
  } catch (e: unknown) {
    logger.error('system-leads', 'createSystemLeadActivity failed', e);
    return { ok: false, message: getUnknownErrorMessage(e) || 'שגיאה ביצירת פעילות' };
  }
}

async function upsertNexusClientByEmail(params: {
  organizationId: string;
  fullName: string;
  companyName: string;
  email: string;
  phone?: string | null;
  source?: string | null;
}): Promise<{ nexusClientId: string | null }> {
  const organizationId = params.organizationId;
  const phone = String(params.phone || '').trim();

  // NexusClient has a unique constraint on (organizationId, phone)
  if (phone) {
    const existing = await prisma.nexusClient.findFirst({
      where: { organizationId, phone },
      select: { id: true },
    });

    if (existing?.id) {
      await prisma.nexusClient.update({
        where: { id: existing.id },
        data: {
          name: params.fullName,
          companyName: params.companyName || params.fullName,
          email: params.email,
          source: params.source || 'system_leads',
        },
      });
      return { nexusClientId: existing.id };
    }
  }

  // Fallback: check by email
  const email = String(params.email || '').trim().toLowerCase();
  if (email) {
    const existing = await prisma.nexusClient.findFirst({
      where: { organizationId, email: { equals: email, mode: 'insensitive' } },
      select: { id: true },
    });

    if (existing?.id) {
      await prisma.nexusClient.update({
        where: { id: existing.id },
        data: {
          name: params.fullName,
          companyName: params.companyName || params.fullName,
          phone: phone || undefined,
          source: params.source || 'system_leads',
        },
      });
      return { nexusClientId: existing.id };
    }
  }

  // Create new NexusClient
  const created = await prisma.nexusClient.create({
    data: {
      organizationId,
      name: params.fullName,
      companyName: params.companyName || params.fullName,
      contactPerson: params.fullName,
      email: email || '',
      phone: phone || '',
      status: 'Active',
      source: params.source || 'system_leads',
    },
    select: { id: true },
  });

  return { nexusClientId: created?.id ?? null };
}

async function upsertClientClientByEmail(params: {
  organizationId: string;
  fullName: string;
  email: string;
  phone?: string | null;
  metadata?: Prisma.InputJsonValue;
}): Promise<{ clientId: string | null }> {
  const organizationId = params.organizationId;
  const email = String(params.email || '').trim();

  const existing = await prisma.clientClient.findFirst({
    where: {
      organizationId,
      email: {
        equals: email,
        mode: 'insensitive',
      },
    },
    select: { id: true },
  });

  if (existing?.id) {
    await prisma.clientClient.update({
      where: { id: existing.id },
      data: {
        fullName: params.fullName,
        phone: params.phone ?? null,
        email,
        metadata: params.metadata ?? {},
      },
    });

    return { clientId: existing.id };
  }

  const created = await prisma.clientClient.create({
    data: {
      organizationId,
      fullName: params.fullName,
      phone: params.phone ?? null,
      email,
      metadata: params.metadata ?? {},
    },
    select: { id: true },
  });

  return { clientId: created?.id ?? null };
}

export async function updateSystemLeadStatus(params: {
  orgSlug: string;
  leadId: string;
  status: string;
  installationAddress?: string | null;
}): Promise<UpdateSystemLeadStatusResult> {
  const orgSlug = String(params.orgSlug || '').trim();
  const leadId = String(params.leadId || '').trim();
  const status = String(params.status || '').trim();

  if (!orgSlug) throw new Error('orgSlug is required');
  if (!leadId) throw new Error('leadId is required');
  if (!status) throw new Error('status is required');

  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    throw new Error('Unauthorized');
  }

  return await withWorkspaceTenantContext(
    orgSlug,
    async ({ organizationId, workspace }) => {
      const existing = await prisma.systemLead.findFirst({
        where: { id: leadId, organizationId },
      });

      if (!existing) {
        throw new Error('Lead not found');
      }

      if (status !== 'won') {
        await prisma.systemLead.update({
          where: { id: leadId, organizationId },
          data: {
            status,
            lastContact: new Date(),
          },
        });

        const row = await prisma.systemLead.findFirst({
          where: { id: leadId, organizationId },
        });
        if (!row) {
          throw new Error('Lead not found');
        }

        const leadDto = toDto(row);

        // Notify on important status changes
        const STATUS_LABELS: Record<string, string> = {
          contacted: 'נוצר קשר',
          qualified: 'מתאים',
          proposal: 'הצעת מחיר',
          negotiation: 'משא ומתן',
          lost: 'אבוד',
        };
        const statusLabel = STATUS_LABELS[status] || status;
        try {
          const orgOwner = await prisma.organization.findFirst({
            where: { id: organizationId },
            select: { owner_id: true },
          });
          if (orgOwner?.owner_id) {
            insertMisradNotificationsForOrganizationId({
              organizationId,
              recipientIds: [String(orgOwner.owner_id)],
              type: 'LEAD',
              text: `ליד ${existing.name} עבר לסטטוס: ${statusLabel}`,
              reason: 'system_lead_status_changed',
            }).catch(() => {});
          }
        } catch { /* best-effort */ }

        return { ok: true, lead: leadDto, syncedClientId: null };
      }

      const email = String(existing.email || '').trim();
      if (!email) {
        return {
          ok: false,
          reason: 'blocked_no_email',
          message: 'לא ניתן לסגור ליד כ-לקוח כי אין לו אימייל. יש להוסיף אימייל לליד ואז לסגור מחדש.',
        };
      }

      const nextInstallationAddressRaw =
        typeof params.installationAddress === 'string' ? params.installationAddress : existing.installationAddress;
      const nextInstallationAddress = String(nextInstallationAddressRaw || '').trim();
      if (!nextInstallationAddress) {
        return {
          ok: false,
          reason: 'blocked_no_installation_address',
          message: 'כדי לסגור עסקה ל-WON חייבים להזין כתובת לביצוע (installation_address).',
        };
      }

      await prisma.systemLead.update({
        where: { id: leadId, organizationId },
        data: {
          status,
          lastContact: new Date(),
          installationAddress: nextInstallationAddress,
        },
      });

      const row = await prisma.systemLead.findFirst({
        where: { id: leadId, organizationId },
      });
      if (!row) {
        throw new Error('Lead not found');
      }

      const lead = toDto(row);

      const canonical = await upsertCanonicalClientByEmail({
        orgSlug,
        organizationId,
        clerkUserId,
        email,
        fullName: lead.name,
        companyName: lead.company?.trim() ? lead.company.trim() : lead.name,
        phone: lead.phone || null,
      });

      // ── Sync to Nexus client list (if org has Nexus) ──
      let nexusClientId: string | null = null;
      if (workspace.entitlements?.nexus) {
        try {
          const nexusSynced = await upsertNexusClientByEmail({
            organizationId,
            fullName: lead.name,
            companyName: lead.company?.trim() || lead.name,
            email,
            phone: lead.phone || null,
            source: 'system_leads',
          });
          nexusClientId = nexusSynced.nexusClientId;
        } catch (e: unknown) {
          logger.error('system-leads', 'failed to sync lead to NexusClient', e);
        }
      }

      // ── Sync to Client module (if org has Client) ──
      let syncedClientId: string | null = null;
      if (workspace.entitlements?.client) {
        try {
          const synced = await upsertClientClientByEmail({
            organizationId,
            fullName: lead.company?.trim() ? lead.company.trim() : lead.name,
            email,
            phone: lead.phone || null,
            metadata: {
              source: 'system_leads',
              systemLeadId: lead.id,
              canonicalClientId: canonical.canonicalClientId,
              nexusClientId,
            },
          });
          syncedClientId = synced.clientId;
        } catch (e: unknown) {
          logger.error('system-leads', 'failed to sync lead to ClientClient', e);
        }
      }

      const canonicalClientId = canonical.canonicalClientId;

      if (workspace.entitlements?.operations && canonicalClientId) {
        try {
          const existingProject = await prisma.operationsProject.findFirst({
            where: {
              organizationId,
              source: 'system_lead',
              sourceRefId: lead.id,
            },
            select: { id: true },
          });

          if (!existingProject?.id) {
            await prisma.operationsProject.create({
              data: {
                organizationId,
                canonicalClientId,
                title: lead.company?.trim() ? lead.company.trim() : lead.name,
                status: 'ACTIVE',
                installationAddress: nextInstallationAddress,
                addressNormalized: nextInstallationAddress ? normalizeAddress(nextInstallationAddress) : null,
                source: 'system_lead',
                sourceRefId: lead.id,
              },
              select: { id: true },
            });
          }
        } catch (e: unknown) {
          logger.error('system-leads', 'failed to auto-create operations project', e);
        }
      }

      if (workspace.entitlements?.finance) {
        try {
          const existingInvoice = await prisma.systemInvoice.findFirst({
            where: { leadId: lead.id, organizationId },
            select: { id: true },
          });

          if (!existingInvoice?.id) {
            await prisma.systemInvoice.create({
              data: {
                organizationId,
                leadId: lead.id,
                client: lead.company?.trim() ? lead.company.trim() : lead.name,
                amount: new Prisma.Decimal(Number(lead.value || 0)),
                status: 'pending',
                item: 'מכירה (System)',
              },
              select: { id: true },
            });
          }
        } catch (e: unknown) {
          logger.error('system-leads', 'failed to auto-create system invoice', e);
        }
      }

      // Notify: deal won!
      try {
        const orgOwner = await prisma.organization.findFirst({
          where: { id: organizationId },
          select: { owner_id: true },
        });
        if (orgOwner?.owner_id) {
          const valueStr = lead.value ? ` (₪${Number(lead.value).toLocaleString()})` : '';
          insertMisradNotificationsForOrganizationId({
            organizationId,
            recipientIds: [String(orgOwner.owner_id)],
            type: 'LEAD',
            text: `עסקה נסגרה! ${lead.name}${valueStr} הפך ללקוח`,
            reason: 'system_lead_won',
          }).catch(() => {});
        }
      } catch { /* best-effort */ }

      revalidatePath(`/w/${orgSlug}/system/sales_leads`, 'page');
      revalidatePath(`/w/${orgSlug}/client/clients`, 'page');
      if (workspace.entitlements?.operations) {
        revalidatePath(`/w/${orgSlug}/operations/projects`, 'page');
      }
      
      return { ok: true, lead, syncedClientId: syncedClientId || nexusClientId };
    },
    { source: 'server_actions_system_leads', reason: 'updateSystemLeadStatus' }
  );
}
