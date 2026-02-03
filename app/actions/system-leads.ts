'use server';

import prisma from '@/lib/prisma';
import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';
import { createClientForWorkspace } from '@/app/actions/clients';
import { auth } from '@clerk/nextjs/server';
import { AIService } from '@/lib/services/ai/AIService';
import { requireOrganizationId } from '@/lib/tenant-isolation';
import { Prisma } from '@prisma/client';
import type { SystemCalendarEvent, SystemLead, SystemLeadActivity } from '@prisma/client';
import type { Client } from '@/types/social';

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
  next_action_date?: string | null;
  next_action_date_suggestion?: string | null;
  next_action_note?: string | null;
  next_action_date_rationale?: string | null;
  activities?: SystemLeadActivityDTO[];
};

function asObject(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object') {
    return value as Record<string, unknown>;
  }
  return null;
}

function getUnknownErrorMessage(error: unknown): string | null {
  if (!error) return null;
  if (error instanceof Error) return error.message;
  const obj = asObject(error);
  const msg = obj?.message;
  return typeof msg === 'string' ? msg : null;
}

type SystemLeadRow = SystemLead & { activities?: SystemLeadActivity[] };

function toDto(row: SystemLeadRow): SystemLeadDTO {
  return {
    id: row.id,
    organization_id: row.organizationId,
    name: row.name,
    company: row.company ?? null,
    phone: row.phone,
    email: row.email ?? null,
    installation_address: row.installationAddress ? String(row.installationAddress) : null,
    source: row.source,
    status: row.status,
    value: Number(row.value ?? 0),
    last_contact: new Date(row.lastContact).toISOString(),
    created_at: new Date(row.createdAt ?? row.lastContact).toISOString(),
    is_hot: Boolean(row.isHot),
    score: Number(row.score ?? 0),
    assigned_agent_id: row.assignedAgentId ?? null,
    product_interest: row.productInterest ?? null,
    ai_tags: Array.isArray(row.aiTags) ? row.aiTags.map((t) => String(t)).filter(Boolean) : [],
    next_action_date: row.nextActionDate ? new Date(row.nextActionDate).toISOString() : null,
    next_action_date_suggestion: row.nextActionDateSuggestion ? new Date(row.nextActionDateSuggestion).toISOString() : null,
    next_action_note: row.nextActionNote != null ? String(row.nextActionNote) : null,
    next_action_date_rationale: row.nextActionDateRationale != null ? String(row.nextActionDateRationale) : null,
    activities: Array.isArray(row.activities) ? row.activities.map(toActivityDto) : [],
  };
}

