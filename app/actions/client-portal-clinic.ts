'use server';


import { logger } from '@/lib/server/logger';
// IMPORTANT:
// This file is an adapter layer.
// It keeps the existing Client UI contracts intact while routing core data
// to the new clinic tables (client_*). We do NOT delete legacy actions yet.

import type {
  Client,
  ClientAction,
  ClientDeliverable,
  FeedbackItem,
  HealthBreakdown,
  EngagementMetrics,
  JourneyStage,
  Opportunity,
  ROIRecord,
  Sentiment,
  Stakeholder,
  SuccessGoal,
  ClientAsset,
  ClientAgreement,
  ClientTransformation,
  Email,
} from '@/components/client-os-full/types';
import { ClientStatus, ClientType, HealthStatus } from '@/components/client-os-full/types';
import type { Meeting } from '@/components/client-portal/types';

import {
  createClinicPortalContent,
  createClinicTask,
  getClinicClients,
  listClinicPortalContent,
  listClinicTasks,
  listClinicSessions,
  listClinicFeedbacks,
  createClinicFeedback,
  updateClinicTask,
  type ClinicTask,
  type ClinicSession,
  type ClinicFeedback,
} from '@/app/actions/client-clinic';

import { createStorageClient } from '@/lib/supabase';
import { resolveStorageUrlsMaybeBatchedWithClient } from '@/lib/services/operations/storage';
import { getAuthenticatedUser } from '@/lib/auth';
import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';
import prisma from '@/lib/prisma';
import { getErrorMessage } from '@/lib/server/workspace-access/utils';

// Legacy actions are intentionally kept and re-exported for features
// we haven't migrated to client_* yet.
import * as legacy from '@/app/actions/client-portal';

const toHeDate = (d: Date) => d.toLocaleDateString('he-IL');

function mapClinicTaskToClientAction(task: ClinicTask): ClientAction {
  // Map clinic task status to ClientAction status
  let status: 'PENDING' | 'COMPLETED' | 'OVERDUE' = 'PENDING';
  if (task.status === 'completed' || task.status === 'done') {
    status = 'COMPLETED';
  } else if (task.status === 'overdue') {
    status = 'OVERDUE';
  }

  // Determine task type from metadata or description
  let type: 'APPROVAL' | 'UPLOAD' | 'SIGNATURE' | 'FORM' | 'FEEDBACK' = 'UPLOAD';
  const desc = (task.description || '').toLowerCase();
  const title = (task.title || '').toLowerCase();
  if (desc.includes('אישור') || title.includes('אישור') || desc.includes('approval')) {
    type = 'APPROVAL';
  } else if (desc.includes('חתימה') || title.includes('חתימה') || desc.includes('signature')) {
    type = 'SIGNATURE';
  } else if (desc.includes('טופס') || title.includes('טופס') || desc.includes('form')) {
    type = 'FORM';
  } else if (desc.includes('פידבק') || title.includes('פידבק') || desc.includes('feedback')) {
    type = 'FEEDBACK';
  }

  // Check if overdue
  const isOverdue = task.dueAt && new Date(task.dueAt) < new Date() && status === 'PENDING';
  if (isOverdue) {
    status = 'OVERDUE';
  }

  return {
    id: task.id,
    title: task.title,
    description: task.description || '',
    type,
    status,
    dueDate: task.dueAt ? toHeDate(new Date(task.dueAt)) : toHeDate(new Date()),
    isBlocking: task.priority === 'high' || task.priority === 'urgent',
    lastReminderSent: undefined,
  };
}

