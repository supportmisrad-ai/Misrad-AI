'use server';

import { sendInvitationEmail } from '@/app/actions/email';
import { createClientSchema, validateWithSchema } from '@/lib/validation';
import { createErrorResponse, createSuccessResponse } from '@/lib/errorHandler';
import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';
import { requireOrganizationId } from '@/lib/tenant-isolation';
import type { BusinessMetrics, Client, ClientDNA, ClientStatus, PricingPlan, StrategicCharacterization } from '@/types/social';
import { createClinicClient, updateClinicClient } from '@/app/actions/client-clinic';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

import { getErrorMessageFromErrorOr as getErrorMessage } from '@/lib/shared/unknown';
import { getOrganizationEntitlements } from '@/lib/server/workspace-access/entitlements';
import { insertMisradNotificationsForOrganizationId } from '@/lib/services/system/notifications';
type ClientClientsRow = {
  id: string;
  organization_id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  metadata: unknown;
  created_at?: string;
  updated_at?: string;
};

export type ClientLite = {
  id: string;
  companyName: string;
  avatar: string;
  postingRhythm: string;
  onboardingStatus?: string;
  status?: string;
};

type ClientLiteRow = Prisma.ClientClientGetPayload<{
  select: { id: true; fullName: true; metadata: true };
}>;

type ClientPageRow = Prisma.ClientClientGetPayload<{
  select: {
    id: true;
    organizationId: true;
    fullName: true;
    phone: true;
    email: true;
    notes: true;
    metadata: true;
    createdAt: true;
    updatedAt: true;
  };
}>;

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

function normalizeStrategy(value: unknown): StrategicCharacterization | undefined {
  const obj = value && typeof value === 'object' && !Array.isArray(value) ? asRecord(value) : null;
  if (!obj) return undefined;

  return {
    targetAudience: safeString(obj.targetAudience, ''),
    painPoints: safeString(obj.painPoints, ''),
    uniqueValue: safeString(obj.uniqueValue, ''),
    competitors: safeString(obj.competitors, ''),
    mainGoal: safeString(obj.mainGoal, ''),
    ...(typeof obj.aiStrategySummary === 'string' ? { aiStrategySummary: obj.aiStrategySummary } : {}),
  };
}

function normalizeClientDna(value: unknown): ClientDNA {
  const base: ClientDNA = {
    brandSummary: '',
    voice: { formal: 50, funny: 50, length: 50 },
    vocabulary: { loved: [], forbidden: [] },
    colors: { primary: '#1e293b', secondary: '#334155' },
  };

  const obj = value && typeof value === 'object' && !Array.isArray(value) ? asRecord(value) : null;
  if (!obj) return base;

  const voiceObj = obj.voice && typeof obj.voice === 'object' && !Array.isArray(obj.voice) ? asRecord(obj.voice) : null;
  const vocabularyObj =
    obj.vocabulary && typeof obj.vocabulary === 'object' && !Array.isArray(obj.vocabulary) ? asRecord(obj.vocabulary) : null;
  const colorsObj = obj.colors && typeof obj.colors === 'object' && !Array.isArray(obj.colors) ? asRecord(obj.colors) : null;

  const strategy = normalizeStrategy(obj.strategy);

  return {
    brandSummary: safeString(obj.brandSummary, base.brandSummary),
    voice: {
      formal: safeNumber(voiceObj?.formal, base.voice.formal),
      funny: safeNumber(voiceObj?.funny, base.voice.funny),
      length: safeNumber(voiceObj?.length, base.voice.length),
    },
    vocabulary: {
      loved: Array.isArray(vocabularyObj?.loved) ? vocabularyObj.loved.map((v) => String(v)) : base.vocabulary.loved,
      forbidden: Array.isArray(vocabularyObj?.forbidden)
        ? vocabularyObj.forbidden.map((v) => String(v))
        : base.vocabulary.forbidden,
    },
    colors: {
      primary: safeString(colorsObj?.primary, base.colors.primary),
      secondary: safeString(colorsObj?.secondary, base.colors.secondary),
    },
    ...(strategy ? { strategy } : {}),
  };
}

