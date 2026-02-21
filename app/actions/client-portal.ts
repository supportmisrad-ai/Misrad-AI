'use server';


import { revalidatePath } from 'next/cache';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';
import { withTenantIsolationContext } from '@/lib/prisma-tenant-guard';
import { asObjectLoose as asObject, getErrorMessage } from '@/lib/shared/unknown';
import { ALLOW_SCHEMA_FALLBACKS, isSchemaMismatchError, reportSchemaFallback } from '@/lib/server/schema-fallbacks';
import {
  ClientStatus,
  ClientType,
  HealthStatus,
  type AssignedForm,
  type Client,
  type ClientAction,
  type ClientAgreement,
  type ClientAsset,
  type ClientDeliverable,
  type ClientTransformation,
  type Email,
  type EngagementMetrics,
  type HealthBreakdown,
  type Invoice,
  type JourneyStage,
  type Opportunity,
  type ROIRecord,
  Sentiment,
  type Stakeholder,
  type SuccessGoal,
} from '@/components/client-os-full/types';
import { analyzeAndStoreMeeting as analyzeAndStoreMeetingService } from '@/lib/services/client-os/meetings/analyze-and-store-meeting';

function isUuidLike(value: unknown): boolean {
  const v = typeof value === 'string' ? value.trim() : '';
  if (!v) return false;
  const normalized = v.toLowerCase().startsWith('urn:uuid:') ? v.slice('urn:uuid:'.length) : v;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(normalized);
}

async function resolveClientPortalOrganizationContext(orgKey: string): Promise<{ organizationId: string }> {
  const key = String(orgKey || '').trim();
  if (!key) {
    throw new Error('orgId is required');
  }

  const user = await getAuthenticatedUser();
  const email = String(user.email || '').trim().toLowerCase();

  const org = await prisma.organization.findFirst({
    where: {
      OR: [
        { slug: key },
        ...(isUuidLike(key) ? [{ id: key }] : []),
      ],
    },
    select: { id: true, owner_id: true },
  });

  if (!org?.id) {
    throw new Error('Forbidden');
  }

  if (user.isSuperAdmin) {
    return { organizationId: String(org.id) };
  }

  let socialUser: { id: string; organization_id: string | null } | null = null;
  try {
    socialUser = await prisma.organizationUser.findUnique({
      where: { clerk_user_id: String(user.id) },
      select: { id: true, organization_id: true },
    });
  } catch (e: unknown) {
    if (isSchemaMismatchError(e) && !ALLOW_SCHEMA_FALLBACKS) {
      throw new Error(`[SchemaMismatch] organizationUser lookup failed (${getErrorMessage(e) || 'missing relation'})`);
    }

    if (isSchemaMismatchError(e) && ALLOW_SCHEMA_FALLBACKS) {
      reportSchemaFallback({
        source: 'app/actions/client-portal.resolveClientPortalOrganizationContext',
        reason: 'organizationUser lookup schema mismatch (fallback to null)',
        error: e,
        extras: { orgKey: key },
      });
    }
    socialUser = null;
  }

  const socialUserId = socialUser?.id ? String(socialUser.id) : '';
  const socialUserOrgId = socialUser?.organization_id ? String(socialUser.organization_id) : '';

  if (socialUserOrgId && socialUserOrgId === String(org.id)) {
    return { organizationId: String(org.id) };
  }

  if (socialUserId && org.owner_id && String(org.owner_id) === socialUserId) {
    return { organizationId: String(org.id) };
  }

  if (socialUserId) {
    const team = await prisma.teamMember.findFirst({
      where: { organization_id: String(org.id), user_id: socialUserId },
      select: { id: true },
    });
    if (team?.id) {
      return { organizationId: String(org.id) };
    }
  }

  if (email) {
    const portalUser = await prisma.clientPortalUser.findFirst({
      where: {
        organizationId: String(org.id),
        email: { equals: email, mode: 'insensitive' },
        status: 'ACTIVE',
      },
      select: { id: true },
    });
    if (portalUser?.id) {
      return { organizationId: String(org.id) };
    }
  }

  throw new Error('Forbidden');
}

async function withClientPortalTenantContext<T>(params: {
  orgKey: string;
  reason: string;
  fn: (params: { organizationId: string }) => Promise<T>;
}): Promise<T> {
  const resolved = await resolveClientPortalOrganizationContext(params.orgKey);
  const organizationId = String(resolved.organizationId);
  return await withTenantIsolationContext(
    { source: 'server_actions_client_portal', reason: String(params.reason || 'client_portal'), organizationId },
    async () => await params.fn({ organizationId })
  );
}


