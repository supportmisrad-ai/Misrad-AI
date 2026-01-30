'use server';

import { NextRequest } from 'next/server';
import { createClient as createSupabaseClient } from '@/lib/supabase';
import { requireWorkspaceAccessByOrgSlugApi } from '@/lib/server/workspace';
import { apiError, apiSuccess } from '@/lib/server/api-response';

export async function getClientOsClients(request: NextRequest) {
  try {
    const orgIdFromHeader = request.headers.get('x-org-id') || request.headers.get('x-orgid');
    if (!orgIdFromHeader) {
      return apiSuccess({ clients: [] });
    }

    try {
      await requireWorkspaceAccessByOrgSlugApi(orgIdFromHeader);
    } catch (e: any) {
      const status = typeof e?.status === 'number' ? e.status : 403;
      return apiError(e, { status, message: e?.message || 'Forbidden' });
    }

    const supabaseClient = createSupabaseClient();

    const { data, error } = await supabaseClient
      .from('misrad_clients')
      .select('*')
      .eq('organization_id', orgIdFromHeader)
      .order('created_at', { ascending: false });

    if (error) {
      return apiSuccess({ clients: [] });
    }

    const clients = (data || []).map((row: any) => {
      const healthBreakdown = row.health_breakdown ?? row.healthBreakdown ?? { financial: 0, engagement: 0, sentiment: 0 };
      const engagementMetrics = row.engagement_metrics ?? row.engagementMetrics ?? {
        daysSinceLastLogin: 0,
        unopenedEmails: 0,
        lastReportDownloadDate: null,
        silentChurnDetected: false,
      };

      return {
        id: row.id,
        name: row.name ?? '',
        industry: row.industry ?? '',
        employeeCount: row.employee_count ?? row.employeeCount ?? 0,
        logoInitials: row.logo_initials ?? row.logoInitials ?? '',
        healthScore: row.health_score ?? row.healthScore ?? 0,
        healthStatus: row.health_status ?? row.healthStatus ?? 'STABLE',
        status: row.status ?? 'ACTIVE',
        type: row.type ?? 'RETAINER',
        tags: row.tags ?? [],
        monthlyRetainer: row.monthly_retainer ?? row.monthlyRetainer ?? 0,
        profitMargin: row.profit_margin ?? row.profitMargin ?? 0,
        lifetimeValue: row.lifetime_value ?? row.lifetimeValue ?? 0,
        hoursLogged: row.hours_logged ?? row.hoursLogged ?? 0,
        internalHourlyRate: row.internal_hourly_rate ?? row.internalHourlyRate ?? 0,
        directExpenses: row.direct_expenses ?? row.directExpenses ?? 0,
        profitabilityVerdict: row.profitability_verdict ?? row.profitabilityVerdict ?? '',
        lastContact: row.last_contact ?? row.lastContact ?? '',
        nextRenewal: row.next_renewal ?? row.nextRenewal ?? '',
        mainContact: row.main_contact ?? row.mainContact ?? '',
        mainContactRole: row.main_contact_role ?? row.mainContactRole ?? '',
        strengths: row.strengths ?? [],
        weaknesses: row.weaknesses ?? [],
        sentimentTrend: row.sentiment_trend ?? row.sentimentTrend ?? [],
        referralStatus: row.referral_status ?? row.referralStatus ?? 'LOCKED',
        cancellationDate: row.cancellation_date ?? row.cancellationDate ?? null,
        cancellationReason: row.cancellation_reason ?? row.cancellationReason ?? null,
        cancellationNote: row.cancellation_note ?? row.cancellationNote ?? null,
        healthBreakdown,
        engagementMetrics,
        journeyStages: row.journey_stages ?? row.journeyStages ?? [],
        opportunities: row.opportunities ?? [],
        successGoals: row.success_goals ?? row.successGoals ?? [],
        handoff: row.handoff ?? null,
        roiRecords: row.roi_records ?? row.roiRecords ?? [],
        pendingActions: row.pending_actions ?? row.pendingActions ?? [],
        assignedForms: row.assigned_forms ?? row.assignedForms ?? [],
        assets: row.assets ?? [],
        deliverables: row.deliverables ?? [],
        transformations: row.transformations ?? [],
        stakeholders: row.stakeholders ?? [],
      };
    });

    return apiSuccess({ clients });
  } catch {
    return apiSuccess({ clients: [] });
  }
}