function normalizeBusinessMetrics(value: unknown): BusinessMetrics {
  const base: BusinessMetrics = {
    timeSpentMinutes: 0,
    expectedHours: 0,
    punctualityScore: 100,
    responsivenessScore: 100,
    revisionCount: 0,
  };

  const obj = value && typeof value === 'object' && !Array.isArray(value) ? asRecord(value) : null;
  if (!obj) return base;

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

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object') return {};
  if (Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}


export async function getClientsLite(
  clerkUserId?: string,
  orgId?: string
): Promise<{ success: boolean; data?: ClientLite[]; error?: string }> {
  try {
    const organizationId = await resolveOrganizationId(clerkUserId, orgId);
    if (!organizationId) return { success: false, error: 'Missing orgSlug' };

    const data = await prisma.clientClient.findMany({
      where: { organizationId },
      select: { id: true, fullName: true, metadata: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const list: ClientLite[] = (data as ClientLiteRow[]).map((row) => {
      const md = asRecord(row.metadata);
      const companyName = safeString(md.companyName, safeString(md.name, safeString(row.fullName, '')));
      const avatar = safeString(md.avatar, '');
      const postingRhythm = safeString(md.postingRhythm, '3 פעמים בשבוע');
      const onboardingStatus = optionalString(md.onboardingStatus);
      const status = optionalString(md.status);
      return {
        id: String(row.id),
        companyName,
        avatar,
        postingRhythm,
        onboardingStatus,
        status,
      };
    });

    return { success: true, data: list };
  } catch (e: unknown) {
    return createErrorResponse(e, getErrorMessage(e, 'שגיאה בטעינת לקוחות'));
  }
}

export async function getClientsPage(params: {
  clerkUserId?: string;
  orgId?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ success: boolean; data?: { clients: Client[]; page: number; pageSize: number; hasMore: boolean }; error?: string }> {
  try {
    const organizationId = await resolveOrganizationId(params.clerkUserId, params.orgId);
    if (!organizationId) {
      return { success: false, error: 'Missing orgSlug' };
    }

    const pageSize = Math.min(200, Math.max(1, Math.floor(params.pageSize ?? 200)));
    const page = Math.max(1, Math.floor(params.page ?? 1));
    const offset = (page - 1) * pageSize;
    const endInclusive = offset + pageSize;

    const rows = await prisma.clientClient.findMany({
      where: { organizationId },
      select: {
        id: true,
        organizationId: true,
        fullName: true,
        phone: true,
        email: true,
        notes: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: pageSize + 1,
    });

    const hasMore = rows.length > pageSize;
    const trimmed = hasMore ? rows.slice(0, pageSize) : rows;
    const clients = (trimmed as ClientPageRow[]).map((row) =>
      mapClientClientsRowToSocialClient({
        id: String(row.id),
        organization_id: String(row.organizationId),
        full_name: String(row.fullName ?? ''),
        phone: row.phone ?? null,
        email: row.email ?? null,
        notes: row.notes ?? null,
        metadata: row.metadata ?? {},
        created_at: row.createdAt ? (row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt)) : undefined,
        updated_at: row.updatedAt ? (row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt)) : undefined,
      })
    );

    return { success: true, data: { clients, page, pageSize, hasMore } };
  } catch (e: unknown) {
    return createErrorResponse(e, getErrorMessage(e, 'שגיאה בטעינת לקוחות'));
  }
}

function randomToken(len = 12): string {
  return Math.random().toString(36).slice(2, 2 + len);
}

function mapClientClientsRowToSocialClient(row: ClientClientsRow): Client {
  const md = asRecord(row.metadata);
  const name = safeString(md.name, row.full_name);
  const companyName = safeString(md.companyName, name || row.full_name);
  const avatar = safeString(md.avatar, '');

  const plan = (md.plan as PricingPlan | undefined) ?? undefined;
  const monthlyFee = md.monthlyFee != null ? safeNumber(md.monthlyFee) : undefined;

  return {
    id: row.id,
    name,
    companyName,
    businessId: optionalString(md.businessId),
    phone: row.phone ?? undefined,
    email: row.email ?? undefined,
    avatar,
    brandVoice: safeString(md.brandVoice, ''),
    dna: normalizeClientDna(md.dna),
    credentials: Array.isArray(md.credentials) ? (md.credentials as Client['credentials']) : [],
    postingRhythm: safeString(md.postingRhythm, '3 פעמים בשבוע'),
    status: (md.status as ClientStatus) || 'Onboarding',
    activePlatforms: Array.isArray(md.activePlatforms) ? (md.activePlatforms as Client['activePlatforms']) : [],
    quotas: Array.isArray(md.quotas) ? (md.quotas as Client['quotas']) : [],
    onboardingStatus: optionalOnboardingStatus(md.onboardingStatus),
    invitationToken: optionalString(md.invitationToken),
    portalToken: safeString(md.portalToken, ''),
    color: safeString(md.color, '#1e293b'),
    plan,
    monthlyFee,
    nextPaymentDate: optionalString(md.nextPaymentDate),
    nextPaymentAmount: md.nextPaymentAmount != null ? safeNumber(md.nextPaymentAmount) : undefined,
    paymentStatus: optionalPaymentStatus(md.paymentStatus),
    autoRemindersEnabled: safeBoolean(md.autoRemindersEnabled, true),
    savedCardThumbnail: optionalString(md.savedCardThumbnail),
    businessMetrics: normalizeBusinessMetrics(md.businessMetrics),
    internalNotes: optionalString(md.internalNotes),
    organizationId: row.organization_id,
  };
}

async function resolveOrganizationId(clerkUserId?: string, orgId?: string): Promise<string | null> {
  if (orgId) {
    const workspace = await requireWorkspaceAccessByOrgSlug(orgId);
    try {
      return requireOrganizationId('resolveOrganizationId', (workspace as { id: string }).id);
    } catch {
      return null;
    }
  }

  return null;
}

export async function getClients(
  clerkUserId?: string,
  orgId?: string
): Promise<{ success: boolean; data?: Client[]; error?: string }> {
  try {
    const res = await getClientsPage({ clerkUserId, orgId, page: 1, pageSize: 200 });
    if (!res.success) return { success: false, error: res.error };
    return { success: true, data: res.data?.clients ?? [] };
  } catch (e: unknown) {
    return createErrorResponse(e, getErrorMessage(e, 'שגיאה בטעינת לקוחות'));
  }
}

export async function createClient(
  clientData: Partial<Client>,
  clerkUserId: string
): Promise<{ success: boolean; data?: Client; error?: string }> {
  try {
    const validation = validateWithSchema(createClientSchema, clientData);
    if (!validation.success) return validation;

    const organizationId = await resolveOrganizationId(clerkUserId, clientData.organizationId);
    if (!organizationId) {
      return createErrorResponse(new Error('שגיאה: משתמש לא שייך לארגון'), 'לא ניתן ליצור לקוח ללא ארגון');
    }

    const invitationToken = clientData.invitationToken || randomToken(14);
    const portalToken = clientData.portalToken || randomToken(22);

    const name = safeString(clientData.name, '').trim();
    const companyName = safeString(clientData.companyName, name || 'לקוח חדש');

    const metadata = {
      name: name || companyName,
      companyName,
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
      businessMetrics: clientData.businessMetrics ?? null,
      internalNotes: clientData.internalNotes ?? null,
      dna: clientData.dna ?? null,
      credentials: clientData.credentials ?? [],
      activePlatforms: clientData.activePlatforms ?? [],
      quotas: clientData.quotas ?? [],
      legacy: {
        source: 'social_os',
      },
    };

    const created = await createClinicClient({
      orgId: organizationId,
      fullName: companyName,
      phone: clientData.phone ?? null,
      email: clientData.email ?? null,
      notes: clientData.internalNotes ?? null,
      metadata,
    });

    const row = await prisma.clientClient.findFirst({
      where: { organizationId, id: created.id },
      select: {
        id: true,
        organizationId: true,
        fullName: true,
        phone: true,
        email: true,
        notes: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!row?.id) {
      return createErrorResponse(new Error('הלקוח נוצר אך נכשל בטעינת הנתונים המלאים'), 'שגיאה בטעינת לקוח');
    }

    // ── Cross-sync: ClientClient → NexusClient (if org has Nexus module) ──
    const metaObj = (typeof row.metadata === 'object' && row.metadata !== null ? row.metadata : {}) as Record<string, unknown>;
    const metaSource = String(metaObj.source ?? '');
    const skipNexusSync = metaSource === 'nexus_sync' || metaSource === 'system_leads';
    if (!skipNexusSync) {
      try {
        const entitlements = await getOrganizationEntitlements(organizationId);
        if (entitlements.nexus) {
          const syncPhone = safeString(clientData.phone, '').trim();
          const syncEmail = safeString(clientData.email, '').trim().toLowerCase();
          const syncName = name || companyName;

          let existingNexus: { id: string } | null = null;
          if (syncPhone) {
            existingNexus = await prisma.nexusClient.findFirst({
              where: { organizationId, phone: syncPhone },
              select: { id: true },
            });
          }
          if (!existingNexus?.id && syncEmail) {
            existingNexus = await prisma.nexusClient.findFirst({
              where: { organizationId, email: { equals: syncEmail, mode: 'insensitive' } },
              select: { id: true },
            });
          }

          if (existingNexus?.id) {
            await prisma.nexusClient.updateMany({
              where: { id: existingNexus.id, organizationId },
              data: {
                name: syncName,
                companyName,
                email: syncEmail || undefined,
                source: 'client_sync',
              },
            });
          } else {
            await prisma.nexusClient.create({
              data: {
                organizationId,
                name: syncName,
                companyName,
                contactPerson: syncName,
                email: syncEmail || '',
                phone: syncPhone || '',
                status: 'Active',
                source: 'client_sync',
              },
              select: { id: true },
            });
          }
        }
      } catch (syncErr: unknown) {
        console.warn('[client-clients] ClientClient→NexusClient sync failed (ignored):', getErrorMessage(syncErr, 'unknown sync error'));
      }
    }

    // Notify org owner about new client
    try {
      const orgOwner = await prisma.organization.findFirst({
        where: { id: organizationId },
        select: { owner_id: true },
      });
      if (orgOwner?.owner_id) {
        insertMisradNotificationsForOrganizationId({
          organizationId,
          recipientIds: [String(orgOwner.owner_id)],
          type: 'CLIENT',
          text: `לקוח חדש נוסף: ${name || companyName}`,
          reason: 'client_created',
        }).catch(() => {});
      }
    } catch { /* best-effort */ }

    return {
      success: true,
      data: mapClientClientsRowToSocialClient({
        id: String(row.id),
        organization_id: String(row.organizationId),
        full_name: String(row.fullName ?? ''),
        phone: row.phone ?? null,
        email: row.email ?? null,
        notes: row.notes ?? null,
        metadata: row.metadata ?? {},
        created_at: row.createdAt ? (row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt)) : undefined,
        updated_at: row.updatedAt ? (row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt)) : undefined,
      }),
    };
  } catch (e: unknown) {
    return createErrorResponse(e, getErrorMessage(e, 'שגיאה ביצירת לקוח'));
  }
}

export async function updateClient(
  clientId: string,
  updates: Partial<Client>
): Promise<{ success: boolean; data?: Client; error?: string }> {
  try {
    const existing = await prisma.clientClient.findFirst({
      where: { id: String(clientId) },
      select: { id: true, organizationId: true, fullName: true, phone: true, email: true, notes: true, metadata: true },
    });

    if (!existing?.id) {
      return createErrorResponse(new Error('לקוח לא נמצא'), 'לקוח לא נמצא');
    }

    const existingRow: ClientClientsRow = {
      id: String(existing.id),
      organization_id: String(existing.organizationId),
      full_name: String(existing.fullName ?? ''),
      phone: existing.phone ?? null,
      email: existing.email ?? null,
      notes: existing.notes ?? null,
      metadata: existing.metadata ?? {},
    };

    const orgId = String(existingRow.organization_id);

    const nextMetadata: Record<string, unknown> = {
      ...asRecord(existingRow.metadata),
      ...asRecord(updates),
    };

    const updatesRec = asRecord(updates);

    const nextFullName = safeString(
      updatesRec.companyName ?? updatesRec.name ?? nextMetadata.companyName ?? existingRow.full_name,
      existingRow.full_name
    );

    await updateClinicClient({
      orgId,
      clientId,
      updates: {
        fullName: nextFullName,
        phone: updates.phone ?? existingRow.phone ?? null,
        email: updates.email ?? existingRow.email ?? null,
        notes: updates.internalNotes ?? existingRow.notes ?? null,
        metadata: nextMetadata,
      },
    });

    const after = await prisma.clientClient.findFirst({
      where: { id: String(clientId) },
      select: {
        id: true,
        organizationId: true,
        fullName: true,
        phone: true,
        email: true,
        notes: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!after?.id) {
      return { success: true };
    }

    return {
      success: true,
      data: mapClientClientsRowToSocialClient({
        id: String(after.id),
        organization_id: String(after.organizationId),
        full_name: String(after.fullName ?? ''),
        phone: after.phone ?? null,
        email: after.email ?? null,
        notes: after.notes ?? null,
        metadata: after.metadata ?? {},
        created_at: after.createdAt ? (after.createdAt instanceof Date ? after.createdAt.toISOString() : String(after.createdAt)) : undefined,
        updated_at: after.updatedAt ? (after.updatedAt instanceof Date ? after.updatedAt.toISOString() : String(after.updatedAt)) : undefined,
      }),
    };
  } catch (e: unknown) {
    return createErrorResponse(e, getErrorMessage(e, 'שגיאה בעדכון לקוח'));
  }
}

export async function inviteClient(
  clientId: string,
  invitationLink: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const row = await prisma.clientClient.findFirst({
      where: { id: String(clientId) },
      select: { id: true, fullName: true, email: true, metadata: true },
    });

    if (!row?.id) {
      return createErrorResponse(new Error('לקוח לא נמצא'), 'לקוח לא נמצא');
    }

    const rec = {
      email: row.email ?? null,
      full_name: String(row.fullName ?? ''),
      metadata: row.metadata ?? {},
    } as { email: string | null; full_name: string; metadata: unknown };
    const email = rec.email;
    if (!email) {
      return createErrorResponse(new Error('אימייל הלקוח לא הוגדר'), 'אימייל הלקוח לא הוגדר');
    }

    const md = asRecord(rec.metadata);

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
      clientName: String(md.name || rec.full_name),
      clientEmail: email,
      invitationLink,
      planName,
      planPrice,
    });

    if (!emailResult.success) {
      return createErrorResponse(new Error(emailResult.error || 'שגיאה בשליחת מייל הזמנה'), emailResult.error || 'שגיאה בשליחת מייל הזמנה');
    }

    return { success: true };
  } catch (e: unknown) {
    return createErrorResponse(e, getErrorMessage(e, 'שגיאה בהזמנת לקוח'));
  }
}

export async function getClientByInvitationToken(
  invitationToken: string
): Promise<{ success: boolean; data?: Client; error?: string }> {
  try {
    if (!invitationToken) {
      return createErrorResponse(new Error('טוקן הזמנה חסר'), 'טוקן הזמנה חסר');
    }

    const where: Prisma.ClientClientWhereInput = {
      metadata: { path: ['invitationToken'], equals: String(invitationToken) } satisfies Prisma.JsonNullableFilter,
    };

    const row = await prisma.clientClient.findFirst({
      where,
      select: {
        id: true,
        organizationId: true,
        fullName: true,
        phone: true,
        email: true,
        notes: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!row?.id) {
      return createErrorResponse(new Error('טוקן הזמנה לא תקין או שהלקוח לא נמצא'), 'טוקן הזמנה לא תקין או שהלקוח לא נמצא');
    }

    const rowForMap: ClientClientsRow = {
      id: String(row.id),
      organization_id: String(row.organizationId),
      full_name: String(row.fullName ?? ''),
      phone: row.phone ?? null,
      email: row.email ?? null,
      notes: row.notes ?? null,
      metadata: row.metadata ?? {},
      created_at: row.createdAt ? (row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt)) : undefined,
      updated_at: row.updatedAt ? (row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt)) : undefined,
    };

    const md = asRecord(rowForMap.metadata);
    if (md.onboardingStatus && String(md.onboardingStatus) !== 'invited') {
      return createErrorResponse(new Error('ההזמנה כבר הושלמה או לא תקינה'), 'ההזמנה כבר הושלמה או לא תקינה');
    }

    return { success: true, data: mapClientClientsRowToSocialClient(rowForMap) };
  } catch (e: unknown) {
    return createErrorResponse(e, getErrorMessage(e, 'שגיאה בטעינת לקוח'));
  }
}

export async function linkPortalClientToCanonical(params: {
  orgSlug: string;
  portalClientId: string;
  canonicalClientId: string;
}): Promise<{ success: boolean; data?: Client; error?: string }> {
  try {
    const orgSlug = String(params.orgSlug || '').trim();
    if (!orgSlug) return createErrorResponse(new Error('orgSlug חסר'), 'orgSlug חסר');
    if (!params.portalClientId) return createErrorResponse(new Error('portalClientId חסר'), 'portalClientId חסר');
    if (!params.canonicalClientId) return createErrorResponse(new Error('canonicalClientId חסר'), 'canonicalClientId חסר');

    const workspace = await requireWorkspaceAccessByOrgSlug(orgSlug);
    let organizationId: string;
    try {
      organizationId = requireOrganizationId('linkPortalClientToCanonical', (workspace as { id: string }).id);
    } catch {
      return createErrorResponse(new Error('ארגון לא נמצא'), 'ארגון לא נמצא');
    }

    const existing = await prisma.clientClient.findFirst({
      where: {
        organizationId,
        metadata: { path: ['canonicalClientId'], equals: String(params.canonicalClientId) } satisfies Prisma.JsonNullableFilter,
      },
      select: { id: true, organizationId: true, fullName: true, phone: true, email: true, notes: true, metadata: true, createdAt: true, updatedAt: true },
    });

    if (!existing?.id) {
      return createErrorResponse(new Error('לקוח לא נמצא'), 'לקוח לא נמצא');
    }

    const nextMetadata = {
      ...asRecord(existing.metadata),
      canonicalClientId: params.canonicalClientId,
    };

    // ...

    await updateClinicClient({
      orgId: organizationId,
      clientId: String(params.portalClientId),
      updates: {
        fullName: String(existing.fullName ?? ''),
        phone: existing.phone ?? null,
        email: existing.email ?? null,
        notes: existing.notes ?? null,
        metadata: nextMetadata,
      },
    });

    const after = await prisma.clientClient.findFirst({
      where: { organizationId, id: String(params.portalClientId) },
      select: { id: true, organizationId: true, fullName: true, phone: true, email: true, notes: true, metadata: true, createdAt: true, updatedAt: true },
    });

    if (!after?.id) {
      return { success: true };
    }

    return {
      success: true,
      data: mapClientClientsRowToSocialClient({
        id: String(after.id),
        organization_id: String(after.organizationId),
        full_name: String(after.fullName ?? ''),
        phone: after.phone ?? null,
        email: after.email ?? null,
        notes: after.notes ?? null,
        metadata: after.metadata ?? {},
        created_at: after.createdAt ? (after.createdAt instanceof Date ? after.createdAt.toISOString() : String(after.createdAt)) : undefined,
        updated_at: after.updatedAt ? (after.updatedAt instanceof Date ? after.updatedAt.toISOString() : String(after.updatedAt)) : undefined,
      }),
    };
  } catch (e: unknown) {
    return createErrorResponse(e, getErrorMessage(e, 'שגיאה בקישור לקוח'));
  }
}

export async function ensurePortalClientForCanonical(params: {
  orgSlug: string;
  canonicalClientId: string;
}): Promise<{ success: boolean; data?: Client; error?: string }> {
  try {
    const orgSlug = String(params.orgSlug || '').trim();
    if (!orgSlug) return createErrorResponse(new Error('orgSlug חסר'), 'orgSlug חסר');
    if (!params.canonicalClientId) return createErrorResponse(new Error('canonicalClientId חסר'), 'canonicalClientId חסר');

    const workspace = await requireWorkspaceAccessByOrgSlug(orgSlug);
    let organizationId: string;
    try {
      organizationId = requireOrganizationId('ensurePortalClientForCanonical', (workspace as { id: string }).id);
    } catch {
      return createErrorResponse(new Error('ארגון לא נמצא'), 'ארגון לא נמצא');
    }

    const where: Prisma.ClientClientWhereInput = {
      organizationId,
      metadata: { path: ['canonicalClientId'], equals: String(params.canonicalClientId) },
    };

    const existing = await prisma.clientClient.findFirst({
      where,
      select: { id: true, organizationId: true, fullName: true, phone: true, email: true, notes: true, metadata: true, createdAt: true, updatedAt: true },
    });

    if (existing?.id) {
      return {
        success: true,
        data: mapClientClientsRowToSocialClient({
          id: String(existing.id),
          organization_id: String(existing.organizationId),
          full_name: String(existing.fullName ?? ''),
          phone: existing.phone ?? null,
          email: existing.email ?? null,
          notes: existing.notes ?? null,
          metadata: existing.metadata ?? {},
          created_at: existing.createdAt ? (existing.createdAt instanceof Date ? existing.createdAt.toISOString() : String(existing.createdAt)) : undefined,
          updated_at: existing.updatedAt ? (existing.updatedAt instanceof Date ? existing.updatedAt.toISOString() : String(existing.updatedAt)) : undefined,
        }),
      };
    }

    const canonical = await prisma.clients.findFirst({
      where: { organization_id: organizationId, id: String(params.canonicalClientId) },
      select: {
        id: true,
        name: true,
        company_name: true,
        phone: true,
        email: true,
        avatar: true,
        status: true,
        onboarding_status: true,
        portal_token: true,
        invitation_token: true,
        color: true,
        plan: true,
        monthly_fee: true,
        payment_status: true,
      },
    });

    if (!canonical?.id) {
      return createErrorResponse(new Error('לקוח קנוני לא נמצא'), 'לקוח קנוני לא נמצא');
    }

    const md = {
      canonicalClientId: canonical.id,
      name: canonical.name ?? '',
      companyName: canonical.company_name ?? canonical.name ?? '',
      avatar: canonical.avatar ?? '',
      postingRhythm: '3 פעמים בשבוע',
      status: canonical.status ?? ('Onboarding' as ClientStatus),
      onboardingStatus: canonical.onboarding_status ?? undefined,
      invitationToken: canonical.invitation_token ?? undefined,
      portalToken: canonical.portal_token ?? '',
      color: canonical.color ?? '#1e293b',
      plan: canonical.plan ?? undefined,
      monthlyFee: canonical.monthly_fee ?? undefined,
      paymentStatus: canonical.payment_status ?? undefined,
    };

    const created = await createClinicClient({
      orgId: organizationId,
      fullName: String(canonical.company_name ?? canonical.name ?? 'לקוח חדש'),
      phone: canonical.phone ?? null,
      email: canonical.email ?? null,
      notes: null,
      metadata: md,
    });

    const row = await prisma.clientClient.findFirst({
      where: { organizationId, id: created.id },
      select: { id: true, organizationId: true, fullName: true, phone: true, email: true, notes: true, metadata: true, createdAt: true, updatedAt: true },
    });

    if (!row?.id) {
      return createErrorResponse(new Error('נכשל ביצירת לקוח פורטל'), 'נכשל ביצירת לקוח פורטל');
    }

    return {
      success: true,
      data: mapClientClientsRowToSocialClient({
        id: String(row.id),
        organization_id: String(row.organizationId),
        full_name: String(row.fullName ?? ''),
        phone: row.phone ?? null,
        email: row.email ?? null,
        notes: row.notes ?? null,
        metadata: row.metadata ?? {},
        created_at: row.createdAt ? (row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt)) : undefined,
        updated_at: row.updatedAt ? (row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt)) : undefined,
      }),
    };
  } catch (e: unknown) {
    return createErrorResponse(e, getErrorMessage(e, 'שגיאה ביצירת לקוח פורטל'));
  }
}