function parseFollowUpDateFromHebrew(text: string, now: Date): { date: Date; rationale: string } | null {
  const content = String(text || '').trim();
  if (!content) return null;

  const normalized = content.replace(/\s+/g, ' ');
  const lower = normalized.toLowerCase();

  if (lower.includes('מחר')) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    d.setHours(10, 0, 0, 0);
    return { date: d, rationale: 'זוהתה בקשה ל-follow-up מחר; הוצעה שעה 10:00 כברירת מחדל.' };
  }

  if (lower.includes('היום')) {
    const d = new Date(now);
    d.setHours(16, 0, 0, 0);
    return { date: d, rationale: 'זוהתה בקשה ל-follow-up היום; הוצעה שעה 16:00 כברירת מחדל.' };
  }

  const days: Array<{ key: string; idx: number }> = [
    { key: 'ראשון', idx: 0 },
    { key: 'שני', idx: 1 },
    { key: 'שלישי', idx: 2 },
    { key: 'רביעי', idx: 3 },
    { key: 'חמישי', idx: 4 },
    { key: 'שישי', idx: 5 },
    { key: 'שבת', idx: 6 },
  ];

  const hasTalkToMe = normalized.includes('דבר איתי') || normalized.includes('תדבר איתי') || normalized.includes('תחזור אליי');
  if (!hasTalkToMe) return null;

  const found = days.find((d) => normalized.includes(`יום ${d.key}`) || normalized.includes(`ביום ${d.key}`));
  if (!found) return null;

  const target = new Date(now);
  target.setHours(10, 0, 0, 0);
  const currentDow = target.getDay();
  let diff = (found.idx - currentDow + 7) % 7;
  if (diff === 0) diff = 7;
  target.setDate(target.getDate() + diff);
  return { date: target, rationale: `זוהתה בקשה ל-follow-up ביום ${found.key}; הוצעה שעה 10:00 כברירת מחדל.` };
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
    findError = e;
  }

  if (findError) {
    const findErrorObj = asObject(findError);
    const code = findErrorObj?.code;
    const details = findErrorObj?.details;
    console.error('[system-leads] failed to find existing canonical client', {
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

  console.error('[system-leads] failed to upsert canonical client', {
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

type SystemLeadsCursor = {
  createdAt: string;
  id: string;
};
function encodeSystemLeadsCursor(cursor: SystemLeadsCursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64');
}

function decodeSystemLeadsCursor(raw?: string | null): SystemLeadsCursor | null {
  const v = String(raw || '').trim();
  if (!v) return null;
  try {
    const parsed: unknown = JSON.parse(Buffer.from(v, 'base64').toString('utf8'));
    const obj = asObject(parsed);
    const createdAt = String(obj?.createdAt || '').trim();
    const id = String(obj?.id || '').trim();
    if (!createdAt || !id) return null;
    const d = new Date(createdAt);
    if (Number.isNaN(d.getTime())) return null;
    return { createdAt: d.toISOString(), id };
  } catch {
    return null;
  }
}

export async function getSystemCalendarEventsRange(params: {
  orgSlug: string;
  from: string;
  to: string;
  take?: number;
}): Promise<SystemCalendarEventDTO[]> {
  const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
  requireOrganizationId('getSystemCalendarEventsRange', workspace?.id);

  const fromRaw = String(params.from || '').trim();
  const toRaw = String(params.to || '').trim();
  if (!fromRaw || !toRaw) return [];

  const fromDate = new Date(fromRaw);
  const toDate = new Date(toRaw);
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) return [];

  const take = Math.max(1, Math.min(500, Math.floor(params.take ?? 400)));

  // Prefer occursAt (indexed), but include legacy rows where occursAt is null and date is in range.
  // `date` is stored as ISO YYYY-MM-DD so lexical comparisons are safe.
  const fromDateStr = fromDate.toISOString().slice(0, 10);
  const toDateStr = toDate.toISOString().slice(0, 10);

  try {
    const where: Prisma.SystemCalendarEventWhereInput = {
      lead: { organizationId: workspace.id },
      date: { gte: fromDateStr, lt: toDateStr },
    };

    const rows = await prisma.systemCalendarEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
    });

    return rows.map(toCalendarEventDto);
  } catch (e: unknown) {
    console.error('[system-leads] getSystemCalendarEventsRange failed; fallback to legacy date filter', e);
    const rows = await prisma.systemCalendarEvent.findMany({
      where: {
        lead: { organizationId: workspace.id },
        date: { gte: fromDateStr, lt: toDateStr },
      },
      orderBy: { createdAt: 'desc' },
      take,
    });

    return rows.map(toCalendarEventDto);
  }
}

export async function getSystemLeadsPage(params: {
  orgSlug: string;
  cursor?: string | null;
  pageSize?: number;
}): Promise<
  | { success: true; data: { leads: SystemLeadDTO[]; nextCursor: string | null; hasMore: boolean } }
  | { success: false; error: string }
> {
  try {
    const orgSlug = String(params.orgSlug || '').trim();
    if (!orgSlug) return { success: false, error: 'orgSlug חסר' };

    const workspace = await requireWorkspaceAccessByOrgSlug(orgSlug);
    requireOrganizationId('getSystemLeadsPage', workspace?.id);

    const pageSize = Math.min(200, Math.max(1, Math.floor(params.pageSize ?? 60)));
    const cursor = decodeSystemLeadsCursor(params.cursor);

    const where: Prisma.SystemLeadWhereInput = {
      organizationId: workspace.id,
      ...(cursor
        ? {
            OR: [
              { createdAt: { lt: new Date(cursor.createdAt) } },
              { createdAt: { equals: new Date(cursor.createdAt) }, id: { lt: cursor.id } },
            ],
          }
        : {}),
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

    return { success: true, data: { leads, nextCursor, hasMore } };
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

function toCalendarEventDto(row: SystemCalendarEvent): SystemCalendarEventDTO {
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
  const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
  requireOrganizationId('getSystemCalendarEvents', workspace?.id);
  const take = Math.max(1, Math.min(500, Math.floor(params.take ?? 200)));

  try {
    const rows = await prisma.systemCalendarEvent.findMany({
      where: { lead: { organizationId: workspace.id } },
      orderBy: { createdAt: 'desc' },
      take,
    });
    return rows.map(toCalendarEventDto);
  } catch (e: unknown) {
    // Backwards-compatible fallback for DBs that don't have occurs_at yet.
    const rows = await prisma.systemCalendarEvent.findMany({
      where: { lead: { organizationId: workspace.id } },
      orderBy: { createdAt: 'desc' },
      take,
    });
    return rows.map(toCalendarEventDto);
  }
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
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
    requireOrganizationId('createSystemCalendarEvent', workspace?.id);

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
      const lead = await prisma.systemLead.findFirst({ where: { id: leadId, organizationId: workspace.id }, select: { id: true } });
      if (!lead?.id) return { ok: false, message: 'Lead not found' };
    }

    const created = await prisma.systemCalendarEvent.create({
      data: {
        organizationId: workspace.id,
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
    });

    return { ok: true, event: toCalendarEventDto(created) };
  } catch (e: unknown) {
    console.error('[system-leads] createSystemCalendarEvent failed', e);
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

    const workspace = await requireWorkspaceAccessByOrgSlug(orgSlug);

    const nextActionNote = params.nextActionNote == null ? null : String(params.nextActionNote);
    const nextActionDateRaw = params.nextActionDate == null ? null : String(params.nextActionDate).trim();
    const nextActionDate = nextActionDateRaw ? new Date(nextActionDateRaw) : null;
    if (nextActionDate && Number.isNaN(nextActionDate.getTime())) {
      return { ok: false, message: 'תאריך follow-up לא תקין' };
    }

    const updated = await prisma.systemLead.updateMany({
      where: { id: leadId, organizationId: workspace.id },
      data: { nextActionDate, nextActionNote, nextActionDateSuggestion: null, nextActionDateRationale: null },
    });

    if (!updated.count) {
      return { ok: false, message: 'Lead not found' };
    }

    const hydrated = await loadLeadDtoWithActivities({ organizationId: workspace.id, leadId, takeActivities: 50 });
    if (!hydrated) return { ok: false, message: 'Lead not found' };
    return { ok: true, lead: hydrated };
  } catch (e: unknown) {
    console.error('[system-leads] updateSystemLeadFollowUp failed', e);
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
  const workspace = await requireWorkspaceAccessByOrgSlug(orgSlug);
  requireOrganizationId('createSystemLead', workspace?.id);

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
      organizationId: workspace.id,
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

  return toDto(row);
}

export type UpdateSystemLeadStatusResult =
  | { ok: true; lead: SystemLeadDTO; syncedClientId?: string | null }
  | { ok: false; reason: 'blocked_no_email' | 'blocked_no_installation_address'; message: string };

export type SystemLeadActivityDTO = {
  id: string;
  lead_id: string;
  type: string;
  content: string;
  timestamp: string;
  direction: string | null;
  metadata: Prisma.JsonValue | null;
};

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

function toActivityDto(row: SystemLeadActivity): SystemLeadActivityDTO {
  return {
    id: String(row.id),
    lead_id: String(row.leadId),
    type: String(row.type),
    content: String(row.content || ''),
    timestamp: new Date(row.timestamp ?? row.createdAt ?? new Date()).toISOString(),
    direction: row.direction ? String(row.direction) : null,
    metadata: row.metadata ?? null,
  };
}

function normalizeAddress(input: string): string {
  return String(input || '')
    .trim()
    .replace(/\s+/g, ' ');
}

async function loadLeadDtoWithActivities(params: {
  organizationId: string;
  leadId: string;
  takeActivities?: number;
}): Promise<SystemLeadDTO | null> {
  const leadId = String(params.leadId || '').trim();
  if (!leadId) return null;
  const row = await prisma.systemLead.findFirst({
    where: { id: leadId, organizationId: params.organizationId },
    include: {
      activities: {
        orderBy: { timestamp: 'desc' },
        take: Math.max(1, Math.min(200, Math.floor(params.takeActivities ?? 50))),
      },
    },
  });
  return row ? toDto(row) : null;
}

export async function getSystemLeadActivities(params: {
  orgSlug: string;
  leadId: string;
  take?: number;
}): Promise<SystemLeadActivityDTO[]> {
  const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
  const leadId = String(params.leadId || '').trim();
  if (!leadId) throw new Error('leadId is required');

  const rows = await prisma.systemLeadActivity.findMany({
    where: { leadId, lead: { organizationId: workspace.id } },
    orderBy: { timestamp: 'desc' },
    take: Math.max(1, Math.min(200, Math.floor(params.take ?? 50))),
  });

  return rows.map(toActivityDto);
}

export async function getSystemCallHistory(params: {
  orgSlug: string;
  take?: number;
}): Promise<SystemCallHistoryDTO[]> {
  const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
  const rows: SystemCallHistoryRow[] = await prisma.systemLeadActivity.findMany({
    where: {
      type: 'call',
      lead: { organizationId: workspace.id },
    },
    include: {
      lead: { select: { id: true, name: true, phone: true } },
    },
    orderBy: { timestamp: 'desc' },
    take: Math.max(1, Math.min(500, Math.floor(params.take ?? 100))),
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
}

export async function getSystemLeadAssignees(params: {
  orgSlug: string;
}): Promise<Array<{ id: string; name: string; email: string | null; avatarUrl: string | null }>> {
  const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
  const rows = await prisma.profile.findMany({
    where: { organizationId: workspace.id },
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

    const workspace = await requireWorkspaceAccessByOrgSlug(orgSlug);

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
      const existingLead = await loadLeadDtoWithActivities({ organizationId: workspace.id, leadId, takeActivities: 50 });
      if (!existingLead) return { ok: false, message: 'Lead not found' };
      return { ok: true, lead: existingLead };
    }

    data.lastContact = new Date();

    const updated = await prisma.systemLead.updateMany({
      where: { id: leadId, organizationId: workspace.id },
      data,
    });

    if (!updated.count) {
      return { ok: false, message: 'Lead not found' };
    }

    const hydrated = await loadLeadDtoWithActivities({ organizationId: workspace.id, leadId, takeActivities: 50 });
    if (!hydrated) return { ok: false, message: 'Lead not found' };
    return { ok: true, lead: hydrated };
  } catch (e: unknown) {
    console.error('[system-leads] updateSystemLead failed', e);
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

    const workspace = await requireWorkspaceAccessByOrgSlug(orgSlug);

    const leadRow = await prisma.systemLead.findFirst({
      where: { id: leadId, organizationId: workspace.id },
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
      where: { leadId, lead: { organizationId: workspace.id } },
      orderBy: { timestamp: 'desc' },
      take: 30,
      select: { type: true, content: true, timestamp: true, direction: true },
    });

    const history = activities
      .slice(0, 20)
      .map((a) => {
        const when = a.timestamp ? new Date(a.timestamp).toISOString() : '';
        const dir = a.direction ? `(${String(a.direction)})` : '';
        return `${when} ${String(a.type || '')}${dir}: ${String(a.content || '')}`;
      })
      .join('\n');

    const ai = AIService.getInstance();

    const prompt = `חשב ציון ליד (AI Score) בין 0 ל-100 עבור ליד מכירות.

נתוני ליד:
שם: ${String(leadRow.name || '')}
חברה: ${String(leadRow.company || '')}
סטטוס: ${String(leadRow.status || '')}
מקור: ${String(leadRow.source || '')}
שווי: ₪${Number(leadRow.value ?? 0)}

היסטוריית אינטראקציות אחרונה:
${history || 'אין אינטראקציות עדיין'}

החזר JSON בלבד בפורמט:
{ "score": number, "isHot": boolean, "tags": string[] }

כללים:
- score חייב להיות מספר שלם 0-100
- tags: עד 6 תגיות קצרות בעברית
- אם אין כמעט אינטראקציות: score נמוך יחסית`;

    const out = await ai.generateJson<{ score: number; isHot: boolean; tags: string[] }>({
      featureKey: 'system.leads.score',
      organizationId: workspace.id,
      prompt,
      responseSchema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          score: { type: 'number' },
          isHot: { type: 'boolean' },
          tags: { type: 'array', items: { type: 'string' } },
        },
        required: ['score', 'isHot', 'tags'],
      },
      meta: {
        module: 'system',
        kind: 'lead_score',
        leadId,
      },
    });

    const nextScoreRaw = out?.result?.score;
    const nextScore = Math.max(0, Math.min(100, Math.round(Number(nextScoreRaw ?? 0))));
    const nextIsHot = Boolean(out?.result?.isHot);
    const nextTags = Array.isArray(out?.result?.tags)
      ? out.result.tags.map((t) => String(t || '').trim()).filter(Boolean).slice(0, 12)
      : [];

    const updated = await prisma.systemLead.updateMany({
      where: { id: leadId, organizationId: workspace.id },
      data: {
        score: nextScore,
        isHot: nextIsHot,
        aiTags: nextTags,
      },
    });

    if (!updated.count) {
      return { ok: false, message: 'Lead not found' };
    }

    const hydrated = await loadLeadDtoWithActivities({ organizationId: workspace.id, leadId, takeActivities: 50 });
    if (!hydrated) {
      return { ok: false, message: 'Lead not found' };
    }

    return { ok: true, lead: hydrated };
  } catch (e: unknown) {
    console.error('[system-leads] recomputeSystemLeadAiScore failed', e);
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
}): Promise<{ ok: true; activity: SystemLeadActivityDTO; lead?: SystemLeadDTO } | { ok: false; message: string }> {
  try {
    const orgSlug = String(params.orgSlug || '').trim();
    const leadId = String(params.leadId || '').trim();
    const type = String(params.type || '').trim();
    const content = String(params.content || '').trim();

    if (!orgSlug) throw new Error('orgSlug is required');
    if (!leadId) throw new Error('leadId is required');
    if (!type) throw new Error('type is required');
    if (!content) throw new Error('content is required');

    const workspace = await requireWorkspaceAccessByOrgSlug(orgSlug);
    requireOrganizationId('createSystemLeadActivity', workspace?.id);
    const existing = await prisma.systemLead.findFirst({
      where: { id: leadId, organizationId: workspace.id },
      select: { id: true, nextActionDate: true, nextActionNote: true, nextActionDateSuggestion: true },
    });
    if (!existing) throw new Error('Lead not found');

    const row = await prisma.systemLeadActivity.create({
      data: {
        organizationId: workspace.id,
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

    const touched = await prisma.systemLead.updateMany({
      where: { id: leadId, organizationId: workspace.id },
      data: { lastContact: new Date() },
    });

    if (!touched.count) {
      throw new Error('Lead not found');
    }

    const now = new Date();
    const maybeFollowUp = type === 'call' ? parseFollowUpDateFromHebrew(content, now) : null;
    if (maybeFollowUp && !existing.nextActionDate && !existing.nextActionDateSuggestion) {
      await prisma.systemLead.updateMany({
        where: { id: leadId, organizationId: workspace.id },
        data: {
          nextActionDateSuggestion: maybeFollowUp.date,
          nextActionDateRationale: maybeFollowUp.rationale,
        },
      });
    }

    const baseLeadDto = await loadLeadDtoWithActivities({
      organizationId: workspace.id,
      leadId,
      takeActivities: 50,
    });
    let leadDto: SystemLeadDTO | undefined = baseLeadDto ?? undefined;

    if (params.recomputeScore !== false) {
      const scored = await recomputeSystemLeadAiScore({ orgSlug, leadId }).catch(() => null);
      if (scored && scored.ok) {
        leadDto = scored.lead;
      }
    }

    return { ok: true, activity: toActivityDto(row), lead: leadDto };
  } catch (e: unknown) {
    console.error('[system-leads] createSystemLeadActivity failed', e);
    return { ok: false, message: getUnknownErrorMessage(e) || 'שגיאה ביצירת פעילות' };
  }
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
    const updated = await prisma.clientClient.updateMany({
      where: { id: existing.id, organizationId },
      data: {
        fullName: params.fullName,
        phone: params.phone ?? null,
        email,
        metadata: params.metadata ?? {},
      },
    });

    if (!updated.count) {
      throw new Error('Failed to sync client (update failed)');
    }

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

  const workspace = await requireWorkspaceAccessByOrgSlug(orgSlug);

  const existing = await prisma.systemLead.findFirst({
    where: { id: leadId, organizationId: workspace.id },
  });

  if (!existing) {
    throw new Error('Lead not found');
  }

  if (status !== 'won') {
    const updated = await prisma.systemLead.updateMany({
      where: { id: leadId, organizationId: workspace.id },
      data: {
        status,
        lastContact: new Date(),
      },
    });

    if (!updated.count) {
      throw new Error('Lead not found');
    }

    const row = await prisma.systemLead.findFirst({
      where: { id: leadId, organizationId: workspace.id },
    });
    if (!row) {
      throw new Error('Lead not found');
    }

    return { ok: true, lead: toDto(row), syncedClientId: null };
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

  const updated = await prisma.systemLead.updateMany({
    where: { id: leadId, organizationId: workspace.id },
    data: {
      status,
      lastContact: new Date(),
      installationAddress: nextInstallationAddress,
    },
  });

  if (!updated.count) {
    throw new Error('Lead not found');
  }

  const row = await prisma.systemLead.findFirst({
    where: { id: leadId, organizationId: workspace.id },
  });
  if (!row) {
    throw new Error('Lead not found');
  }

  const lead = toDto(row);

  const canonical = await upsertCanonicalClientByEmail({
    orgSlug,
    organizationId: workspace.id,
    clerkUserId,
    email,
    fullName: lead.name,
    companyName: lead.company?.trim() ? lead.company.trim() : lead.name,
    phone: lead.phone || null,
  });

  const synced = await upsertClientClientByEmail({
    organizationId: workspace.id,
    fullName: lead.company?.trim() ? lead.company.trim() : lead.name,
    email,
    phone: lead.phone || null,
    metadata: {
      source: 'system_leads',
      systemLeadId: lead.id,
      canonicalClientId: canonical.canonicalClientId,
    },
  });

  const canonicalClientId = canonical.canonicalClientId;

  if (workspace.entitlements?.operations && canonicalClientId) {
    try {
      const existingProject = await prisma.operationsProject.findFirst({
        where: {
          organizationId: workspace.id,
          source: 'system_lead',
          sourceRefId: lead.id,
        },
        select: { id: true },
      });

      if (!existingProject?.id) {
        await prisma.operationsProject.create({
          data: {
            organizationId: workspace.id,
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
      console.error('[system-leads] failed to auto-create operations project', e);
    }
  }

  if (workspace.entitlements?.finance) {
    try {
      const existingInvoice = await prisma.systemInvoice.findFirst({
        where: { leadId: lead.id, organizationId: workspace.id },
        select: { id: true },
      });

      if (!existingInvoice?.id) {
        await prisma.systemInvoice.create({
          data: {
            organizationId: workspace.id,
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
      console.error('[system-leads] failed to auto-create system invoice', e);
    }
  }

  return { ok: true, lead, syncedClientId: synced.clientId };
}
