'use server';

import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { Client, ClientStatus, PricingPlan } from '@/types/social';
import { sendInvitationEmail } from './email';
import { createClientSchema, validateWithSchema } from '@/lib/validation';
import { createErrorResponse, createSuccessResponse } from '@/lib/errorHandler';
import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';
import { requireOrganizationId } from '@/lib/tenant-isolation';
import { resolveStorageUrlMaybeServiceRole, resolveStorageUrlsMaybeBatchedServiceRole } from '@/lib/services/operations/storage';

import { getErrorMessageFromErrorOr as getErrorMessage } from '@/lib/shared/unknown';
const clientClientSelect = {
  id: true,
  organizationId: true,
  fullName: true,
  phone: true,
  email: true,
  notes: true,
  metadata: true,
} satisfies Prisma.ClientClientSelect;

const clientClientPageSelect = {
  id: true,
  organizationId: true,
  fullName: true,
  phone: true,
  email: true,
  notes: true,
  metadata: true,
  createdAt: true,
} satisfies Prisma.ClientClientSelect;

type ClientClientRow = Prisma.ClientClientGetPayload<{ select: typeof clientClientSelect }>;
type ClientClientPageRow = Prisma.ClientClientGetPayload<{ select: typeof clientClientPageSelect }>;

type JsonObjectInput = Record<string, Prisma.InputJsonValue | null>;

function normalizeStrategy(value: unknown): Client['dna']['strategy'] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const obj = value as Record<string, unknown>;
  return {
    targetAudience: safeString(obj.targetAudience, ''),
    painPoints: safeString(obj.painPoints, ''),
    uniqueValue: safeString(obj.uniqueValue, ''),
    competitors: safeString(obj.competitors, ''),
    mainGoal: safeString(obj.mainGoal, ''),
    ...(typeof obj.aiStrategySummary === 'string' ? { aiStrategySummary: obj.aiStrategySummary } : {}),
  };
}

function normalizeClientDna(value: unknown): Client['dna'] {
  const base: Client['dna'] = {
    brandSummary: '',
    voice: { formal: 50, funny: 50, length: 50 },
    vocabulary: { loved: [], forbidden: [] },
    colors: { primary: '#1e293b', secondary: '#334155' },
  };

  if (!value || typeof value !== 'object' || Array.isArray(value)) return base;
  const obj = value as Record<string, unknown>;

  const voiceObj = obj.voice && typeof obj.voice === 'object' && !Array.isArray(obj.voice) ? (obj.voice as Record<string, unknown>) : null;
  const vocabObj =
    obj.vocabulary && typeof obj.vocabulary === 'object' && !Array.isArray(obj.vocabulary)
      ? (obj.vocabulary as Record<string, unknown>)
      : null;
  const colorsObj = obj.colors && typeof obj.colors === 'object' && !Array.isArray(obj.colors) ? (obj.colors as Record<string, unknown>) : null;

  const strategy = normalizeStrategy(obj.strategy);

  return {
    brandSummary: safeString(obj.brandSummary, base.brandSummary),
    voice: {
      formal: safeNumber(voiceObj?.formal, base.voice.formal),
      funny: safeNumber(voiceObj?.funny, base.voice.funny),
      length: safeNumber(voiceObj?.length, base.voice.length),
    },
    vocabulary: {
      loved: Array.isArray(vocabObj?.loved) ? vocabObj.loved.map((v) => String(v)) : base.vocabulary.loved,
      forbidden: Array.isArray(vocabObj?.forbidden) ? vocabObj.forbidden.map((v) => String(v)) : base.vocabulary.forbidden,
    },
    colors: {
      primary: safeString(colorsObj?.primary, base.colors.primary),
      secondary: safeString(colorsObj?.secondary, base.colors.secondary),
    },
    ...(strategy ? { strategy } : {}),
  };
}

function normalizeBusinessMetrics(value: unknown): Client['businessMetrics'] {
  const base: Client['businessMetrics'] = {
    timeSpentMinutes: 0,
    expectedHours: 0,
    punctualityScore: 100,
    responsivenessScore: 100,
    revisionCount: 0,
  };

  if (!value || typeof value !== 'object' || Array.isArray(value)) return base;
  const obj = value as Record<string, unknown>;

  return {
    timeSpentMinutes: safeNumber(obj.timeSpentMinutes, base.timeSpentMinutes),
    expectedHours: safeNumber(obj.expectedHours, base.expectedHours),
    punctualityScore: safeNumber(obj.punctualityScore, base.punctualityScore),
    responsivenessScore: safeNumber(obj.responsivenessScore, base.responsivenessScore),
    revisionCount: safeNumber(obj.revisionCount, base.revisionCount),
    ...(typeof obj.lastAIBusinessAudit === 'string' ? { lastAIBusinessAudit: obj.lastAIBusinessAudit } : {}),
    ...(obj.daysOverdue != null ? { daysOverdue: safeNumber(obj.daysOverdue, 0) } : {}),
  };
}

function safeString(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

function safeNumber(v: unknown, fallback = 0): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function safeBoolean(v: unknown, fallback = false): boolean {
  return typeof v === 'boolean' ? v : fallback;
}


function optionalString(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined;
  const trimmed = v.trim();
  return trimmed ? trimmed : undefined;
}

function optionalOnboardingStatus(v: unknown): Client['onboardingStatus'] {
  return v === 'invited' || v === 'completed' ? v : undefined;
}

function optionalPaymentStatus(v: unknown): Client['paymentStatus'] {
  return v === 'paid' || v === 'pending' || v === 'overdue' ? v : undefined;
}

function randomToken(len = 22): string {
  return Math.random().toString(36).slice(2, 2 + len);
}

function asRecord(value: unknown): JsonObjectInput {
  if (!value || typeof value !== 'object') return {};
  if (Array.isArray(value)) return {};
  const out: JsonObjectInput = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    out[key] = toJsonInput(val);
  }
  return out;
}

