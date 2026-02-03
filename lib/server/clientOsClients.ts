'use server';

import { NextRequest } from 'next/server';
import { requireWorkspaceAccessByOrgSlugApi } from '@/lib/server/workspace';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  if (Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function getErrorStatus(error: unknown): number | null {
  const obj = asObject(error);
  const status = obj?.status;
  return typeof status === 'number' && Number.isFinite(status) ? status : null;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  const obj = asObject(error);
  const msg = obj?.message;
  return typeof msg === 'string' ? msg : '';
}

type MisradClientRow = Prisma.MisradClientGetPayload<{
  select: {
    id: true;
    name: true;
    industry: true;
    employeeCount: true;
    logoInitials: true;
    healthScore: true;
    healthStatus: true;
    status: true;
    type: true;
    tags: true;
    monthlyRetainer: true;
    profitMargin: true;
    lifetimeValue: true;
    hoursLogged: true;
    internalHourlyRate: true;
    directExpenses: true;
    profitabilityVerdict: true;
    lastContact: true;
    nextRenewal: true;
    mainContact: true;
    mainContactRole: true;
    strengths: true;
    weaknesses: true;
    sentimentTrend: true;
    referralStatus: true;
    cancellationDate: true;
    cancellationReason: true;
    cancellationNote: true;
    healthBreakdown: true;
    engagementMetrics: true;
  };
}>;

export async function getClientOsClients(request: NextRequest) {
  try {
    const orgIdFromHeader = request.headers.get('x-org-id') || request.headers.get('x-orgid');
    if (!orgIdFromHeader) {
      return apiSuccess({ clients: [] });
    }

    let workspace;
    try {
      workspace = await requireWorkspaceAccessByOrgSlugApi(orgIdFromHeader);
    } catch (e: unknown) {
      const status = getErrorStatus(e) ?? 403;
      return apiError(e, { status, message: getErrorMessage(e) || 'Forbidden' });
    }

    const organizationId = String(workspace.id);

    const data = await prisma.misradClient.findMany({
      where: { organizationId },
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        name: true,
        industry: true,
        employeeCount: true,
        logoInitials: true,
        healthScore: true,
        healthStatus: true,
        status: true,
        type: true,
        tags: true,
        monthlyRetainer: true,
        profitMargin: true,
        lifetimeValue: true,
        hoursLogged: true,
        internalHourlyRate: true,
        directExpenses: true,
        profitabilityVerdict: true,
        lastContact: true,
        nextRenewal: true,
        mainContact: true,
        mainContactRole: true,
        strengths: true,
        weaknesses: true,
        sentimentTrend: true,
        referralStatus: true,
        cancellationDate: true,
        cancellationReason: true,
        cancellationNote: true,
        healthBreakdown: true,
        engagementMetrics: true,
      },
    });

    const clients = (data || []).map((row: MisradClientRow) => {
      const healthBreakdown = row.healthBreakdown ?? { financial: 0, engagement: 0, sentiment: 0 };
      const engagementMetrics = row.engagementMetrics ?? {
        daysSinceLastLogin: 0,
        unopenedEmails: 0,
        lastReportDownloadDate: null,
        silentChurnDetected: false,
      };

      return {
        id: row.id,
        name: row.name ?? '',
        industry: row.industry ?? '',
        employeeCount: row.employeeCount ?? 0,
        logoInitials: row.logoInitials ?? '',
        healthScore: row.healthScore ?? 0,
        healthStatus: row.healthStatus ?? 'STABLE',
        status: row.status ?? 'ACTIVE',
        type: row.type ?? 'RETAINER',
        tags: row.tags ?? [],
        monthlyRetainer: row.monthlyRetainer ?? 0,
        profitMargin: row.profitMargin ?? 0,
        lifetimeValue: row.lifetimeValue ?? 0,
        hoursLogged: row.hoursLogged ?? 0,
        internalHourlyRate: row.internalHourlyRate ?? 0,
        directExpenses: row.directExpenses ?? 0,
        profitabilityVerdict: row.profitabilityVerdict ?? '',
        lastContact: row.lastContact ?? '',
        nextRenewal: row.nextRenewal ?? '',
        mainContact: row.mainContact ?? '',
        mainContactRole: row.mainContactRole ?? '',
        strengths: row.strengths ?? [],
        weaknesses: row.weaknesses ?? [],
        sentimentTrend: row.sentimentTrend ?? [],
        referralStatus: row.referralStatus ?? 'LOCKED',
        cancellationDate: row.cancellationDate ?? null,
        cancellationReason: row.cancellationReason ?? null,
        cancellationNote: row.cancellationNote ?? null,
        healthBreakdown,
        engagementMetrics,
        journeyStages: [],
        opportunities: [],
        successGoals: [],
        handoff: null,
        roiRecords: [],
        pendingActions: [],
        assignedForms: [],
        assets: [],
        deliverables: [],
        transformations: [],
        stakeholders: [],
      };
    });

    return apiSuccess({ clients });
  } catch {
    return apiSuccess({ clients: [] });
  }
}
