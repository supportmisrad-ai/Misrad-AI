'use server';

import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';
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
import { analyzeMeetingTranscriptAction } from '@/app/actions/ai';
import { AIService } from '@/lib/services/ai/AIService';

function asObject(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object') {
    return value as Record<string, unknown>;
  }
  return null;
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

async function resolveClientIdByClerkEmailOrThrow(params: { orgId: string }): Promise<{ clientId: string; email: string }> {
  const { orgId } = params;
  const user = await getAuthenticatedUser();
  const email = String(user.email || '').trim();
  if (!email) throw new Error('Client profile not found');

  const portalUser = await prisma.clientPortalUser.findFirst({
    where: {
      organizationId: orgId,
      email: { equals: email, mode: 'insensitive' },
      status: 'ACTIVE',
    },
    select: { clientId: true },
  });

  if (!portalUser?.clientId) throw new Error('Client profile not found');

  return { clientId: portalUser.clientId, email };
}

export async function getClientIdByClerkEmail(params: { orgId: string }): Promise<{ clientId: string }> {
  const { orgId } = params;
  if (!orgId) throw new Error('orgId is required');
  const { clientId } = await resolveClientIdByClerkEmailOrThrow({ orgId });
  return { clientId };
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
  if (!orgId) throw new Error('orgId is required');

  const clients = await prisma.misradClient.findMany({
    where: { organizationId: orgId },
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
  ] = await Promise.all([
    prisma.misradInvoice.count({ where: { organization_id: orgId } }),
    prisma.misradInvoice.count({ where: { organization_id: orgId, status: 'OVERDUE' } }),
    prisma.misradClientDeliverable.count({ where: { organization_id: orgId } }),
    prisma.misradClientAction.count({
      where: {
        organization_id: orgId,
        status: 'PENDING',
        type: { in: ['APPROVAL', 'UPLOAD', 'SIGNATURE', 'FORM', 'FEEDBACK'] },
      },
    }),
    prisma.misradAiTask.count({ where: { organization_id: orgId, status: 'PENDING', bucket: 'agency' } }),
    prisma.misradGroupEvent.count({ where: { organization_id: orgId, status: 'UPCOMING' } }),
  ]);

  return {
    orgId,
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
}

const toHeDate = (d: Date) => d.toLocaleDateString('he-IL');

export async function getClientOSClients(orgId: string): Promise<Client[]> {
  if (!orgId) throw new Error('orgId is required');

  const rows = await prisma.misradClient.findMany({
    where: { organizationId: orgId },
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
      assignedForms: (Array.isArray((c as unknown as { assignedForms?: unknown[] }).assignedForms)
        ? ((c as unknown as { assignedForms?: unknown[] }).assignedForms || []).map(normalizeAssignedForm)
        : []),
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
  const { orgId, clientId, title, description, type, thumbnailUrl, tags } = params;
  if (!orgId) throw new Error('orgId is required');
  if (!clientId) throw new Error('clientId is required');
  if (!title) throw new Error('title is required');

  const deliverable = await prisma.misradClientDeliverable.create({
    data: {
      organization_id: orgId,
      client_id: clientId,
      title,
      description,
      type,
      thumbnailUrl: thumbnailUrl ?? null,
      status: 'DRAFT',
      date: new Date().toLocaleDateString('he-IL'),
      tags: tags ?? [],
    },
    select: { id: true },
  });

  return { id: deliverable.id };
}

export async function updateTaskStatus(params:
  | { scope: 'client_action'; orgId: string; taskId: string; status: 'PENDING' | 'COMPLETED' | 'OVERDUE' }
  | { scope: 'cycle_task'; orgId: string; taskId: string; status: 'PENDING' | 'COMPLETED' | 'OVERDUE' }
): Promise<{ ok: true }> {
  if (!params.orgId) throw new Error('orgId is required');

  if (params.scope === 'client_action') {
    const updated = await prisma.misradClientAction.updateMany({
      where: { id: params.taskId, organization_id: params.orgId },
      data: { status: params.status },
    });
    if (!updated?.count) throw new Error('Task not found');
    return { ok: true };
  }

  const updated = await prisma.misradCycleTask.updateMany({
    where: { id: params.taskId, organization_id: params.orgId },
    data: { status: params.status },
  });
  if (!updated?.count) throw new Error('Task not found');

  return { ok: true };
}

export async function getInbox(params: {
  orgId: string;
  scope?: 'org' | 'client_by_clerk_email';
}): Promise<Email[]> {
  const { orgId, scope = 'org' } = params;
  if (!orgId) throw new Error('orgId is required');

  const resolvedClientId = scope === 'client_by_clerk_email'
    ? (await resolveClientIdByClerkEmailOrThrow({ orgId })).clientId
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
        organization_id: orgId,
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
  } catch {
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
        where: { organizationId: orgId, id: { in: clientIds } },
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
  const { orgId, senderId, recipientId, subject, body, relatedProjectId, attachments } = params;
  if (!orgId) throw new Error('orgId is required');
  if (!senderId) throw new Error('senderId is required');
  if (!recipientId) throw new Error('recipientId is required');
  if (!subject) throw new Error('subject is required');
  if (!body?.trim()) throw new Error('body is required');

  const msg = await prisma.misradMessage.create({
    data: {
      organization_id: orgId,
      sender_id: senderId,
      recipient_id: recipientId,
      subject,
      body,
      read_status: false,
      related_project_id: relatedProjectId ?? null,
      attachments: {
        create:
          attachments?.map((a) => ({
            organization_id: orgId,
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
}

export async function markAsRead(params: { orgId: string; messageId: string; read: boolean }): Promise<{ ok: true }> {
  const { orgId, messageId, read } = params;
  if (!orgId) throw new Error('orgId is required');
  if (!messageId) throw new Error('messageId is required');

  const updated = await prisma.misradMessage.updateMany({
    where: { id: messageId, organization_id: orgId },
    data: { read_status: read },
  });
  if (!updated?.count) throw new Error('Message not found');

  return { ok: true };
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
  const { orgId, clientId, title, location, transcript, attendees, recordingUrl } = params;
  if (!orgId) throw new Error('orgId is required');
  if (!clientId) throw new Error('clientId is required');
  if (!title) throw new Error('title is required');
  if (!transcript?.trim()) throw new Error('transcript is required');

  const now = new Date();
  const meetingDateLabel = now.toLocaleDateString('he-IL');

  let meeting: { id: string };
  try {
    meeting = await prisma.misradMeeting.create({
      data: {
        organization_id: orgId,
        client_id: clientId,
        date: meetingDateLabel,
        meetingAt: now,
        title,
        location,
        attendees: attendees ?? [],
        transcript,
        summary: null,
        recordingUrl: recordingUrl ?? null,
        manualNotes: null,
      },
      select: { id: true },
    });
  } catch {
    // Backwards-compatible fallback for DBs that don't have meeting_at yet.
    meeting = await prisma.misradMeeting.create({
      data: {
        organization_id: orgId,
        client_id: clientId,
        date: meetingDateLabel,
        title,
        location,
        attendees: attendees ?? [],
        transcript,
        summary: null,
        recordingUrl: recordingUrl ?? null,
        manualNotes: null,
      },
      select: { id: true },
    });
  }

  const analysis: unknown = await analyzeMeetingTranscriptAction(transcript);
  const analysisObj = asObject(analysis) ?? {};

  const warmthRaw = analysisObj.relationshipWarmth;
  const warmthNum = typeof warmthRaw === 'number' ? warmthRaw : Number(warmthRaw);
  const warmth = Number.isFinite(warmthNum) ? warmthNum : null;

  const ratingObj = asObject(analysisObj.rating) ?? {};
  const commitments = Array.isArray(analysisObj.commitments) ? analysisObj.commitments : [];

  const ratingWithRelationship: Prisma.InputJsonObject = toPrismaJsonObject({
    ...ratingObj,
    relationshipWarmth: warmth,
    relationshipNote: analysisObj.relationshipNote ?? null,
    commitments,
  });

  const summary = asString(analysisObj.summary);
  const sentimentScore = Math.round(asNumber(analysisObj.sentimentScore, 0));
  const frictionKeywords = asStringArray(analysisObj.frictionKeywords);
  const objections = asStringArray(analysisObj.objections);
  const compliments = asStringArray(analysisObj.compliments);
  const decisions = asStringArray(analysisObj.decisions);
  const intents = asStringArray(analysisObj.intents);
  const stories = asStringArray(analysisObj.stories);
  const slang = asStringArray(analysisObj.slang);

  const analysisRow = await prisma.misradMeetingAnalysisResult.create({
    data: {
      organization_id: orgId,
      client_id: clientId,
      meeting_id: meeting.id,
      summary,
      sentimentScore,
      frictionKeywords,
      objections,
      compliments,
      decisions,
      intents,
      stories,
      slang,
      rating: ratingWithRelationship as unknown as Prisma.InputJsonValue,
    },
    select: { id: true },
  });

  // Best-effort: ingest meeting transcript + analysis into organizational memory (pgvector).
  try {
    const ai = AIService.getInstance();
    await ai.ingestText({
      featureKey: 'client_os.meetings.memory_ingest',
      organizationId: orgId,
      moduleId: 'client',
      docKey: `client:meeting:${meeting.id}`,
      text: `פגישת לקוח\nכותרת: ${title}\nמיקום: ${location}\n\nתמלול:\n${transcript}\n\nסיכום ותובנות:\n${JSON.stringify(
        {
          summary,
          sentimentScore,
          relationshipWarmth: warmth,
          relationshipNote: analysisObj.relationshipNote ?? null,
          decisions,
          objections,
          compliments,
          commitments,
        },
        null,
        2
      )}`,
      isPublicInOrg: true,
      metadata: {
        source_type: 'misrad_meetings',
        source_id: meeting.id,
        client_id: clientId,
        analysis_id: analysisRow.id,
        title,
        location,
        recording_url: recordingUrl ?? null,
      },
    });
  } catch (e) {
    // best-effort
    console.warn('[analyzeAndStoreMeeting] memory ingest skipped', e);
  }

  function normalizeTaskPriority(value: unknown): 'HIGH' | 'NORMAL' | 'LOW' {
    const v = String(value || '').toUpperCase();
    if (v === 'HIGH') return 'HIGH';
    if (v === 'LOW') return 'LOW';
    return 'NORMAL';
  }

  function normalizeTaskStatus(value: unknown): 'PENDING' | 'COMPLETED' {
    const v = String(value || '').toUpperCase();
    return v === 'COMPLETED' ? 'COMPLETED' : 'PENDING';
  }

  function normalizeRiskLevel(value: unknown): 'HIGH' | 'MEDIUM' | 'LOW' {
    const v = String(value || '').toUpperCase();
    if (v === 'HIGH') return 'HIGH';
    if (v === 'LOW') return 'LOW';
    return 'MEDIUM';
  }

  const agencyTasksRaw = Array.isArray(analysisObj.agencyTasks) ? analysisObj.agencyTasks : [];
  const clientTasksRaw = Array.isArray(analysisObj.clientTasks) ? analysisObj.clientTasks : [];
  const risksRaw = Array.isArray(analysisObj.liabilityRisks) ? analysisObj.liabilityRisks : [];

  const agencyTasks = agencyTasksRaw.map((t) => {
    const obj = asObject(t) ?? {};
    return {
    organization_id: orgId,
    client_id: clientId,
    analysis_id: analysisRow.id,
    bucket: 'agency',
    task: asString(obj.task),
    deadline: asString(obj.deadline),
    priority: normalizeTaskPriority(obj.priority),
    status: normalizeTaskStatus(obj.status),
    };
  });

  const clientTasks = clientTasksRaw.map((t) => {
    const obj = asObject(t) ?? {};
    return {
    organization_id: orgId,
    client_id: clientId,
    analysis_id: analysisRow.id,
    bucket: 'client',
    task: asString(obj.task),
    deadline: asString(obj.deadline),
    priority: normalizeTaskPriority(obj.priority),
    status: normalizeTaskStatus(obj.status),
    };
  });

  const risks = risksRaw.map((r) => {
    const obj = asObject(r) ?? {};
    return {
    organization_id: orgId,
    client_id: clientId,
    analysis_id: analysisRow.id,
    quote: asString(obj.quote),
    context: asString(obj.context),
    riskLevel: normalizeRiskLevel(obj.riskLevel),
    };
  });

  if (agencyTasks.length + clientTasks.length > 0) {
    await prisma.misradAiTask.createMany({
      data: [...agencyTasks, ...clientTasks],
    });
  }

  if (risks.length > 0) {
    await prisma.misradAiLiabilityRisk.createMany({
      data: risks,
    });
  }

  return { meetingId: meeting.id, analysis };
}