function toJsonInput(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function getOrganizationIdFromInvitationMetadata(value: unknown): string | null {
  const record = asRecord(value);
  const orgId = record.organizationId;
  if (typeof orgId !== 'string') return null;
  const trimmed = orgId.trim();
  return trimmed ? trimmed : null;
}

function mapClientClientToSocialClient(row: {
  id: string;
  organizationId: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  metadata: unknown;
}): Client {
  const md = asRecord(row.metadata);

  const companyName = safeString(md.companyName, safeString(md.name, safeString(row.fullName, '')));
  const name = safeString(md.name, companyName || row.fullName);
  const avatar = safeString(md.avatar, `https://i.pravatar.cc/150?u=${encodeURIComponent(String(row.id))}`);

  const portalToken = safeString(md.portalToken, safeString(md.portal_token, ''));

  const businessId = optionalString(md.businessId ?? md.business_id);

  const dna = normalizeClientDna(md.dna);

  const businessMetrics = normalizeBusinessMetrics(md.businessMetrics);

  const internalNotes = row.notes ?? optionalString(md.internalNotes);

  return {
    id: String(row.id),
    name,
    companyName,
    businessId,
    phone: row.phone ?? undefined,
    email: row.email ?? undefined,
    avatar,
    brandVoice: safeString(md.brandVoice, safeString(md.brand_voice, '')),
    dna,
    credentials: Array.isArray(md.credentials) ? (md.credentials as Client['credentials']) : [],
    postingRhythm: safeString(md.postingRhythm, safeString(md.posting_rhythm, '3 פעמים בשבוע')),
    status: (md.status as ClientStatus) || 'Onboarding',
    activePlatforms: Array.isArray(md.activePlatforms) ? (md.activePlatforms as Client['activePlatforms']) : [],
    quotas: Array.isArray(md.quotas) ? (md.quotas as Client['quotas']) : [],
    onboardingStatus: optionalOnboardingStatus(md.onboardingStatus ?? md.onboarding_status),
    invitationToken: optionalString(md.invitationToken ?? md.invitation_token),
    portalToken,
    color: safeString(md.color, '#1e293b'),
    plan: (md.plan as PricingPlan | undefined) ?? undefined,
    monthlyFee: md.monthlyFee != null ? safeNumber(md.monthlyFee) : undefined,
    nextPaymentDate: optionalString(md.nextPaymentDate),
    nextPaymentAmount: md.nextPaymentAmount != null ? safeNumber(md.nextPaymentAmount) : undefined,
    paymentStatus: optionalPaymentStatus(md.paymentStatus),
    autoRemindersEnabled: safeBoolean(md.autoRemindersEnabled, true),
    savedCardThumbnail: optionalString(md.savedCardThumbnail),
    businessMetrics,
    internalNotes,
    organizationId: String(row.organizationId),
  };
}

function getDefaultAvatarForClientId(clientId: string): string {
  return `https://i.pravatar.cc/150?u=${encodeURIComponent(String(clientId))}`;
}

async function resolveClientAvatarMaybe(client: Client, organizationId: string): Promise<Client> {
  const ttlSeconds = 60 * 60;
  const signed = await resolveStorageUrlMaybeServiceRole(client.avatar, ttlSeconds, { organizationId });
  const fallback =
    typeof client.avatar === 'string' && client.avatar.startsWith('sb://')
      ? getDefaultAvatarForClientId(client.id)
      : String(client.avatar || '');
  return { ...client, avatar: signed ?? fallback };
}

async function resolveClientsAvatarsMaybe(clients: Client[], organizationId: string): Promise<Client[]> {
  const list = Array.isArray(clients) ? clients : [];
  if (list.length === 0) return [];

  const ttlSeconds = 60 * 60;
  const refsOrUrls = list.map((c) => c.avatar);
  const resolved = await resolveStorageUrlsMaybeBatchedServiceRole(refsOrUrls, ttlSeconds, { organizationId });

  return list.map((c, idx) => {
    const signed = resolved[idx] ?? null;
    if (signed) return { ...c, avatar: signed };
    if (typeof c.avatar === 'string' && c.avatar.startsWith('sb://')) {
      return { ...c, avatar: getDefaultAvatarForClientId(c.id) };
    }
    return { ...c, avatar: String(c.avatar || '') };
  });
}

/**
 * Server Action: Get all clients for the current user
 * Filters by organization - only shows clients from user's organization
 * Super admin sees all clients
 */
export async function getClients(
  clerkUserId?: string,
  orgId?: string
): Promise<{ success: boolean; data?: Client[]; error?: string }> {
  try {
    // Get user info (role and organizationId)
    let userRole: string | undefined;
    let userOrganizationId: string | undefined;
    
    if (clerkUserId) {
      const { getCurrentUserInfo } = await import('@/app/actions/users');
      const userInfo = await getCurrentUserInfo();
      if (userInfo.success) {
        userRole = userInfo.role;
        userOrganizationId = userInfo.organizationId;
      }
    }

    // If orgId is provided (workspace route), enforce access and use it as source of truth
    // This enables true multi-workspace behavior.
    if (orgId) {
      const workspace = await requireWorkspaceAccessByOrgSlug(orgId);
      const resolvedOrganizationId = String(workspace?.id || '').trim();
      if (!resolvedOrganizationId) {
        throw new Error('Missing organizationId');
      }
      userOrganizationId = resolvedOrganizationId;
    }

    // Filter by organization
    // If orgId is explicitly provided -> ALWAYS filter by it (prevents leakage and enables workspace switching)
    // Otherwise keep legacy behavior (super_admin sees all, others filtered by their organization)
    if (userOrganizationId) {
      // ok
    } else {
      // Emergency isolation: do NOT allow any unscoped read, even for super_admin.
      // Fail closed to prevent cross-tenant leakage.
      return {
        success: false,
        error: 'חסר organization_id להקשר. (Tenant Isolation lockdown: קריאה ללא סינון חסומה)'
      };
    }

    const organizationId = String(userOrganizationId);
    const pageSize = 200;
    const maxTotal = 500;
    let cursor: ClientsCursor | null = null;
    const acc: Client[] = [];

    while (acc.length < maxTotal) {
      const where: Prisma.ClientClientWhereInput = {
        organizationId,
        ...(cursor
          ? {
              OR: [
                { createdAt: { lt: new Date(cursor.createdAt) } },
                { createdAt: { equals: new Date(cursor.createdAt) }, id: { lt: cursor.id } },
              ],
            }
          : {}),
      };

      const rows = await prisma.clientClient.findMany({
        where,
        select: clientClientPageSelect,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: pageSize + 1,
      });

      const list = Array.isArray(rows) ? rows : [];
      const hasMore = list.length > pageSize;
      const trimmed = hasMore ? list.slice(0, pageSize) : list;

      acc.push(...trimmed.map((row: ClientClientPageRow) => mapClientClientToSocialClient(row)));

      if (!hasMore) break;
      const last = trimmed[trimmed.length - 1];
      if (!last?.id || !last?.createdAt) break;
      cursor = { createdAt: last.createdAt.toISOString(), id: String(last.id) };
    }

    const resolved = await resolveClientsAvatarsMaybe(acc.slice(0, maxTotal), organizationId);
    return { success: true, data: resolved };
  } catch (error: unknown) {
    console.error('Error in getClients:', error);
    const message = error instanceof Error && error.message ? error.message : 'שגיאה בטעינת לקוחות';
    return { success: false, error: message };
  }
}

type ClientsCursor = {
  createdAt: string;
  id: string;
};

function encodeClientsCursor(cursor: ClientsCursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64');
}

function decodeClientsCursor(raw?: string | null): ClientsCursor | null {
  const v = String(raw || '').trim();
  if (!v) return null;
  try {
    const parsed = JSON.parse(Buffer.from(v, 'base64').toString('utf8')) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    const rec = parsed as Record<string, unknown>;
    const createdAt = typeof rec.createdAt === 'string' ? rec.createdAt.trim() : '';
    const id = typeof rec.id === 'string' ? rec.id.trim() : '';
    if (!createdAt || !id) return null;
    const d = new Date(createdAt);
    if (Number.isNaN(d.getTime())) return null;
    return { createdAt: d.toISOString(), id };
  } catch {
    return null;
  }
}

export async function getClientsPage(params: {
  orgSlug: string;
  cursor?: string | null;
  pageSize?: number;
  query?: string;
  plan?: string;
  onboardingStatus?: string;
}): Promise<
  | { success: true; data: { clients: Client[]; nextCursor: string | null; hasMore: boolean } }
  | { success: false; error: string }
> {
  try {
    const orgSlug = String(params.orgSlug || '').trim();
    if (!orgSlug) return { success: false, error: 'orgSlug חסר' };

    const workspace = await requireWorkspaceAccessByOrgSlug(orgSlug);
    const organizationId = requireOrganizationId('getClientsPage', workspace.id);

    const pageSize = Math.min(200, Math.max(1, Math.floor(params.pageSize ?? 60)));
    const cursor = decodeClientsCursor(params.cursor);

    const q = String(params.query || '').trim();
    const plan = String(params.plan || '').trim();
    const onboardingStatus = String(params.onboardingStatus || '').trim();

    const where: Prisma.ClientClientWhereInput = {
      organizationId: String(organizationId),
    };

    const and: Prisma.ClientClientWhereInput[] = [];

    if (q) {
      where.OR = [
        { fullName: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (plan) {
      and.push({ metadata: { path: ['plan'], equals: plan } });
    }

    if (onboardingStatus) {
      and.push({ metadata: { path: ['onboardingStatus'], equals: onboardingStatus } });
    }

    if (cursor) {
      and.push({
        OR: [
          { createdAt: { lt: new Date(cursor.createdAt) } },
          { createdAt: { equals: new Date(cursor.createdAt) }, id: { lt: cursor.id } },
        ],
      });
    }

    if (and.length > 0) {
      where.AND = and;
    }

    const rows = await prisma.clientClient.findMany({
      where,
      select: clientClientPageSelect,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: pageSize + 1,
    });

    const list = Array.isArray(rows) ? rows : [];
    const hasMore = list.length > pageSize;
    const trimmed = hasMore ? list.slice(0, pageSize) : list;

    const clients: Client[] = trimmed.map((row: ClientClientPageRow) => mapClientClientToSocialClient(row));

    const resolvedClients = await resolveClientsAvatarsMaybe(clients, String(organizationId));

    const last = trimmed[trimmed.length - 1];
    const nextCursor = hasMore && last?.id && last?.createdAt
      ? encodeClientsCursor({ createdAt: last.createdAt.toISOString(), id: String(last.id) })
      : null;

    return { success: true, data: { clients: resolvedClients, nextCursor, hasMore } };
  } catch (error: unknown) {
    console.error('Error in getClientsPage:', error);
    return { success: false, error: getErrorMessage(error, 'שגיאה בטעינת לקוחות') };
  }
}

export async function getClientByIdForWorkspace(params: {
  orgSlug: string;
  clientId: string;
}): Promise<{ success: true; data: Client } | { success: false; error: string }> {
  try {
    const orgSlug = String(params.orgSlug || '').trim();
    const clientId = String(params.clientId || '').trim();
    if (!orgSlug) return { success: false, error: 'orgSlug חסר' };
    if (!clientId) return { success: false, error: 'clientId חסר' };

    const workspace = await requireWorkspaceAccessByOrgSlug(orgSlug);
    const organizationId = requireOrganizationId('getClientByIdForWorkspace', workspace.id);

    const row = await prisma.clientClient.findFirst({
      where: { id: clientId, organizationId: String(organizationId) },
      select: {
        id: true,
        organizationId: true,
        fullName: true,
        phone: true,
        email: true,
        notes: true,
        metadata: true,
      },
    });

    if (!row?.id) return { success: false, error: 'לקוח לא נמצא' };
    const client = mapClientClientToSocialClient(row);
    const resolved = await resolveClientAvatarMaybe(client, String(organizationId));
    return { success: true, data: resolved };
  } catch (error: unknown) {
    console.error('Error in getClientByIdForWorkspace:', error);
    return { success: false, error: getErrorMessage(error, 'שגיאה בטעינת לקוח') };
  }
}

export async function createClientInvitationLinkForWorkspace(params: {
  orgSlug: string;
  clientId: string;
  clerkUserId: string;
  expiresInDays?: number;
  source?: string;
  metadata?: Record<string, unknown>;
}): Promise<{ success: boolean; token?: string; error?: string }> {
  try {
    const resolvedOrgSlug = String(params.orgSlug || '').trim();
    if (!resolvedOrgSlug) {
      return { success: false, error: 'orgSlug חסר' };
    }
    if (!params.clientId) {
      return { success: false, error: 'clientId חסר' };
    }
    if (!params.clerkUserId) {
      return { success: false, error: 'לא מחובר' };
    }

    // Enforce workspace access (orgSlug is the source of truth)
    const workspace = await requireWorkspaceAccessByOrgSlug(resolvedOrgSlug);
    let organizationId: string;
    try {
      organizationId = requireOrganizationId('createClientInvitationLinkForWorkspace', workspace.id);
    } catch {
      return { success: false, error: 'ארגון לא נמצא' };
    }

    // Token generation: 32 hex chars (similar to existing generateInvitationToken, but without DB read dependency)
    const token = crypto.randomUUID().replace(/-/g, '').toUpperCase();

    const expiresInDays = typeof params.expiresInDays === 'number' ? params.expiresInDays : 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    await prisma.system_invitation_links.create({
      data: {
        token,
        client_id: params.clientId,
        created_by: null,
        expires_at: expiresAt,
        is_used: false,
        is_active: true,
        source: params.source || 'social',
        metadata: {
          ...(params.metadata || {}),
          orgSlug: resolvedOrgSlug,
          organizationId,
          organization_id: organizationId,
        },
      },
      select: { id: true },
    });

    return { success: true, token };
  } catch (error: unknown) {
    console.error('Error in createClientInvitationLinkForWorkspace:', error);
    return { success: false, error: getErrorMessage(error, 'שגיאה ביצירת לינק הזמנה') };
  }
}

export async function createClientForWorkspace(
  orgSlug: string,
  clientData: Partial<Client>,
  clerkUserId: string
): Promise<{ success: boolean; data?: Client; error?: string }> {
  try {
    const resolvedOrgSlug = String(orgSlug || '').trim();
    if (!resolvedOrgSlug) {
      return createErrorResponse(new Error('orgSlug is required'), 'שגיאה: ארגון חסר');
    }

    const validation = validateWithSchema(createClientSchema, clientData);
    if (!validation.success) {
      return validation;
    }

    const workspace = await requireWorkspaceAccessByOrgSlug(resolvedOrgSlug);
    let organizationId: string;
    try {
      organizationId = requireOrganizationId('createClientForWorkspace', workspace.id);
    } catch {
      return createErrorResponse(new Error('Organization not found'), 'שגיאה: ארגון לא נמצא');
    }

    const normalizedEmail = (clientData.email || '').trim().toLowerCase();
    const invitationToken = clientData.invitationToken || randomToken(14);
    const portalToken = clientData.portalToken || randomToken(22);

    const cleanCompanyName = String(clientData.companyName || '').trim();
    const cleanName = String(clientData.name || '').trim();
    const requiredName = cleanName || cleanCompanyName || 'לקוח חדש';
    const requiredCompanyName = cleanCompanyName || requiredName;

    const metadata: JsonObjectInput = {
      name: requiredName,
      companyName: requiredCompanyName,
      businessId: clientData.businessId ?? null,
      avatar: clientData.avatar ?? '',
      brandVoice: clientData.brandVoice ?? '',
      postingRhythm: clientData.postingRhythm ?? '3 פעמים בשבוע',
      status: clientData.status ?? ('Onboarding' as ClientStatus),
      onboardingStatus: clientData.onboardingStatus ?? 'invited',
      invitationToken,
      portalToken,
      color: clientData.color ?? '#1e293b',
      plan: clientData.plan ?? null,
      monthlyFee: clientData.monthlyFee ?? null,
      nextPaymentDate: clientData.nextPaymentDate ?? null,
      nextPaymentAmount: clientData.nextPaymentAmount ?? null,
      paymentStatus: clientData.paymentStatus ?? 'pending',
      autoRemindersEnabled: clientData.autoRemindersEnabled ?? true,
      savedCardThumbnail: clientData.savedCardThumbnail ?? null,
      businessMetrics: clientData.businessMetrics ? toJsonInput(clientData.businessMetrics) : null,
      dna: clientData.dna ? toJsonInput(clientData.dna) : null,
      credentials: clientData.credentials ? toJsonInput(clientData.credentials) : toJsonInput([]),
      activePlatforms: clientData.activePlatforms ? toJsonInput(clientData.activePlatforms) : toJsonInput([]),
      quotas: clientData.quotas ? toJsonInput(clientData.quotas) : toJsonInput([]),
      legacy: toJsonInput({
        source: 'social_os',
      }),
    };

    let row:
      | ClientClientRow
      | null = null;

    if (normalizedEmail) {
      const existing = await prisma.clientClient.findFirst({
        where: {
          organizationId,
          email: {
            equals: normalizedEmail,
            mode: 'insensitive',
          },
        },
        select: {
          id: true,
          organizationId: true,
          fullName: true,
          phone: true,
          email: true,
          notes: true,
          metadata: true,
        },
      });

      if (existing?.id) {
        const merged: JsonObjectInput = { ...asRecord(existing.metadata), ...metadata };
        const updated = await prisma.clientClient.updateMany({
          where: { id: existing.id, organizationId },
          data: {
            fullName: requiredCompanyName,
            phone: clientData.phone ?? existing.phone ?? null,
            email: normalizedEmail,
            notes: clientData.internalNotes ?? existing.notes ?? null,
            metadata: merged,
          },
        });
        if (!updated.count) {
          return { success: false, error: 'שגיאה בעדכון לקוח' };
        }

        row = await prisma.clientClient.findFirst({
          where: { id: existing.id, organizationId },
          select: {
            id: true,
            organizationId: true,
            fullName: true,
            phone: true,
            email: true,
            notes: true,
            metadata: true,
          },
        });
      }
    }

    if (!row) {
      row = await prisma.clientClient.create({
        data: {
          organizationId,
          fullName: requiredCompanyName,
          phone: clientData.phone ?? null,
          email: normalizedEmail ? normalizedEmail : null,
          notes: clientData.internalNotes ?? null,
          metadata,
        },
        select: {
          id: true,
          organizationId: true,
          fullName: true,
          phone: true,
          email: true,
          notes: true,
          metadata: true,
        },
      });
    }

    const client = mapClientClientToSocialClient(row);
    const resolved = await resolveClientAvatarMaybe(client, String(organizationId));
    return { success: true, data: resolved };
  } catch (error: unknown) {
    console.error('Error in createClientForWorkspace:', error);
    return { success: false, error: getErrorMessage(error, 'שגיאה ביצירת לקוח') };
  }
}

/**
 * Server Action: Create a new client
 */
export async function createClient(
  clientData: Partial<Client>,
  clerkUserId: string
): Promise<{ success: boolean; data?: Client; error?: string }> {
  try {
    // Validate input
    const validation = validateWithSchema(createClientSchema, clientData);
    if (!validation.success) {
      return validation;
    }

    const { getCurrentUserInfo } = await import('@/app/actions/users');
    const userInfo = await getCurrentUserInfo();
    if (!userInfo.success) {
      return createErrorResponse(new Error('שגיאה בקבלת פרטי משתמש'), userInfo.error || 'שגיאה בקבלת פרטי משתמש');
    }

    const organizationId = clientData.organizationId || userInfo.organizationId;
    if (!organizationId) {
      return createErrorResponse(new Error('חסר organizationId'), 'לא ניתן ליצור לקוח ללא ארגון');
    }

    const normalizedEmail = (clientData.email || '').trim().toLowerCase();
    const invitationToken = clientData.invitationToken || randomToken(14);
    const portalToken = clientData.portalToken || randomToken(22);

    const requiredName = String(clientData.name || '').trim() || String(clientData.companyName || '').trim() || 'לקוח חדש';
    const requiredCompanyName = String(clientData.companyName || '').trim() || requiredName;

    const metadata: JsonObjectInput = {
      name: requiredName,
      companyName: requiredCompanyName,
      businessId: clientData.businessId ?? null,
      avatar: clientData.avatar ?? '',
      brandVoice: clientData.brandVoice ?? '',
      postingRhythm: clientData.postingRhythm ?? '3 פעמים בשבוע',
      status: clientData.status ?? ('Onboarding' as ClientStatus),
      onboardingStatus: clientData.onboardingStatus ?? 'invited',
      invitationToken,
      portalToken,
      color: clientData.color ?? '#1e293b',
      plan: clientData.plan ?? null,
      monthlyFee: clientData.monthlyFee ?? null,
      paymentStatus: clientData.paymentStatus ?? 'pending',
      autoRemindersEnabled: clientData.autoRemindersEnabled ?? true,
      savedCardThumbnail: clientData.savedCardThumbnail ?? null,
      businessMetrics: clientData.businessMetrics ? toJsonInput(clientData.businessMetrics) : null,
      dna: clientData.dna ? toJsonInput(clientData.dna) : null,
      credentials: clientData.credentials ? toJsonInput(clientData.credentials) : toJsonInput([]),
      activePlatforms: clientData.activePlatforms ? toJsonInput(clientData.activePlatforms) : toJsonInput([]),
      quotas: clientData.quotas ? toJsonInput(clientData.quotas) : toJsonInput([]),
    };

    const created = await prisma.clientClient.create({
      data: {
        organizationId: String(organizationId),
        fullName: requiredCompanyName,
        phone: clientData.phone ?? null,
        email: normalizedEmail ? normalizedEmail : null,
        notes: clientData.internalNotes ?? null,
        metadata,
      },
      select: {
        id: true,
        organizationId: true,
        fullName: true,
        phone: true,
        email: true,
        notes: true,
        metadata: true,
      },
    });

    const client = mapClientClientToSocialClient(created);
    const resolved = await resolveClientAvatarMaybe(client, String(organizationId));
    return { success: true, data: resolved };
  } catch (error: unknown) {
    console.error('Error in createClient:', error);
    return { success: false, error: getErrorMessage(error, 'שגיאה ביצירת לקוח') };
  }
}

/**
 * Server Action: Update a client
 */
export async function updateClient(
  clientId: string,
  updates: Partial<Client>
): Promise<{ success: boolean; data?: Client; error?: string }> {
  try {
    const { getCurrentUserInfo } = await import('@/app/actions/users');
    const userInfo = await getCurrentUserInfo();
    if (!userInfo.success || !userInfo.organizationId) {
      return { success: false, error: 'אין הרשאה' };
    }

    const orgId = String(userInfo.organizationId);
    const existing = await prisma.clientClient.findFirst({
      where: { id: String(clientId), organizationId: orgId },
      select: { id: true, organizationId: true, fullName: true, phone: true, email: true, notes: true, metadata: true },
    });
    if (!existing) {
      return { success: false, error: 'לקוח לא נמצא' };
    }

    const mdPatch: JsonObjectInput = {};
    if (updates.name !== undefined) mdPatch.name = updates.name;
    if (updates.companyName !== undefined) mdPatch.companyName = updates.companyName;
    if (updates.businessId !== undefined) mdPatch.businessId = updates.businessId;
    if (updates.avatar !== undefined) mdPatch.avatar = updates.avatar;
    if (updates.brandVoice !== undefined) mdPatch.brandVoice = updates.brandVoice;
    if (updates.postingRhythm !== undefined) mdPatch.postingRhythm = updates.postingRhythm;
    if (updates.status !== undefined) mdPatch.status = updates.status;
    if (updates.onboardingStatus !== undefined) mdPatch.onboardingStatus = updates.onboardingStatus;
    if (updates.plan !== undefined) mdPatch.plan = updates.plan;
    if (updates.monthlyFee !== undefined) mdPatch.monthlyFee = updates.monthlyFee;
    if (updates.nextPaymentDate !== undefined) mdPatch.nextPaymentDate = updates.nextPaymentDate;
    if (updates.nextPaymentAmount !== undefined) mdPatch.nextPaymentAmount = updates.nextPaymentAmount;
    if (updates.paymentStatus !== undefined) mdPatch.paymentStatus = updates.paymentStatus;
    if (updates.autoRemindersEnabled !== undefined) mdPatch.autoRemindersEnabled = updates.autoRemindersEnabled;
    if (updates.savedCardThumbnail !== undefined) mdPatch.savedCardThumbnail = updates.savedCardThumbnail;
    if (updates.businessMetrics !== undefined) mdPatch.businessMetrics = updates.businessMetrics ? toJsonInput(updates.businessMetrics) : null;
    if (updates.dna !== undefined) mdPatch.dna = updates.dna ? toJsonInput(updates.dna) : null;
    if (updates.credentials !== undefined) mdPatch.credentials = updates.credentials ? toJsonInput(updates.credentials) : toJsonInput([]);
    if (updates.activePlatforms !== undefined) mdPatch.activePlatforms = updates.activePlatforms ? toJsonInput(updates.activePlatforms) : toJsonInput([]);
    if (updates.quotas !== undefined) mdPatch.quotas = updates.quotas ? toJsonInput(updates.quotas) : toJsonInput([]);
    if (updates.invitationToken !== undefined) mdPatch.invitationToken = updates.invitationToken;
    if (updates.portalToken !== undefined) mdPatch.portalToken = updates.portalToken;
    if (updates.color !== undefined) mdPatch.color = updates.color;

    const merged: JsonObjectInput = { ...asRecord(existing.metadata), ...mdPatch };

    const updated = await prisma.clientClient.updateMany({
      where: { id: existing.id, organizationId: orgId },
      data: {
        fullName: updates.companyName ?? updates.name ?? existing.fullName,
        phone: updates.phone ?? existing.phone,
        email: updates.email != null ? String(updates.email) : existing.email,
        notes: updates.internalNotes != null ? String(updates.internalNotes) : existing.notes,
        metadata: merged,
      },
    });
    if (!updated.count) {
      return { success: false, error: 'שגיאה בעדכון לקוח' };
    }

    return { success: true };
  } catch (error: unknown) {
    console.error('Error in updateClient:', error);
    return { success: false, error: getErrorMessage(error, 'שגיאה בעדכון לקוח') };
  }
}

export async function updateClientForWorkspace(
  orgSlug: string,
  clientId: string,
  updates: Partial<Client>
): Promise<{ success: boolean; data?: Client; error?: string }> {
  try {
    const resolvedOrgSlug = String(orgSlug || '').trim();
    if (!resolvedOrgSlug) {
      return { success: false, error: 'orgSlug חסר' };
    }
    if (!clientId) {
      return { success: false, error: 'clientId חסר' };
    }

    const workspace = await requireWorkspaceAccessByOrgSlug(resolvedOrgSlug);
    let organizationId: string;
    try {
      organizationId = requireOrganizationId('updateClientForWorkspace', workspace.id);
    } catch {
      return { success: false, error: 'ארגון לא נמצא' };
    }

    const existing = await prisma.clientClient.findFirst({
      where: { id: String(clientId), organizationId },
      select: {
        id: true,
        organizationId: true,
        fullName: true,
        phone: true,
        email: true,
        notes: true,
        metadata: true,
      },
    });

    if (!existing) {
      return { success: false, error: 'לקוח לא נמצא' };
    }

    const mdPatch: JsonObjectInput = {};
    if (updates.name !== undefined) mdPatch.name = updates.name;
    if (updates.companyName !== undefined) mdPatch.companyName = updates.companyName;
    if (updates.businessId !== undefined) mdPatch.businessId = updates.businessId;
    if (updates.avatar !== undefined) mdPatch.avatar = updates.avatar;
    if (updates.brandVoice !== undefined) mdPatch.brandVoice = updates.brandVoice;
    if (updates.postingRhythm !== undefined) mdPatch.postingRhythm = updates.postingRhythm;
    if (updates.status !== undefined) mdPatch.status = updates.status;
    if (updates.onboardingStatus !== undefined) mdPatch.onboardingStatus = updates.onboardingStatus;
    if (updates.plan !== undefined) mdPatch.plan = updates.plan;
    if (updates.monthlyFee !== undefined) mdPatch.monthlyFee = updates.monthlyFee;
    if (updates.nextPaymentDate !== undefined) mdPatch.nextPaymentDate = updates.nextPaymentDate;
    if (updates.nextPaymentAmount !== undefined) mdPatch.nextPaymentAmount = updates.nextPaymentAmount;
    if (updates.paymentStatus !== undefined) mdPatch.paymentStatus = updates.paymentStatus;
    if (updates.autoRemindersEnabled !== undefined) mdPatch.autoRemindersEnabled = updates.autoRemindersEnabled;
    if (updates.savedCardThumbnail !== undefined) mdPatch.savedCardThumbnail = updates.savedCardThumbnail;
    if (updates.businessMetrics !== undefined) mdPatch.businessMetrics = updates.businessMetrics ? toJsonInput(updates.businessMetrics) : null;
    if (updates.dna !== undefined) mdPatch.dna = updates.dna ? toJsonInput(updates.dna) : null;
    if (updates.credentials !== undefined) mdPatch.credentials = updates.credentials ? toJsonInput(updates.credentials) : toJsonInput([]);
    if (updates.activePlatforms !== undefined) mdPatch.activePlatforms = updates.activePlatforms ? toJsonInput(updates.activePlatforms) : toJsonInput([]);
    if (updates.quotas !== undefined) mdPatch.quotas = updates.quotas ? toJsonInput(updates.quotas) : toJsonInput([]);
    if (updates.invitationToken !== undefined) mdPatch.invitationToken = updates.invitationToken;
    if (updates.portalToken !== undefined) mdPatch.portalToken = updates.portalToken;
    if (updates.color !== undefined) mdPatch.color = updates.color;

    const merged: JsonObjectInput = { ...asRecord(existing.metadata), ...mdPatch };

    const updated = await prisma.clientClient.updateMany({
      where: { id: existing.id, organizationId },
      data: {
        fullName: updates.companyName ?? updates.name ?? existing.fullName,
        phone: updates.phone ?? existing.phone,
        email: updates.email != null ? String(updates.email) : existing.email,
        notes: updates.internalNotes != null ? String(updates.internalNotes) : existing.notes,
        metadata: merged,
      },
    });

    if (!updated.count) {
      return { success: false, error: 'לקוח לא נמצא' };
    }

    return { success: true };
  } catch (error: unknown) {
    console.error('Error in updateClientForWorkspace:', error);
    return { success: false, error: getErrorMessage(error, 'שגיאה בעדכון לקוח') };
  }
}

/**
 * Server Action: Delete a client
 */
export async function deleteClient(clientId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { getCurrentUserInfo } = await import('@/app/actions/users');
    const userInfo = await getCurrentUserInfo();
    if (!userInfo.success || !userInfo.organizationId) {
      return { success: false, error: 'אין הרשאה' };
    }

    const deleted = await prisma.clientClient.deleteMany({
      where: { id: String(clientId), organizationId: String(userInfo.organizationId) },
    });

    if (!deleted.count) {
      return { success: false, error: 'לקוח לא נמצא' };
    }

    return { success: true };
  } catch (error: unknown) {
    console.error('Error in deleteClient:', error);
    return { success: false, error: getErrorMessage(error, 'שגיאה במחיקת לקוח') };
  }
}

export async function deleteClientForWorkspace(
  orgSlug: string,
  clientId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const resolvedOrgSlug = String(orgSlug || '').trim();
    if (!resolvedOrgSlug) {
      return { success: false, error: 'orgSlug חסר' };
    }
    if (!clientId) {
      return { success: false, error: 'clientId חסר' };
    }

    const workspace = await requireWorkspaceAccessByOrgSlug(resolvedOrgSlug);
    let organizationId: string;
    try {
      organizationId = requireOrganizationId('deleteClientForWorkspace', workspace.id);
    } catch {
      return { success: false, error: 'ארגון לא נמצא' };
    }

    const deleted = await prisma.clientClient.deleteMany({
      where: { id: String(clientId), organizationId: String(organizationId) },
    });

    if (!deleted.count) {
      return { success: false, error: 'לקוח לא נמצא' };
    }

    return { success: true };
  } catch (error: unknown) {
    console.error('Error in deleteClientForWorkspace:', error);
    return { success: false, error: getErrorMessage(error, 'שגיאה במחיקת לקוח') };
  }
}

/**
 * Server Action: Send invitation email to client
 */
export async function inviteClient(
  clientId: string,
  invitationLink: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { getCurrentUserInfo } = await import('@/app/actions/users');
    const userInfo = await getCurrentUserInfo();
    if (!userInfo.success || !userInfo.organizationId) {
      return { success: false, error: 'אין הרשאה' };
    }

    const row = await prisma.clientClient.findFirst({
      where: { id: String(clientId), organizationId: String(userInfo.organizationId) },
      select: { fullName: true, email: true, metadata: true },
    });

    if (!row) {
      return { success: false, error: 'לקוח לא נמצא' };
    }

    const md = asRecord(row.metadata);
    const clientEmail = row.email ? String(row.email) : '';
    if (!clientEmail) {
      return { success: false, error: 'אימייל הלקוח לא הוגדר' };
    }

    const planNames: Record<string, string> = {
      starter: 'Starter',
      pro: 'Professional',
      agency: 'Agency',
      custom: 'Custom',
    };

    const planKey = String(md.plan || 'pro');
    const planName = planNames[planKey] || 'Professional';
    const planPrice = md.monthlyFee != null ? safeNumber(md.monthlyFee, 2990) : 2990;

    // Send invitation email
    const emailResult = await sendInvitationEmail({
      clientName: String(md.name || row.fullName || 'לקוח'),
      clientEmail,
      invitationLink,
      planName,
      planPrice,
    });

    if (!emailResult.success) {
      return {
        success: false,
        error: emailResult.error || 'שגיאה בשליחת מייל הזמנה',
      };
    }

    return {
      success: true,
    };
  } catch (error: unknown) {
    console.error('Error in inviteClient:', error);
    return { success: false, error: getErrorMessage(error, 'שגיאה בהזמנת לקוח') };
  }
}

export async function inviteClientForWorkspace(
  orgSlug: string,
  clientId: string,
  invitationLink: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const resolvedOrgSlug = String(orgSlug || '').trim();
    if (!resolvedOrgSlug) {
      return { success: false, error: 'orgSlug חסר' };
    }
    if (!clientId) {
      return { success: false, error: 'clientId חסר' };
    }

    const workspace = await requireWorkspaceAccessByOrgSlug(resolvedOrgSlug);
    let organizationId: string;
    try {
      organizationId = requireOrganizationId('inviteClientForWorkspace', workspace.id);
    } catch {
      return { success: false, error: 'ארגון לא נמצא' };
    }

    const row = await prisma.clientClient.findFirst({
      where: { id: String(clientId), organizationId: String(organizationId) },
      select: { fullName: true, email: true, metadata: true },
    });

    if (!row) {
      return { success: false, error: 'לקוח לא נמצא' };
    }

    const md = asRecord(row.metadata);
    const clientEmail = row.email ? String(row.email) : '';
    if (!clientEmail) {
      return { success: false, error: 'אימייל הלקוח לא הוגדר' };
    }

    const planNames: Record<string, string> = {
      starter: 'Starter',
      pro: 'Professional',
      agency: 'Agency',
      custom: 'Custom',
    };

    const planKey = String(md.plan || 'pro');
    const planName = planNames[planKey] || 'Professional';
    const planPrice = md.monthlyFee != null ? safeNumber(md.monthlyFee, 2990) : 2990;

    const emailResult = await sendInvitationEmail({
      clientName: String(md.name || row.fullName || 'לקוח'),
      clientEmail,
      invitationLink,
      planName,
      planPrice,
    });

    if (!emailResult.success) {
      return {
        success: false,
        error: emailResult.error || 'שגיאה בשליחת מייל הזמנה',
      };
    }

    return { success: true };
  } catch (error: unknown) {
    console.error('Error in inviteClientForWorkspace:', error);
    return { success: false, error: getErrorMessage(error, 'שגיאה בהזמנת לקוח') };
  }
}