function mapClinicSessionToMeeting(session: ClinicSession): Meeting {
  // Map session location to Meeting location
  let location: 'ZOOM' | 'FRONTAL' | 'PHONE' = 'ZOOM';
  const loc = (session.location || '').toLowerCase();
  if (loc.includes('frontal') || loc.includes('פרונטלי') || loc.includes('פנים אל פנים')) {
    location = 'FRONTAL';
  } else if (loc.includes('phone') || loc.includes('טלפון')) {
    location = 'PHONE';
  }

  // Format date
  const date = session.startAt ? toHeDate(new Date(session.startAt)) : toHeDate(new Date());

  // Extract attendees from metadata or use default
  const metadataObj = (session.metadata && typeof session.metadata === 'object' && !Array.isArray(session.metadata))
    ? (session.metadata as Record<string, unknown>)
    : null;

  const attendeesRaw = metadataObj?.['attendees'];
  const attendees: string[] = Array.isArray(attendeesRaw) ? attendeesRaw.filter((x): x is string => typeof x === 'string') : [];

  const transcriptRaw = metadataObj?.['transcript'];
  const transcript = typeof transcriptRaw === 'string' ? transcriptRaw : '';

  const aiAnalysis = metadataObj?.['aiAnalysis'] as Meeting['aiAnalysis'] | undefined;

  const recordingUrlRaw = metadataObj?.['recordingUrl'];
  const recordingUrl = typeof recordingUrlRaw === 'string' ? recordingUrlRaw : undefined;

  return {
    id: session.id,
    clientId: session.clientId,
    date,
    title: session.sessionType || 'פגישה',
    location,
    attendees,
    transcript,
    summary: session.summary || undefined,
    aiAnalysis,
    files: undefined,
    recordingUrl,
    manualNotes: undefined,
  };
}

function defaultHealthBreakdown(): HealthBreakdown {
  return { financial: 0, engagement: 0, sentiment: 0 };
}

function defaultEngagement(): EngagementMetrics {
  return {
    daysSinceLastLogin: 0,
    unopenedEmails: 0,
    lastReportDownloadDate: null,
    silentChurnDetected: false,
  };
}

function mapClinicClientToClientOS(client: { id: string; fullName: string }): Client {
  // Minimal mapping to satisfy existing UI types without changing UI.
  // Most advanced fields default to safe values.
  return {
    id: client.id,
    name: client.fullName,
    industry: '',
    employeeCount: 0,
    logoInitials: client.fullName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase(),
    healthScore: 0,
    healthBreakdown: defaultHealthBreakdown(),
    engagementMetrics: defaultEngagement(),
    healthStatus: HealthStatus.STABLE,
    status: ClientStatus.ACTIVE,
    type: ClientType.RETAINER,
    tags: [],
    pendingActions: [],
    assignedForms: [],
    successGoals: [
      {
        id: `goal-${client.id}`,
        title: 'היעד המרכזי',
        metricCurrent: 0,
        metricTarget: 1,
        unit: '',
        deadline: toHeDate(new Date()),
        status: 'IN_PROGRESS',
        lastUpdated: 'הרגע',
        history: [],
      } as SuccessGoal,
    ],
    monthlyRetainer: 0,
    profitMargin: 0,
    lifetimeValue: 0,
    hoursLogged: 0,
    internalHourlyRate: 0,
    directExpenses: 0,
    profitabilityVerdict: '',
    lastContact: '',
    nextRenewal: '',
    mainContact: client.fullName,
    mainContactRole: '',
    strengths: [],
    weaknesses: [],
    sentimentTrend: [] as Sentiment[],
    journey: [] as JourneyStage[],
    opportunities: [] as Opportunity[],
    handoffData: undefined,
    roiHistory: [] as ROIRecord[],
    referralStatus: 'LOCKED',
    assets: [] as ClientAsset[],
    deliverables: [] as ClientDeliverable[],
    transformations: [] as ClientTransformation[],
    stakeholders: [] as Stakeholder[],
    invoices: [],
    agreements: [] as ClientAgreement[],
    cycleId: undefined,
    cancellationDate: undefined,
    cancellationReason: undefined,
    cancellationNote: undefined,
  };
}

// ---- New routed actions (client_*) ----

export async function getClientOSClients(orgId: string): Promise<Client[]> {
  const clinicClients = await getClinicClients(orgId);
  return clinicClients.map((c) => mapClinicClientToClientOS({ id: c.id, fullName: c.fullName }));
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
  const clients = await getClinicClients(orgId);
  const tasks = await listClinicTasks({ orgId });

  return {
    orgId,
    clientsCount: clients.length,
    activeClientsCount: clients.length,
    totalMRR: 0,
    revenueAtRisk: 0,
    invoicesCount: 0,
    overdueInvoicesCount: 0,
    deliverablesCount: 0,
    openClientTasksCount: tasks.filter((t) => t.status !== 'done' && t.status !== 'completed').length,
    openAgencyTasksCount: 0,
    groupEventsUpcomingCount: 0,
  };
}

