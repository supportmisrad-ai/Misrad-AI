'use server';

import prisma from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';
import type {
  Client,
  ClientAction,
  ClientAgreement,
  ClientAsset,
  ClientDeliverable,
  ClientTransformation,
  Email,
  EngagementMetrics,
  HealthBreakdown,
  Invoice,
  JourneyStage,
  Opportunity,
  ROIRecord,
  Sentiment,
  Stakeholder,
  SuccessGoal,
} from '@/components/client-os-full/types';
import { analyzeMeetingTranscriptAction } from '@/app/actions/ai';

const db = prisma as any;

async function resolveClientIdByClerkEmailOrThrow(params: { orgId: string }): Promise<{ clientId: string; email: string }> {
  const { orgId } = params;
  const user = await getAuthenticatedUser();
  const email = String(user.email || '').trim();
  if (!email) throw new Error('Client profile not found');

  const client = await db.misradClient.findFirst({
    where: {
      organization_id: orgId,
      email: { equals: email, mode: 'insensitive' },
    },
    select: { id: true },
  });

  if (!client?.id) throw new Error('Client profile not found');

  return { clientId: client.id, email };
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

  const clients = (await db.misradClient.findMany({
    where: { organization_id: orgId },
    select: {
      id: true,
      status: true,
      monthlyRetainer: true,
      healthStatus: true,
    },
  })) as Array<{ id: string; status: string; monthlyRetainer: number | null; healthStatus: string }>;

  const clientsCount = clients.length;
  const activeClients = clients.filter((c: { status: string }) => c.status === 'ACTIVE');
  const activeClientsCount = activeClients.length;

  const totalMRR = activeClients.reduce((acc: number, c: { monthlyRetainer: number | null }) => acc + (c.monthlyRetainer ?? 0), 0);
  const revenueAtRisk = activeClients
    .filter((c: { healthStatus: string }) => c.healthStatus === 'AT_RISK' || c.healthStatus === 'CRITICAL')
    .reduce((acc: number, c: { monthlyRetainer: number | null }) => acc + (c.monthlyRetainer ?? 0), 0);

  const [
    invoicesCount,
    overdueInvoicesCount,
    deliverablesCount,
    openClientTasksCount,
    openAgencyTasksCount,
    groupEventsUpcomingCount,
  ] = await Promise.all([
    db.misradInvoice.count({ where: { organization_id: orgId } }),
    db.misradInvoice.count({ where: { organization_id: orgId, status: 'OVERDUE' } }),
    db.misradClientDeliverable.count({ where: { organization_id: orgId } }),
    db.misradClientAction.count({
      where: {
        organization_id: orgId,
        status: 'PENDING',
        type: { in: ['APPROVAL', 'UPLOAD', 'SIGNATURE', 'FORM', 'FEEDBACK'] },
      },
    }),
    db.misradAiTask.count({ where: { organization_id: orgId, status: 'PENDING', bucket: 'agency' } }),
    db.misradGroupEvent.count({ where: { organization_id: orgId, status: 'UPCOMING' } }),
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

  const rows = await db.misradClient.findMany({
    where: { organization_id: orgId },
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

  return (rows as any[]).map((c: any): Client => {
    const healthBreakdown: HealthBreakdown = (c.healthBreakdown as any) ?? {
      financial: 0,
      engagement: 0,
      sentiment: 0,
    };
    const engagementMetrics: EngagementMetrics = (c.engagementMetrics as any) ?? {
      daysSinceLastLogin: 0,
      unopenedEmails: 0,
      lastReportDownloadDate: null,
      silentChurnDetected: false,
    };

    const deliverables: ClientDeliverable[] = (c.deliverables || []).map((d: any) => ({
      id: d.id,
      title: d.title,
      description: d.description,
      type: d.type as any,
      thumbnailUrl: d.thumbnailUrl ?? undefined,
      status: d.status as any,
      date: d.date ?? toHeDate(d.created_at),
      tags: (d.tags as any) ?? [],
    }));

    const assets: ClientAsset[] = (c.assets || []).map((a: any) => ({
      id: a.id,
      name: a.name,
      type: a.type as any,
      url: a.url,
      category: a.category as any,
      uploadedBy: a.uploadedBy as any,
      date: a.date ?? toHeDate(a.created_at),
    }));

    const pendingActions: ClientAction[] = (c.actions || []).map((a: any) => ({
      id: a.id,
      title: a.title,
      description: a.description,
      type: a.type as any,
      status: a.status as any,
      dueDate: a.dueDate,
      isBlocking: a.isBlocking,
      lastReminderSent: a.lastReminderSent ?? undefined,
    }));

    const successGoals: SuccessGoal[] = (c.successGoals || []).map((g: any) => ({
      id: g.id,
      title: g.title,
      metricCurrent: g.metricCurrent,
      metricTarget: g.metricTarget,
      unit: g.unit,
      deadline: g.deadline,
      status: g.status as any,
      lastUpdated: g.lastUpdated,
      aiForecast: g.aiForecast ?? undefined,
      history: (g.history || []).map((h: any) => ({ date: h.date, value: h.value })),
    }));

    const journey: JourneyStage[] = (c.journeyStages || []).map((s: any) => ({
      id: s.id,
      name: s.name,
      status: s.status as any,
      date: s.date ?? undefined,
      completionPercentage: s.completionPercentage ?? undefined,
      milestones: (s.milestones || []).map((m: any) => ({
        id: m.id,
        label: m.label,
        isCompleted: m.isCompleted,
        required: m.required,
      })),
    }));

    const opportunities: Opportunity[] = (c.opportunities || []).map((o: any) => ({
      id: o.id,
      title: o.title,
      value: o.value,
      matchScore: o.matchScore,
      status: o.status as any,
    }));

    const roiHistory: ROIRecord[] = (c.roiRecords || []).map((r: any) => ({
      id: r.id,
      date: r.date,
      value: r.value,
      description: r.description,
      category: r.category as any,
    }));

    const transformations: ClientTransformation[] = (c.transformations || []).map((t: any) => ({
      id: t.id,
      title: t.title,
      before: (t.before as any) ?? { date: '', mediaType: 'TEXT', description: '', emotionalState: '' },
      after: (t.after as any) ?? { date: '', mediaType: 'TEXT', description: '', emotionalState: '' },
      metrics: t.metrics ?? undefined,
      isPublished: t.isPublished,
    }));

    const stakeholders: Stakeholder[] = (c.stakeholders || []).map((s: any) => ({
      id: s.id,
      name: s.name,
      jobTitle: s.jobTitle,
      nexusRole: s.nexusRole as any,
      influence: s.influence,
      sentiment: s.sentiment,
      lastContact: s.lastContact,
      email: s.email ?? undefined,
      avatarUrl: s.avatarUrl ?? undefined,
      notes: s.notes,
    }));

    const invoices: Invoice[] = (c.invoices || []).map((inv: any) => ({
      id: inv.id,
      number: inv.number,
      amount: inv.amount,
      date: inv.date,
      dueDate: inv.dueDate,
      status: inv.status as any,
      downloadUrl: inv.downloadUrl,
    }));

    const agreements: ClientAgreement[] = (c.agreements || []).map((ag: any) => ({
      id: ag.id,
      title: ag.title,
      type: ag.type as any,
      signedDate: ag.signedDate,
      expiryDate: ag.expiryDate ?? undefined,
      status: ag.status as any,
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
      healthStatus: c.healthStatus as any,
      status: c.status as any,
      type: c.type as any,
      tags: (c.tags as any) ?? [],
      pendingActions,
      assignedForms: (c.assignedForms as any) ?? [],
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
      strengths: (c.strengths as any) ?? [],
      weaknesses: (c.weaknesses as any) ?? [],
      sentimentTrend: ((c.sentimentTrend as any) ?? []) as Sentiment[],
      journey,
      opportunities,
      handoffData: c.handoff
        ? {
            salesRep: c.handoff.salesRep,
            handoffDate: c.handoff.handoffDate,
            keyPromises: (c.handoff.keyPromises as any) ?? [],
            mainPainPoint: c.handoff.mainPainPoint,
            successDefinition30Days: c.handoff.successDefinition30Days,
            notes: c.handoff.notes,
          }
        : undefined,
      roiHistory,
      referralStatus: c.referralStatus as any,
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

  const deliverable = await db.misradClientDeliverable.create({
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
    await db.misradClientAction.update({
      where: { id: params.taskId },
      data: { status: params.status },
    });
    return { ok: true };
  }

  await db.misradCycleTask.update({
    where: { id: params.taskId },
    data: { status: params.status },
  });

  return { ok: true };
}

export async function getInbox(params: {
  orgId: string;
  scope?: 'org' | 'client_by_clerk_email';
}): Promise<Email[]> {
  const { orgId, scope = 'org' } = params;
  if (!orgId) throw new Error('orgId is required');

  if (!db?.misradMessage?.findMany) {
    return [];
  }

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
    rows = (await db.misradMessage.findMany({
      where: {
        organization_id: orgId,
        ...(resolvedClientId
          ? {
              OR: [{ sender_id: resolvedClientId }, { recipient_id: resolvedClientId }],
            }
          : null),
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
    })) as any;
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
    ? ((await db.misradClient.findMany({
        where: { organization_id: orgId, id: { in: clientIds } },
        select: { id: true, name: true },
      })) as Array<{ id: string; name: string }> )
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

  const msg = await db.misradMessage.create({
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

  await db.misradMessage.update({
    where: { id: messageId },
    data: { read_status: read },
  });

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

  const meeting = await db.misradMeeting.create({
    data: {
      organization_id: orgId,
      client_id: clientId,
      date: new Date().toLocaleDateString('he-IL'),
      title,
      location: location as any,
      attendees: attendees ?? [],
      transcript,
      summary: null,
      recordingUrl: recordingUrl ?? null,
      manualNotes: null,
    },
    select: { id: true },
  });

  const analysis = await analyzeMeetingTranscriptAction(transcript);

  const analysisRow = await db.misradMeetingAnalysisResult.create({
    data: {
      organization_id: orgId,
      client_id: clientId,
      meeting_id: meeting.id,
      summary: analysis.summary,
      sentimentScore: Math.round(Number(analysis.sentimentScore) || 0),
      frictionKeywords: analysis.frictionKeywords ?? [],
      objections: analysis.objections ?? [],
      compliments: analysis.compliments ?? [],
      decisions: analysis.decisions ?? [],
      intents: (analysis as any).intents ?? [],
      stories: (analysis as any).stories ?? [],
      slang: (analysis as any).slang ?? [],
      rating: (analysis as any).rating ?? {},
    },
    select: { id: true },
  });

  const agencyTasks = (analysis.agencyTasks ?? []).map((t: any) => ({
    organization_id: orgId,
    client_id: clientId,
    analysis_id: analysisRow.id,
    bucket: 'agency',
    task: t.task,
    deadline: t.deadline,
    priority: (t.priority as any) ?? 'NORMAL',
    status: (t.status as any) ?? 'PENDING',
  }));
  const clientTasks = (analysis.clientTasks ?? []).map((t: any) => ({
    organization_id: orgId,
    client_id: clientId,
    analysis_id: analysisRow.id,
    bucket: 'client',
    task: t.task,
    deadline: t.deadline,
    priority: (t.priority as any) ?? 'NORMAL',
    status: (t.status as any) ?? 'PENDING',
  }));

  const risks = (analysis.liabilityRisks ?? []).map((r: any) => ({
    organization_id: orgId,
    client_id: clientId,
    analysis_id: analysisRow.id,
    quote: r.quote,
    context: r.context,
    riskLevel: (r.riskLevel as any) ?? 'MEDIUM',
  }));

  if (agencyTasks.length + clientTasks.length > 0) {
    await db.misradAiTask.createMany({
      data: [...agencyTasks, ...clientTasks],
    });
  }

  if (risks.length > 0) {
    await db.misradAiLiabilityRisk.createMany({
      data: risks,
    });
  }

  return { meetingId: meeting.id, analysis };
}

export async function getProfileSettings(clerkUserId: string): Promise<{
  clerkUserId: string;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  role: string | null;
  organizationId: string | null;
}> {
  if (!clerkUserId) throw new Error('clerkUserId is required');

  const user = await db.social_users.findUnique({
    where: { clerk_user_id: clerkUserId },
    select: {
      clerk_user_id: true,
      email: true,
      full_name: true,
      avatar_url: true,
      role: true,
      organization_id: true,
    },
  });

  if (!user) {
    throw new Error('User not found in social_users');
  }

  return {
    clerkUserId: user.clerk_user_id,
    email: user.email ?? null,
    fullName: user.full_name ?? null,
    avatarUrl: user.avatar_url ?? null,
    role: user.role ?? null,
    organizationId: user.organization_id ?? null,
  };
}

export async function updateProfile(params: {
  clerkUserId: string;
  fullName?: string | null;
  avatarUrl?: string | null;
}): Promise<{ ok: true }> {
  const { clerkUserId, fullName, avatarUrl } = params;
  if (!clerkUserId) throw new Error('clerkUserId is required');

  await db.social_users.update({
    where: { clerk_user_id: clerkUserId },
    data: {
      ...(fullName !== undefined ? { full_name: fullName } : null),
      ...(avatarUrl !== undefined ? { avatar_url: avatarUrl } : null),
    },
  });

  return { ok: true };
}