/**
 * Server Action: Get client by invitation token (public, no auth required)
 */
export async function getClientByInvitationToken(
  invitationToken: string
): Promise<{ success: boolean; data?: Client; error?: string }> {
  try {
    if (!invitationToken) {
      return {
        success: false,
        error: 'טוקן הזמנה חסר',
      };
    }

    const link = await prisma.system_invitation_links.findUnique({
      where: { token: String(invitationToken) },
      select: {
        token: true,
        client_id: true,
        is_used: true,
        is_active: true,
        used_at: true,
        expires_at: true,
        metadata: true,
      },
    });

    if (!link) {
      return { success: false, error: 'טוקן הזמנה לא תקין או שהלקוח לא נמצא' };
    }

    if (link.is_used) {
      return { success: false, error: 'ההזמנה כבר הושלמה או לא תקינה' };
    }
    if (link.expires_at && new Date(link.expires_at).getTime() < Date.now()) {
      return { success: false, error: 'טוקן הזמנה לא תקין או שהלקוח לא נמצא' };
    }
    if (link.is_active === false) {
      return { success: false, error: 'ההזמנה כבר הושלמה או לא תקינה' };
    }
    if (!link.client_id) {
      return { success: false, error: 'טוקן הזמנה לא תקין או שהלקוח לא נמצא' };
    }

    const organizationId = getOrganizationIdFromInvitationMetadata(link.metadata);
    if (!organizationId) {
      return { success: false, error: 'חסר organizationId להקשר. (Tenant Isolation lockdown: קריאה ללא סינון חסומה)' };
    }

    const row = await prisma.clientClient.findFirst({
      where: { id: String(link.client_id), organizationId },
      select: {
        id: true,
        organizationId: true,
        fullName: true,
        phone: true,
        email: true,
        notes: true,
        metadata: true,
      },
    });
    if (!row) {
      return { success: false, error: 'טוקן הזמנה לא תקין או שהלקוח לא נמצא' };
    }

    const client = mapClientClientToSocialClient(row);
    if (client.onboardingStatus && String(client.onboardingStatus) !== 'invited') {
      return { success: false, error: 'ההזמנה כבר הושלמה או לא תקינה' };
    }

    const resolved = await resolveClientAvatarMaybe(client, String(organizationId));
    return { success: true, data: resolved };
  } catch (error: unknown) {
    console.error('Error in getClientByInvitationToken:', error);
    return { success: false, error: getErrorMessage(error, 'שגיאה בטעינת לקוח') };
  }
}