export async function updateTaskStatus(params:
  | { scope: 'client_action'; orgId: string; taskId: string; status: 'PENDING' | 'COMPLETED' | 'OVERDUE' }
  | { scope: 'cycle_task'; orgId: string; taskId: string; status: 'PENDING' | 'COMPLETED' | 'OVERDUE' }
): Promise<{ ok: true }> {
  // For now: treat taskId as a clinic task id.
  // We keep signature to avoid touching UI.
  await updateClinicTask({
    orgId: params.orgId,
    taskId: params.taskId,
    updates: { status: params.status === 'COMPLETED' ? 'completed' : params.status === 'OVERDUE' ? 'overdue' : 'todo' },
  });
  return { ok: true };
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
  // Persist deliverables as portal content entries for the clinic room.
  const { orgId, clientId, title, description, type, thumbnailUrl, tags } = params;

  const created = await createClinicPortalContent({
    orgId,
    clientId,
    kind: 'deliverable',
    title,
    body: description,
    data: { type, thumbnailUrl: thumbnailUrl ?? null, tags: tags ?? [] },
    isPublished: false,
  });

  return { id: created.id };
}

export async function getClientOSTasks(orgId: string, clientId: string): Promise<ClientAction[]> {
  try {
    console.debug('[getClientOSTasks] loading tasks', { orgId, clientId });
    const tasks = await listClinicTasks({ orgId, clientId });
    console.debug('[getClientOSTasks] tasks loaded', {
      count: tasks.length,
      taskIds: tasks.slice(0, 5).map((t) => t.id),
    });
    return tasks.map(mapClinicTaskToClientAction);
  } catch (error: unknown) {
    logger.error('getClientOSTasks', getErrorMessage(error) || 'unexpected error', error);
    return [];
  }
}

export async function getClientOSSessions(orgId: string, clientId: string): Promise<Meeting[]> {
  try {
    console.debug('[getClientOSSessions] loading sessions', { orgId, clientId });
    const sessions = await listClinicSessions({ orgId, clientId });
    console.debug('[getClientOSSessions] sessions loaded', {
      count: sessions.length,
      sessionIds: sessions.slice(0, 5).map((s) => s.id),
    });
    const meetings = sessions.map(mapClinicSessionToMeeting);

    // Resolve storage URLs separately so a failure doesn't break the whole list
    try {
      const ttlSeconds = 60 * 60;
      const supabase = createStorageClient();
      const resolvedUrls = await resolveStorageUrlsMaybeBatchedWithClient(
        supabase,
        meetings.map((m) => m.recordingUrl),
        ttlSeconds,
        { organizationId: orgId }
      );
      return meetings.map((m, idx) => ({
        ...m,
        recordingUrl: resolvedUrls[idx] || m.recordingUrl,
      }));
    } catch {
      return meetings;
    }
  } catch (error: unknown) {
    logger.error('getClientOSSessions', getErrorMessage(error) || 'unexpected error', error);
    return [];
  }
}

export async function getOrganizationSessions(orgId: string): Promise<Meeting[]> {
  try {
    console.debug('[getOrganizationSessions] loading sessions', { orgId });
    const sessions = await listClinicSessions({ orgId });
    console.debug('[getOrganizationSessions] sessions loaded', {
      count: sessions.length,
      sessionIds: sessions.slice(0, 5).map((s) => s.id),
    });
    const meetings = sessions.map(mapClinicSessionToMeeting);

    // Resolve storage URLs separately so a failure doesn't break the whole list
    try {
      const ttlSeconds = 60 * 60;
      const supabase = createStorageClient();
      const resolvedUrls = await resolveStorageUrlsMaybeBatchedWithClient(
        supabase,
        meetings.map((m) => m.recordingUrl),
        ttlSeconds,
        { organizationId: orgId }
      );
      return meetings.map((m, idx) => ({
        ...m,
        recordingUrl: resolvedUrls[idx] || m.recordingUrl,
      }));
    } catch {
      return meetings;
    }
  } catch (error: unknown) {
    logger.error('getOrganizationSessions', getErrorMessage(error) || 'unexpected error', error);
    return [];
  }
}