function toPrismaJsonValue(value: unknown): Prisma.InputJsonValue | null {
  if (value === null || value === undefined) return null;

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((v) => toPrismaJsonValue(v));
  }

  const obj = asObject(value);
  if (obj) {
    const out: Record<string, Prisma.InputJsonValue | null> = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = toPrismaJsonValue(v);
    }
    return out;
  }

  return String(value);
}

function toPrismaJsonObject(value: unknown): Prisma.InputJsonObject {
  const v = toPrismaJsonValue(value);
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Prisma.InputJsonObject) : {};
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((v) => String(v)) : [];
}

function toUtcDateOnly(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function asString(value: unknown, fallback = ''): string {
  return value == null ? fallback : String(value);
}

function asNumber(value: unknown, fallback = 0): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeHealthStatus(value: unknown): HealthStatus {
  const v = String(value || '').toUpperCase();
  if (v === 'CRITICAL') return HealthStatus.CRITICAL;
  if (v === 'AT_RISK') return HealthStatus.AT_RISK;
  if (v === 'STABLE') return HealthStatus.STABLE;
  return HealthStatus.THRIVING;
}

function normalizeClientStatus(value: unknown): ClientStatus {
  const v = String(value || '').toUpperCase();
  if (v === 'ACTIVE') return ClientStatus.ACTIVE;
  if (v === 'LEAD') return ClientStatus.LEAD;
  if (v === 'ARCHIVED') return ClientStatus.ARCHIVED;
  if (v === 'LOST') return ClientStatus.LOST;
  return ClientStatus.CHURNED;
}

function normalizeClientType(value: unknown): ClientType {
  const v = String(value || '').toUpperCase();
  if (v === 'RETAINER') return ClientType.RETAINER;
  if (v === 'PROJECT') return ClientType.PROJECT;
  return ClientType.HOURLY;
}

function normalizeReferralStatus(value: unknown): Client['referralStatus'] {
  const v = String(value || '').toUpperCase();
  if (v === 'UNLOCKED') return 'UNLOCKED';
  if (v === 'REDEEMED') return 'REDEEMED';
  return 'LOCKED';
}

function normalizeSentiment(value: unknown): Sentiment {
  const v = String(value || '').toUpperCase();
  if (v === 'POSITIVE') return Sentiment.POSITIVE;
  if (v === 'NEUTRAL') return Sentiment.NEUTRAL;
  if (v === 'NEGATIVE') return Sentiment.NEGATIVE;
  return Sentiment.ANXIOUS;
}

function normalizeClientActionType(value: unknown): ClientAction['type'] {
  const v = String(value || '').toUpperCase();
  if (v === 'APPROVAL') return 'APPROVAL';
  if (v === 'UPLOAD') return 'UPLOAD';
  if (v === 'SIGNATURE') return 'SIGNATURE';
  if (v === 'FORM') return 'FORM';
  return 'FEEDBACK';
}

function normalizeClientActionStatus(value: unknown): ClientAction['status'] {
  const v = String(value || '').toUpperCase();
  if (v === 'COMPLETED') return 'COMPLETED';
  if (v === 'OVERDUE') return 'OVERDUE';
  return 'PENDING';
}

function normalizeDeliverableType(value: unknown): ClientDeliverable['type'] {
  const v = String(value || '').toUpperCase();
  if (v === 'CAMPAIGN') return 'CAMPAIGN';
  if (v === 'REPORT') return 'REPORT';
  if (v === 'DESIGN') return 'DESIGN';
  if (v === 'STRATEGY') return 'STRATEGY';
  return 'DEV';
}

function normalizeDeliverableStatus(value: unknown): ClientDeliverable['status'] {
  const v = String(value || '').toUpperCase();
  if (v === 'IN_REVIEW') return 'IN_REVIEW';
  if (v === 'APPROVED') return 'APPROVED';
  if (v === 'PUBLISHED') return 'PUBLISHED';
  return 'DRAFT';
}

function normalizeAssetType(value: unknown): ClientAsset['type'] {
  const v = String(value || '').toUpperCase();
  if (v === 'PDF') return 'PDF';
  if (v === 'IMAGE') return 'IMAGE';
  if (v === 'LINK') return 'LINK';
  if (v === 'FIGMA') return 'FIGMA';
  return 'DOC';
}

function normalizeAssetCategory(value: unknown): ClientAsset['category'] {
  const v = String(value || '').toUpperCase();
  if (v === 'BRANDING') return 'BRANDING';
  if (v === 'LEGAL') return 'LEGAL';
  if (v === 'INPUT') return 'INPUT';
  return 'STRATEGY';
}

function normalizeUploadedBy(value: unknown): ClientAsset['uploadedBy'] {
  const v = String(value || '').toUpperCase();
  return v === 'AGENCY' ? 'AGENCY' : 'CLIENT';
}

function normalizeJourneyStatus(value: unknown): JourneyStage['status'] {
  const v = String(value || '').toUpperCase();
  if (v === 'COMPLETED') return 'COMPLETED';
  if (v === 'ACTIVE') return 'ACTIVE';
  return 'PENDING';
}

function normalizeOpportunityStatus(value: unknown): Opportunity['status'] {
  const v = String(value || '').toUpperCase();
  if (v === 'PROPOSED') return 'PROPOSED';
  if (v === 'CLOSED') return 'CLOSED';
  return 'NEW';
}

function normalizeSuccessGoalStatus(value: unknown): SuccessGoal['status'] {
  const v = String(value || '').toUpperCase();
  if (v === 'ACHIEVED') return 'ACHIEVED';
  if (v === 'AT_RISK') return 'AT_RISK';
  return 'IN_PROGRESS';
}

function normalizeRoiCategory(value: unknown): ROIRecord['category'] {
  const v = String(value || '').toUpperCase();
  if (v === 'REVENUE_LIFT') return 'REVENUE_LIFT';
  if (v === 'COST_SAVING') return 'COST_SAVING';
  if (v === 'EFFICIENCY') return 'EFFICIENCY';
  return 'REFUND';
}

function normalizeAgreementType(value: unknown): ClientAgreement['type'] {
  const v = String(value || '').toUpperCase();
  if (v === 'MSA') return 'MSA';
  if (v === 'SOW') return 'SOW';
  if (v === 'NDA') return 'NDA';
  return 'ADDENDUM';
}

function normalizeAgreementStatus(value: unknown): ClientAgreement['status'] {
  const v = String(value || '').toUpperCase();
  return v === 'EXPIRED' ? 'EXPIRED' : 'ACTIVE';
}

function normalizeInvoiceStatus(value: unknown): Invoice['status'] {
  const v = String(value || '').toUpperCase();
  if (v === 'PAID') return 'PAID';
  if (v === 'OVERDUE') return 'OVERDUE';
  return 'PENDING';
}

function normalizeStakeholderRole(value: unknown): Stakeholder['nexusRole'] {
  const v = String(value || '').toUpperCase();
  if (v === 'CHAMPION') return 'CHAMPION';
  if (v === 'DECISION_MAKER') return 'DECISION_MAKER';
  if (v === 'INFLUENCER') return 'INFLUENCER';
  if (v === 'BLOCKER') return 'BLOCKER';
  if (v === 'GATEKEEPER') return 'GATEKEEPER';
  return 'USER';
}

function normalizeHealthBreakdown(value: unknown): HealthBreakdown {
  const obj = asObject(value) ?? {};
  return {
    financial: asNumber(obj.financial, 0),
    engagement: asNumber(obj.engagement, 0),
    sentiment: asNumber(obj.sentiment, 0),
  };
}

function normalizeEngagementMetrics(value: unknown): EngagementMetrics {
  const obj = asObject(value) ?? {};
  return {
    daysSinceLastLogin: asNumber(obj.daysSinceLastLogin, 0),
    unopenedEmails: asNumber(obj.unopenedEmails, 0),
    lastReportDownloadDate: obj.lastReportDownloadDate == null ? null : String(obj.lastReportDownloadDate),
    silentChurnDetected: Boolean(obj.silentChurnDetected),
  };
}

function normalizeAssignedForm(row: unknown): AssignedForm {
  const obj = asObject(row) ?? {};
  const statusRaw = String(obj.status || '').toUpperCase();
  const status: AssignedForm['status'] =
    statusRaw === 'SENT' || statusRaw === 'OPENED' || statusRaw === 'IN_PROGRESS' || statusRaw === 'COMPLETED'
      ? (statusRaw as AssignedForm['status'])
      : 'SENT';
  return {
    id: asString(obj.id),
    templateId: asString(obj.templateId ?? obj.template_id),
    title: asString(obj.title),
    status,
    progress: asNumber(obj.progress, 0),
    dateSent: asString(obj.dateSent ?? obj.date_sent),
    lastActivity: obj.lastActivity == null ? undefined : String(obj.lastActivity),
  };
}

function normalizeTransformationState(value: unknown): ClientTransformation['before'] {
  const obj = asObject(value) ?? {};
  const mediaTypeRaw = String(obj.mediaType || '').toUpperCase();
  const mediaType: ClientTransformation['before']['mediaType'] =
    mediaTypeRaw === 'VIDEO' ? 'VIDEO' : mediaTypeRaw === 'IMAGE' ? 'IMAGE' : 'TEXT';
  return {
    date: asString(obj.date),
    mediaType,
    mediaUrl: obj.mediaUrl == null ? undefined : String(obj.mediaUrl),
    description: asString(obj.description),
    emotionalState: asString(obj.emotionalState),
    quote: obj.quote == null ? undefined : String(obj.quote),
  };
}

async function resolveClientIdByClerkEmailOrThrow(params: { organizationId: string }): Promise<{ clientId: string; email: string }> {
  const { organizationId } = params;
  const user = await getAuthenticatedUser();
  const email = String(user.email || '').trim();
  if (!email) throw new Error('Client profile not found');

  const portalUser = await prisma.clientPortalUser.findFirst({
    where: {
      organizationId: String(organizationId),
      email: { equals: email, mode: 'insensitive' },
      status: 'ACTIVE',
    },
    select: { clientId: true },
  });

  if (!portalUser?.clientId) throw new Error('Client profile not found');

  return { clientId: portalUser.clientId, email };
}

async function getPortalClientIdIfAny(params: { organizationId: string }): Promise<string | null> {
  const user = await getAuthenticatedUser();
  if (user.isSuperAdmin) return null;

  const email = String(user.email || '').trim();
  if (!email) return null;

  try {
    const portalUser = await prisma.clientPortalUser.findFirst({
      where: {
        organizationId: String(params.organizationId),
        email: { equals: email, mode: 'insensitive' },
        status: 'ACTIVE',
      },
      select: { clientId: true },
    });

    return portalUser?.clientId ? String(portalUser.clientId) : null;
  } catch (e: unknown) {
    if (isSchemaMismatchError(e) && !ALLOW_SCHEMA_FALLBACKS) {
      throw new Error(`[SchemaMismatch] clientPortalUser lookup failed (${getErrorMessage(e) || 'missing relation'})`);
    }

    if (isSchemaMismatchError(e) && ALLOW_SCHEMA_FALLBACKS) {
      reportSchemaFallback({
        source: 'app/actions/client-portal.getPortalClientIdIfAny',
        reason: 'clientPortalUser lookup schema mismatch (fallback to null)',
        error: e,
        extras: { organizationId: String(params.organizationId || '') },
      });
      return null;
    }

    throw e;
  }
}

async function assertMisradClientInOrg(params: { organizationId: string; clientId: string }): Promise<void> {
  const row = await prisma.misradClient.findFirst({
    where: { organizationId: String(params.organizationId), id: String(params.clientId) },
    select: { id: true },
  });

  if (!row?.id) throw new Error('Forbidden');
}

export async function getClientIdByClerkEmail(params: { orgId: string }): Promise<{ clientId: string }> {
  return await withClientPortalTenantContext({
    orgKey: params.orgId,
    reason: 'getClientIdByClerkEmail',
    fn: async ({ organizationId }) => {
      const { clientId } = await resolveClientIdByClerkEmailOrThrow({ organizationId });
      return { clientId };
    },
  });
}

export type ClientDashboardData = {
  orgId: string;
  clientsCount: number;
  activeClientsCount: number;
  totalMRR: number;
  revenueAtRisk: number;
  invoicesCount: number;
  overdueInvoicesCount: number;
  deliverablesCount: number;
  openClientTasksCount: number;
  openAgencyTasksCount: number;
  groupEventsUpcomingCount: number;
};

export async function getClientDashboardData(orgId: string): Promise<ClientDashboardData> {
  return await withClientPortalTenantContext({
    orgKey: orgId,
    reason: 'getClientDashboardData',
    fn: async ({ organizationId }) => {
      const clients = await prisma.misradClient.findMany({
        where: { organizationId },
        select: {
          id: true,
          status: true,
          monthlyRetainer: true,
          healthStatus: true,
        },
      });

      const clientsCount = clients.length;
      const activeClients = clients.filter((c) => String(c.status) === 'ACTIVE');
      const activeClientsCount = activeClients.length;

      const totalMRR = activeClients.reduce((acc, c) => acc + Number(c.monthlyRetainer ?? 0), 0);
      const revenueAtRisk = activeClients
        .filter((c) => String(c.healthStatus) === 'AT_RISK' || String(c.healthStatus) === 'CRITICAL')
        .reduce((acc, c) => acc + Number(c.monthlyRetainer ?? 0), 0);

      const [
        invoicesCount,
        overdueInvoicesCount,
        deliverablesCount,
        openClientTasksCount,
        openAgencyTasksCount,
        groupEventsUpcomingCount,
      ] = await prisma.$transaction([
        prisma.misradInvoice.count({ where: { organization_id: organizationId } }),
        prisma.misradInvoice.count({ where: { organization_id: organizationId, status: 'OVERDUE' } }),
        prisma.misradClientDeliverable.count({ where: { organization_id: organizationId } }),
        prisma.misradClientAction.count({
          where: {
            organization_id: organizationId,
            status: 'PENDING',
            type: { in: ['APPROVAL', 'UPLOAD', 'SIGNATURE', 'FORM', 'FEEDBACK'] },
          },
        }),
        prisma.misradAiTask.count({ where: { organization_id: organizationId, status: 'PENDING', bucket: 'agency' } }),
        prisma.misradGroupEvent.count({ where: { organization_id: organizationId, status: 'UPCOMING' } }),
      ]);

      return {
        orgId: organizationId,
        clientsCount,
        activeClientsCount,
        totalMRR,
        revenueAtRisk,
        invoicesCount,
        overdueInvoicesCount,
        deliverablesCount,
        openClientTasksCount,
        openAgencyTasksCount,
        groupEventsUpcomingCount,
      };
    },
  });
}

const toHeDate = (d: Date) => d.toLocaleDateString('he-IL');

export async function getClientOSClients(orgId: string): Promise<Client[]> {
  return await withClientPortalTenantContext({
    orgKey: orgId,
    reason: 'getClientOSClients',
    fn: async ({ organizationId }) => {
      const rows = await prisma.misradClient.findMany({
        where: { organizationId },
        orderBy: { created_at: 'desc' },
        include: {
          deliverables: true,
          assets: true,
          actions: true,
          successGoals: { include: { history: true } },
          opportunities: true,
          journeyStages: { include: { milestones: true } },
          handoff: true,
          roiRecords: true,
          stakeholders: true,
          transformations: true,
          invoices: true,
          agreements: true,
        },
      });

      return rows.map((c): Client => {
    const healthBreakdown: HealthBreakdown = normalizeHealthBreakdown(c.healthBreakdown);
    const engagementMetrics: EngagementMetrics = normalizeEngagementMetrics(c.engagementMetrics);

    const deliverables: ClientDeliverable[] = (c.deliverables || []).map((d) => ({
      id: d.id,
      title: d.title,
      description: d.description,
      type: normalizeDeliverableType(d.type),
      thumbnailUrl: d.thumbnailUrl ?? undefined,
      status: normalizeDeliverableStatus(d.status),
      date: d.date || toHeDate(d.created_at),
      tags: Array.isArray(d.tags) ? d.tags : [],
    }));

    const assets: ClientAsset[] = (c.assets || []).map((a) => ({
      id: a.id,
      name: a.name,
      type: normalizeAssetType(a.type),
      url: a.url,
      category: normalizeAssetCategory(a.category),
      uploadedBy: normalizeUploadedBy(a.uploadedBy),
      date: a.date || toHeDate(a.created_at),
    }));

    const pendingActions: ClientAction[] = (c.actions || []).map((a) => ({
      id: a.id,
      title: a.title,
      description: a.description,
      type: normalizeClientActionType(a.type),
      status: normalizeClientActionStatus(a.status),
      dueDate: a.dueDate,
      isBlocking: a.isBlocking,
      lastReminderSent: a.lastReminderSent ?? undefined,
    }));

    const successGoals: SuccessGoal[] = (c.successGoals || []).map((g) => ({
      id: g.id,
      title: g.title,
      metricCurrent: g.metricCurrent,
      metricTarget: g.metricTarget,
      unit: g.unit,
      deadline: g.deadline,
      status: normalizeSuccessGoalStatus(g.status),
      lastUpdated: g.lastUpdated,
      aiForecast: g.aiForecast ?? undefined,
      history: (g.history || []).map((h) => ({ date: h.date, value: h.value })),
    }));

    const journey: JourneyStage[] = (c.journeyStages || []).map((s) => ({
      id: s.id,
      name: s.name,
      status: normalizeJourneyStatus(s.status),
      date: s.date ?? undefined,
      completionPercentage: s.completionPercentage ?? undefined,
      milestones: (s.milestones || []).map((m) => ({
        id: m.id,
        label: m.label,
        isCompleted: m.isCompleted,
        required: m.required,
      })),
    }));

    const opportunities: Opportunity[] = (c.opportunities || []).map((o) => ({
      id: o.id,
      title: o.title,
      value: o.value,
      matchScore: o.matchScore,
      status: normalizeOpportunityStatus(o.status),
    }));

    const roiHistory: ROIRecord[] = (c.roiRecords || []).map((r) => ({
      id: r.id,
      date: r.date,
      value: r.value,
      description: r.description,
      category: normalizeRoiCategory(r.category),
    }));

    const transformations: ClientTransformation[] = (c.transformations || []).map((t) => ({
      id: t.id,
      title: t.title,
      before: normalizeTransformationState(t.before),
      after: normalizeTransformationState(t.after),
      metrics: t.metrics ?? undefined,
      isPublished: t.isPublished,
    }));

    const stakeholders: Stakeholder[] = (c.stakeholders || []).map((s) => ({
      id: s.id,
      name: s.name,
      jobTitle: s.jobTitle,
      nexusRole: normalizeStakeholderRole(s.nexusRole),
      influence: s.influence,
      sentiment: s.sentiment,
      lastContact: s.lastContact,
      email: s.email ?? undefined,
      avatarUrl: s.avatarUrl ?? undefined,
      notes: s.notes,
    }));

    const invoices: Invoice[] = (c.invoices || []).map((inv) => ({
      id: inv.id,
      number: inv.number,
      amount: inv.amount,
      date: inv.date,
      dueDate: inv.dueDate,
      status: normalizeInvoiceStatus(inv.status),
      downloadUrl: inv.downloadUrl,
    }));

    const agreements: ClientAgreement[] = (c.agreements || []).map((ag) => ({
      id: ag.id,
      title: ag.title,
      type: normalizeAgreementType(ag.type),
      signedDate: ag.signedDate,
      expiryDate: ag.expiryDate ?? undefined,
      status: normalizeAgreementStatus(ag.status),
      fileUrl: ag.fileUrl,
    }));

    return {
      id: c.id,
      name: c.name,
      industry: c.industry,
      employeeCount: c.employeeCount,
      logoInitials: c.logoInitials,
      healthScore: c.healthScore,
      healthBreakdown,
      engagementMetrics,
      healthStatus: normalizeHealthStatus(c.healthStatus),
      status: normalizeClientStatus(c.status),
      type: normalizeClientType(c.type),
      tags: Array.isArray(c.tags) ? c.tags : [],
      pendingActions,
      assignedForms: (() => {
        const assignedFormsRaw = (asObject(c) ?? {}).assignedForms;
        return Array.isArray(assignedFormsRaw) ? assignedFormsRaw.map(normalizeAssignedForm) : [];
      })(),
      successGoals,
      monthlyRetainer: c.monthlyRetainer,
      profitMargin: c.profitMargin,
      lifetimeValue: c.lifetimeValue,
      hoursLogged: c.hoursLogged,
      internalHourlyRate: c.internalHourlyRate,
      directExpenses: c.directExpenses,
      profitabilityVerdict: c.profitabilityVerdict,
      lastContact: c.lastContact,
      nextRenewal: c.nextRenewal,
      mainContact: c.mainContact,
      mainContactRole: c.mainContactRole,
      strengths: Array.isArray(c.strengths) ? c.strengths : [],
      weaknesses: Array.isArray(c.weaknesses) ? c.weaknesses : [],
      sentimentTrend: (Array.isArray(c.sentimentTrend) ? c.sentimentTrend : []).map(normalizeSentiment),
      journey,
      opportunities,
      handoffData: c.handoff
        ? {
            salesRep: c.handoff.salesRep,
            handoffDate: c.handoff.handoffDate,
            keyPromises: Array.isArray(c.handoff.keyPromises) ? c.handoff.keyPromises : [],
            mainPainPoint: c.handoff.mainPainPoint,
            successDefinition30Days: c.handoff.successDefinition30Days,
            notes: c.handoff.notes,
          }
        : undefined,
      roiHistory,
      referralStatus: normalizeReferralStatus(c.referralStatus),
      assets,
      deliverables,
      transformations,
      stakeholders,
      invoices,
      agreements,
      cycleId: c.cycleId ?? undefined,
      cancellationDate: c.cancellationDate ?? undefined,
      cancellationReason: c.cancellationReason ?? undefined,
      cancellationNote: c.cancellationNote ?? undefined,
    };
      });
    },
  });
}

export async function createDeliverable(params: {
  orgId: string;
  clientId: string;
  title: string;
  description: string;
  type: 'CAMPAIGN' | 'REPORT' | 'DESIGN' | 'STRATEGY' | 'DEV';
  thumbnailUrl?: string | null;
  tags?: string[];
 }): Promise<{ id: string }> {
  return await withClientPortalTenantContext({
    orgKey: params.orgId,
    reason: 'createDeliverable',
    fn: async ({ organizationId }) => {
      const { clientId, title, description, type, thumbnailUrl, tags } = params;
      if (!clientId) throw new Error('clientId is required');
      if (!title) throw new Error('title is required');

      const portalClientId = await getPortalClientIdIfAny({ organizationId });
      if (portalClientId) throw new Error('Forbidden');

      await assertMisradClientInOrg({ organizationId, clientId });

      const now = new Date();
      const dateLabel = now.toLocaleDateString('he-IL');
      const dateAt = toUtcDateOnly(now);

      let deliverable: { id: string };

      try {
        deliverable = await prisma.misradClientDeliverable.create({
          data: {
            organization_id: organizationId,
            client_id: clientId,
            title,
            description,
            type,
            thumbnailUrl: thumbnailUrl ?? null,
            status: 'DRAFT',
            date: dateLabel,
            dateAt,
            tags: tags ?? [],
          } as unknown as Prisma.MisradClientDeliverableUncheckedCreateInput,
          select: { id: true },
        });
      } catch (e: unknown) {
        if (isSchemaMismatchError(e) && !ALLOW_SCHEMA_FALLBACKS) {
          throw new Error(
            `[SchemaMismatch] misradClientDeliverable.create failed (${getErrorMessage(e) || 'missing relation'})`
          );
        }

        if (isSchemaMismatchError(e) && ALLOW_SCHEMA_FALLBACKS) {
          reportSchemaFallback({
            source: 'app/actions/client-portal.createDeliverable',
            reason: 'misradClientDeliverable.create schema mismatch (retry without dateAt)',
            error: e,
            extras: {
              organizationId: String(organizationId || ''),
              clientId: String(clientId || ''),
              title: String(title || ''),
            },
          });
        }

        deliverable = await prisma.misradClientDeliverable.create({
          data: {
            organization_id: organizationId,
            client_id: clientId,
            title,
            description,
            type,
            thumbnailUrl: thumbnailUrl ?? null,
            status: 'DRAFT',
            date: dateLabel,
            tags: tags ?? [],
          },
          select: { id: true },
        });
      }

      return { id: deliverable.id };
    },
  });
}

export async function updateTaskStatus(params:
  | { scope: 'client_action'; orgId: string; taskId: string; status: 'PENDING' | 'COMPLETED' | 'OVERDUE' }
  | { scope: 'cycle_task'; orgId: string; taskId: string; status: 'PENDING' | 'COMPLETED' | 'OVERDUE' }
): Promise<{ ok: true }> {
  return await withClientPortalTenantContext({
    orgKey: params.orgId,
    reason: 'updateTaskStatus',
    fn: async ({ organizationId }) => {
      if (params.scope === 'client_action') {
        const updated = await prisma.misradClientAction.updateMany({
          where: { id: params.taskId, organization_id: organizationId },
          data: { status: params.status },
        });
        if (!updated?.count) throw new Error('Task not found');
        revalidatePath('/', 'layout');
        return { ok: true };
      }

      const updated = await prisma.misradCycleTask.updateMany({
        where: { id: params.taskId, organization_id: organizationId },
        data: { status: params.status },
      });
      if (!updated?.count) throw new Error('Task not found');

      revalidatePath('/', 'layout');

      return { ok: true };
    },
  });
}

export async function getInbox(params: {
  orgId: string;
  scope?: 'org' | 'client_by_clerk_email';
}): Promise<Email[]> {
  return await withClientPortalTenantContext({
    orgKey: params.orgId,
    reason: 'getInbox',
    fn: async ({ organizationId }) => {
      const scope = params.scope ?? 'org';

      const resolvedClientId = scope === 'client_by_clerk_email'
        ? (await resolveClientIdByClerkEmailOrThrow({ organizationId })).clientId
        : null;

      let rows: Array<{
        id: string;
        sender_id: string;
        recipient_id: string;
        subject: string;
        body: string;
        read_status: boolean;
        created_at: Date;
      }> = [];

      try {
        rows = await prisma.misradMessage.findMany({
          where: {
            organization_id: organizationId,
            ...(resolvedClientId
              ? {
                  OR: [{ sender_id: resolvedClientId }, { recipient_id: resolvedClientId }],
                }
              : undefined),
          },
          orderBy: { created_at: 'desc' },
          select: {
            id: true,
            sender_id: true,
            recipient_id: true,
            subject: true,
            body: true,
            read_status: true,
            created_at: true,
          },
        });
      } catch (e: unknown) {
        if (isSchemaMismatchError(e) && !ALLOW_SCHEMA_FALLBACKS) {
          throw new Error(`[SchemaMismatch] misradMessage.findMany failed (${getErrorMessage(e) || 'missing relation'})`);
        }

        if (isSchemaMismatchError(e) && ALLOW_SCHEMA_FALLBACKS) {
          reportSchemaFallback({
            source: 'app/actions/client-portal.getInbox',
            reason: 'misradMessage.findMany schema mismatch (fallback to empty inbox)',
            error: e,
            extras: {
              organizationId,
              scope,
              resolvedClientId: resolvedClientId ? String(resolvedClientId) : null,
            },
          });
        }
        return [];
      }

      const clientIds = Array.from(
        new Set(
          rows
            .flatMap((r) => [r.sender_id, r.recipient_id])
            .filter((id) => id && id !== 'agency')
        )
      );

      const clients = clientIds.length
        ? await prisma.misradClient.findMany({
            where: { organizationId, id: { in: clientIds } },
            select: { id: true, name: true },
          })
        : [];

      const clientNameById = new Map(clients.map((c) => [c.id, c.name]));

      return rows.map((r) => {
        const isFromAgency = r.sender_id === 'agency';
        const otherClientId = isFromAgency ? r.recipient_id : r.sender_id;
        const sender = isFromAgency ? 'הסוכנות' : clientNameById.get(r.sender_id) || 'לקוח';
        const snippet = (r.body || '').replace(/\s+/g, ' ').slice(0, 160);

        const email: Email = {
          id: r.id,
          sender,
          senderEmail: '',
          subject: r.subject,
          snippet,
          body: r.body,
          timestamp: new Date(r.created_at).toLocaleString('he-IL'),
          isRead: Boolean(r.read_status),
          tags: [],
          avatarUrl: undefined,
          clientId: otherClientId && otherClientId !== 'agency' ? otherClientId : undefined,
        };

        return email;
      });
    },
  });
}

export async function sendMessage(params: {
  orgId: string;
  senderId: string;
  recipientId: string;
  subject: string;
  body: string;
  relatedProjectId?: string | null;
  attachments?: Array<{ name: string; url: string; mimeType?: string | null; sizeBytes?: number | null }>;
}): Promise<{ id: string }> {
  return await withClientPortalTenantContext({
    orgKey: params.orgId,
    reason: 'sendMessage',
    fn: async ({ organizationId }) => {
      const { senderId, recipientId, subject, body, relatedProjectId, attachments } = params;
      if (!senderId) throw new Error('senderId is required');
      if (!recipientId) throw new Error('recipientId is required');
      if (!subject) throw new Error('subject is required');
      if (!body?.trim()) throw new Error('body is required');

      const portalClientId = await getPortalClientIdIfAny({ organizationId });
      if (portalClientId) {
        if (String(senderId) !== String(portalClientId)) throw new Error('Forbidden');
        if (String(recipientId) !== 'agency') throw new Error('Forbidden');
      }

      if (String(senderId) !== 'agency') {
        await assertMisradClientInOrg({ organizationId, clientId: String(senderId) });
      }
      if (String(recipientId) !== 'agency') {
        await assertMisradClientInOrg({ organizationId, clientId: String(recipientId) });
      }

      const msg = await prisma.misradMessage.create({
        data: {
          organization_id: organizationId,
          sender_id: senderId,
          recipient_id: recipientId,
          subject,
          body,
          read_status: false,
          related_project_id: relatedProjectId ?? null,
          attachments: {
            create:
              attachments?.map((a) => ({
                organization_id: organizationId,
                name: a.name,
                url: a.url,
                mimeType: a.mimeType ?? null,
                sizeBytes: a.sizeBytes ?? null,
              })) ?? [],
          },
        },
        select: { id: true },
      });

      return { id: msg.id };
    },
  });
}

export async function markAsRead(params: { orgId: string; messageId: string; read: boolean }): Promise<{ ok: true }> {
  return await withClientPortalTenantContext({
    orgKey: params.orgId,
    reason: 'markAsRead',
    fn: async ({ organizationId }) => {
      const { messageId, read } = params;
      if (!messageId) throw new Error('messageId is required');

      const portalClientId = await getPortalClientIdIfAny({ organizationId });
      const updated = await prisma.misradMessage.updateMany({
        where: {
          id: messageId,
          organization_id: organizationId,
          ...(portalClientId
            ? {
                OR: [{ sender_id: portalClientId }, { recipient_id: portalClientId }],
              }
            : undefined),
        },
        data: { read_status: read },
      });
      if (!updated?.count) throw new Error('Message not found');

      revalidatePath('/', 'layout');

      return { ok: true };
    },
  });
}

export async function analyzeAndStoreMeeting(params: {
  orgId: string;
  clientId: string;
  title: string;
  location: 'ZOOM' | 'FRONTAL' | 'PHONE';
  transcript: string;
  recordingUrl?: string | null;
  attendees?: string[];
}): Promise<{ meetingId: string; analysis: unknown }> {
  return await withClientPortalTenantContext({
    orgKey: params.orgId,
    reason: 'analyzeAndStoreMeeting',
    fn: async ({ organizationId }) => {
      const portalClientId = await getPortalClientIdIfAny({ organizationId });
      if (portalClientId && String(params.clientId) !== String(portalClientId)) {
        throw new Error('Forbidden');
      }

      await assertMisradClientInOrg({ organizationId, clientId: String(params.clientId) });
      return await analyzeAndStoreMeetingService({ ...params, orgId: organizationId });
    },
  });
}