function mapClinicFeedbackToFeedbackItem(feedback: ClinicFeedback, clientName: string): FeedbackItem {
  // Determine sentiment based on rating
  let sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' = 'NEUTRAL';
  if (feedback.rating >= 8) {
    sentiment = 'POSITIVE';
  } else if (feedback.rating <= 6) {
    sentiment = 'NEGATIVE';
  }

  // Extract keywords from comment
  const keywords: string[] = [];
  if (feedback.comment) {
    const commonWords = ['מצוין', 'טוב', 'מעולה', 'בעיה', 'איטי', 'מהיר', 'מומלץ', 'לא מומלץ'];
    commonWords.forEach((word) => {
      if (feedback.comment?.toLowerCase().includes(word.toLowerCase())) {
        keywords.push(word);
      }
    });
  }

  return {
    id: feedback.id,
    clientId: feedback.clientId,
    clientName,
    score: feedback.rating,
    comment: feedback.comment || '',
    date: feedback.createdAt ? toHeDate(new Date(feedback.createdAt)) : toHeDate(new Date()),
    keywords,
    sentiment,
    source: 'PLATFORM_POPUP' as const,
  };
}

export async function getClientOSFeedbacks(orgId: string, clientId?: string): Promise<FeedbackItem[]> {
  try {
    console.debug('[getClientOSFeedbacks] loading feedbacks', { orgId, clientId });
    const feedbacks = await listClinicFeedbacks({ orgId, clientId });
    console.debug('[getClientOSFeedbacks] feedbacks loaded', {
      count: feedbacks.length,
      feedbackIds: feedbacks.slice(0, 5).map((f) => f.id),
    });

    // Get client names for mapping
    const clients = await getClientOSClients(orgId);
    const clientMap = new Map(clients.map((c) => [c.id, c.name]));

    return feedbacks.map((f) => mapClinicFeedbackToFeedbackItem(f, clientMap.get(f.clientId) || 'לקוח'));
  } catch (error: unknown) {
    logger.error('getClientOSFeedbacks', 'error', {
      message: getErrorMessage(error) || String(error),
    });
    return [];
  }
}

export async function createClientOSFeedback(params: {
  orgId: string;
  clientId: string;
  rating: number;
  comment?: string | null;
}): Promise<{ id: string }> {
  return await createClinicFeedback({
    orgId: params.orgId,
    clientId: params.clientId,
    rating: params.rating,
    comment: params.comment,
  });
}

export async function getClientIdByClerkEmail(params: { orgId: string }): Promise<{ clientId: string } | null> {
  const { orgId } = params;
  if (!orgId) {
    logger.warn('getClientIdByClerkEmail', 'orgId is required');
    return null;
  }

  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(orgId);
    const user = await getAuthenticatedUser();
    const email = String(user?.email || '').trim();
    
    console.debug('[getClientIdByClerkEmail] searching for client', {
      orgId,
      workspaceId: workspace.id,
      userEmail: email ? `${email.substring(0, 3)}***` : 'no email',
    });

    if (!email) {
      logger.warn('getClientIdByClerkEmail', 'no email found for user');
      return null;
    }

    const data = await prisma.clientClient.findFirst({
      where: {
        organizationId: String(workspace.id),
        email: { equals: email, mode: 'insensitive' },
      },
      select: { id: true, email: true, fullName: true },
    });

    if (!data?.id) {
      logger.warn('getClientIdByClerkEmail', 'no client found with matching email', {
        searchedEmail: email ? `${email.substring(0, 3)}***` : 'no email',
        organizationId: workspace.id,
      });
      return null;
    }

    console.debug('[getClientIdByClerkEmail] found client', {
      clientId: data.id,
      clientName: data.fullName,
    });

    return { clientId: data.id };
  } catch (error: unknown) {
    logger.error('getClientIdByClerkEmail', 'unexpected error', {
      message: getErrorMessage(error) || String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return null;
  }
}

// ---- Legacy passthrough (kept intentionally) ----

export async function analyzeAndStoreMeeting(
  ...args: Parameters<typeof legacy.analyzeAndStoreMeeting>
): Promise<Awaited<ReturnType<typeof legacy.analyzeAndStoreMeeting>>> {
  return await legacy.analyzeAndStoreMeeting(...args);
}

export async function getInbox(...args: Parameters<typeof legacy.getInbox>): Promise<Awaited<ReturnType<typeof legacy.getInbox>>> {
  return await legacy.getInbox(...args);
}

export async function sendMessage(
  ...args: Parameters<typeof legacy.sendMessage>
): Promise<Awaited<ReturnType<typeof legacy.sendMessage>>> {
  return await legacy.sendMessage(...args);
}

export async function markAsRead(
  ...args: Parameters<typeof legacy.markAsRead>
): Promise<Awaited<ReturnType<typeof legacy.markAsRead>>> {
  return await legacy.markAsRead(...args);
}
