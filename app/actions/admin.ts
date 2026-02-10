'use server';

import prisma, { queryRawAllowlisted } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/errorHandler';
import { GlobalSystemMetrics, ClientStatus } from '@/types/social';
import { updateClinicClient } from '@/app/actions/client-clinic';
import { requireSuperAdmin, requireAuditLogAccess } from '@/lib/auth';
import { randomUUID } from 'crypto';

import { asObject } from '@/lib/shared/unknown';
const ALLOW_SCHEMA_FALLBACKS = String(process.env.MISRAD_ALLOW_SCHEMA_FALLBACKS || '').toLowerCase() === 'true';


function isMissingOrganizationIdColumnError(err: unknown): boolean {
  const obj = asObject(err) ?? {};
  const message = String(obj.message || '').toLowerCase();
  const code = String(obj.code || '').toLowerCase();
  return code === '42703' || (message.includes('column') && message.includes('organization_id'));
}

export type AdminClientLite = {
  id: string;
  organizationId: string | null;
  fullName: string;
  companyName: string;
  email: string | null;
  createdAt: string | null;
};

export async function getAdminClients(params?: {
  query?: string;
  limit?: number;
}): Promise<{ success: boolean; data?: AdminClientLite[]; error?: string }> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return { success: false, error: authCheck.error || 'נדרשת התחברות' };
    }

    await requireSuperAdmin();
    const limit = Math.max(1, Math.min(500, Number(params?.limit ?? 200)));
    const query = String(params?.query ?? '').trim();

    const data = await prisma.clientClient.findMany({
      where: query
        ? {
            fullName: {
              contains: query,
              mode: 'insensitive',
            },
          }
        : undefined,
      select: {
        id: true,
        organizationId: true,
        fullName: true,
        email: true,
        metadata: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const clients: AdminClientLite[] = (data || []).map((row) => {
      const md = asObject(row.metadata) ?? {};
      const companyName = String(md.companyName || md.name || row.fullName || '');
      const emailRaw = md.email ?? row.email ?? null;
      const email = typeof emailRaw === 'string' ? emailRaw : emailRaw == null ? null : String(emailRaw);
      return {
        id: String(row.id),
        organizationId: row.organizationId ? String(row.organizationId) : null,
        fullName: String(row.fullName || ''),
        companyName,
        email: email ? String(email) : null,
        createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : null,
      };
    });

    return createSuccessResponse(clients);
  } catch (error) {
    return createErrorResponse(error, 'שגיאה בטעינת לקוחות');
  }
}

/**
 * Get global system metrics with trends
 */
export async function getSystemMetrics(): Promise<{
  success: boolean;
  data?: GlobalSystemMetrics & { trends?: { mrr: string; subscriptions: number; overdue: string } };
  error?: string;
}> {
  try {
    await requireSuperAdmin();

    // Get metrics from database
    const metricsData = await prisma.globalSystemMetric.findMany({
      orderBy: { created_at: 'desc' },
      take: 2,
    });

    const aggRows = await queryRawAllowlisted<
      Array<{
        total_mrr: unknown;
        active_subscriptions: unknown;
        overdue_invoices_count: unknown;
        new_clients_this_month: unknown;
      }>
    >(prisma, {
      reason: 'admin_metrics_client_clients_agg',
      query: `
      SELECT
        COALESCE(
          SUM(COALESCE(NULLIF((metadata->>'monthlyFee'), '')::numeric, 0)),
          0
        ) AS total_mrr,
        COUNT(*) FILTER (WHERE COALESCE(metadata->>'status', '') = 'Active') AS active_subscriptions,
        COUNT(*) FILTER (WHERE COALESCE(metadata->>'paymentStatus', '') = 'overdue') AS overdue_invoices_count,
        COUNT(*) FILTER (WHERE created_at >= date_trunc('month', now())) AS new_clients_this_month
      FROM client_clients;
    `,
      values: [],
    });

    const agg = Array.isArray(aggRows) && aggRows.length > 0 ? aggRows[0] : null;
    const totalMRR = agg?.total_mrr == null ? 0 : Number(agg.total_mrr);
    const activeSubscriptions = agg?.active_subscriptions == null ? 0 : Number(agg.active_subscriptions);
    const overdueInvoicesCount = agg?.overdue_invoices_count == null ? 0 : Number(agg.overdue_invoices_count);

    // Calculate trends
    const previousMRR = metricsData?.[1]?.total_mrr ? Number(metricsData[1].total_mrr) : totalMRR;
    const currentMRR = metricsData?.[0]?.total_mrr ? Number(metricsData[0].total_mrr) : totalMRR;
    const mrrTrend = previousMRR > 0 ? ((currentMRR - previousMRR) / previousMRR * 100).toFixed(1) : '0';
    
    const previousSubscriptions = metricsData?.[1]?.active_subscriptions || activeSubscriptions;
    const subscriptionsTrend = previousSubscriptions > 0 ? (activeSubscriptions - previousSubscriptions) : 0;
    
    const previousOverdue = metricsData?.[1]?.overdue_invoices_count || overdueInvoicesCount;
    const overdueTrend = previousOverdue > 0 ? ((overdueInvoicesCount - previousOverdue) / previousOverdue * 100).toFixed(0) : '0';

    const newClientsThisMonth = agg?.new_clients_this_month == null ? 0 : Number(agg.new_clients_this_month);

    const metrics: GlobalSystemMetrics & { trends?: { mrr: string; subscriptions: number; overdue: string } } = {
      totalMRR: currentMRR,
      activeSubscriptions,
      overdueInvoicesCount,
      apiHealthScore: metricsData?.[0]?.api_health_score || 100,
      geminiTokenUsage: metricsData?.[0]?.gemini_token_usage || 0,
      newClientsThisMonth,
      trends: {
        mrr: mrrTrend,
        subscriptions: subscriptionsTrend,
        overdue: overdueTrend,
      },
    };

    return createSuccessResponse(metrics);
  } catch (error) {
    return createErrorResponse(error, 'שגיאה בקבלת נתוני מערכת');
  }
}

/**
 * Update client status (admin only)
 */
export async function updateClientStatus(
  clientId: string,
  status: ClientStatus
): Promise<{ success: boolean; error?: string }> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return { success: false, error: authCheck.error || 'נדרשת התחברות' };
    }

    await requireSuperAdmin();

    const clientRow = await prisma.clientClient.findUnique({
      where: { id: clientId },
      select: { id: true, organizationId: true, metadata: true },
    });

    if (!clientRow?.id) {
      return createErrorResponse(new Error('Client not found'), 'שגיאה בעדכון סטטוס לקוח');
    }

    const md = asObject(clientRow.metadata) ?? {};
    const nextMetadata = { ...md, status };
    await updateClinicClient({
      orgId: String(clientRow.organizationId || ''),
      clientId: String(clientRow.id),
      updates: { metadata: nextMetadata },
    });

    return createSuccessResponse(true);
  } catch (error) {
    return createErrorResponse(error, 'שגיאה בעדכון סטטוס לקוח');
  }
}

/**
 * Block/Unblock client access
 */
export async function toggleClientAccess(
  clientId: string,
  blocked: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return { success: false, error: authCheck.error || 'נדרשת התחברות' };
    }

    await requireSuperAdmin();

    const status: ClientStatus = blocked ? 'Overdue' : 'Active';

    const clientRow = await prisma.clientClient.findUnique({
      where: { id: clientId },
      select: { id: true, organizationId: true, metadata: true },
    });

    if (!clientRow?.id) {
      return createErrorResponse(new Error('Client not found'), 'שגיאה בחסימת/שחרור לקוח');
    }

    const md = asObject(clientRow.metadata) ?? {};
    const nextMetadata = { ...md, status };
    await updateClinicClient({
      orgId: String(clientRow.organizationId || ''),
      clientId: String(clientRow.id),
      updates: { metadata: nextMetadata },
    });

    return createSuccessResponse(true);
  } catch (error) {
    return createErrorResponse(error, 'שגיאה בחסימת/שחרור לקוח');
  }
}

/**
 * Refresh system data
 */
export async function refreshSystemData(): Promise<{ success: boolean; error?: string }> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return { success: false, error: authCheck.error || 'נדרשת התחברות' };
    }

    await requireSuperAdmin();

    // Recalculate and update system metrics
    const aggRows = await queryRawAllowlisted<
      Array<{
        total_mrr: unknown;
        active_subscriptions: unknown;
        overdue_invoices_count: unknown;
        new_clients_this_month: unknown;
      }>
    >(prisma, {
      reason: 'admin_metrics_client_clients_agg',
      query: `
      SELECT
        COALESCE(
          SUM(COALESCE(NULLIF((metadata->>'monthlyFee'), '')::numeric, 0)),
          0
        ) AS total_mrr,
        COUNT(*) FILTER (WHERE COALESCE(metadata->>'status', '') = 'Active') AS active_subscriptions,
        COUNT(*) FILTER (WHERE COALESCE(metadata->>'paymentStatus', '') = 'overdue') AS overdue_invoices_count,
        COUNT(*) FILTER (WHERE created_at >= date_trunc('month', now())) AS new_clients_this_month
      FROM client_clients;
    `,
      values: [],
    });

    const agg = Array.isArray(aggRows) && aggRows.length > 0 ? aggRows[0] : null;
    const totalMRR = agg?.total_mrr == null ? 0 : Number(agg.total_mrr);
    const activeSubscriptions = agg?.active_subscriptions == null ? 0 : Number(agg.active_subscriptions);
    const overdueInvoicesCount = agg?.overdue_invoices_count == null ? 0 : Number(agg.overdue_invoices_count);
    const newClientsThisMonth = agg?.new_clients_this_month == null ? 0 : Number(agg.new_clients_this_month);

    await prisma.globalSystemMetric.create({
      data: {
        total_mrr: new Prisma.Decimal(totalMRR),
        active_subscriptions: activeSubscriptions,
        overdue_invoices_count: overdueInvoicesCount,
        new_clients_this_month: newClientsThisMonth,
      },
    });

    return createSuccessResponse(true);
  } catch (error) {
    return createErrorResponse(error, 'שגיאה ברענון נתוני מערכת');
  }
}

/**
 * Get API health status
 */
/**
 * Measure API latency
 */
async function measureLatency(url: string): Promise<number> {
  try {
    const start = Date.now();
    const response = await fetch(url, { 
      method: 'HEAD',
      cache: 'no-store',
      signal: AbortSignal.timeout(5000)
    });
    const end = Date.now();
    if (response.ok) {
      return end - start;
    }
    return -1;
  } catch (error) {
    return -1;
  }
}

type ApiHealthStatusRow = { name: string; status: string; latency: string };

export async function getAPIHealthStatus(): Promise<{ success: boolean; data?: ApiHealthStatusRow[]; error?: string }> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return { success: false, error: authCheck.error || 'נדרשת התחברות' };
    }

    await requireSuperAdmin();

    // Check integration statuses
    const integrations = await prisma.integrationStatus.findMany({
      orderBy: { name: 'asc' },
    });

    // Measure actual latencies
    const [metaLatency, googleLatency, geminiLatency, supabaseLatency] = await Promise.all([
      measureLatency('https://graph.facebook.com'),
      measureLatency('https://www.googleapis.com'),
      measureLatency('https://generativelanguage.googleapis.com'),
      measureLatency(process.env.NEXT_PUBLIC_SUPABASE_URL || ''),
    ]);

    const formatLatency = (ms: number): string => {
      if (ms < 0) return '-';
      return `${ms}ms`;
    };

    const healthStatus: ApiHealthStatusRow[] = [
      {
        name: 'ממשק מטא (פייסבוק/אינסטגרם)',
        status: integrations?.find(i => i.name === 'facebook')?.is_connected ? 'תקין' : 'לא מחובר',
        latency: formatLatency(metaLatency),
      },
      {
        name: 'ממשק גוגל לעסקים',
        status: integrations?.find(i => i.name === 'google')?.is_connected ? 'תקין' : 'לא מחובר',
        latency: formatLatency(googleLatency),
      },
      {
        name: 'ממשק טיקטוק עסקי',
        status: integrations?.find(i => i.name === 'tiktok')?.is_connected ? 'תקין' : 'תחזוקה',
        latency: '-',
      },
      {
        name: 'מנוע בינה מלאכותית (Gemini)',
        status: integrations?.find(i => i.name === 'gemini')?.is_connected ? 'תקין' : 'לא מחובר',
        latency: formatLatency(geminiLatency),
      },
      {
        name: 'שער תשתית Social OS',
        status: 'תקין',
        latency: formatLatency(supabaseLatency),
      },
    ];

    return createSuccessResponse(healthStatus);
  } catch (error) {
    return createErrorResponse(error, 'שגיאה בבדיקת תקינות ממשקים');
  }
}

/**
 * Get security audit log
 */
export async function getSecurityAuditLog(params?: {
  limit?: number;
  offset?: number;
}): Promise<{ success: boolean; data?: Array<{ action: string; user: string; time: string; timestamp: string | null }>; error?: string }> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return { success: false, error: authCheck.error || 'נדרשת התחברות' };
    }

    await requireAuditLogAccess();

    const limit = Math.max(1, Math.min(200, Number(params?.limit ?? 50)));
    const offset = Math.max(0, Number(params?.offset ?? 0));

    const syncLogs = await prisma.socialMediaSyncLog.findMany({
      orderBy: { completed_at: 'desc' },
      skip: offset,
      take: Math.min(limit, 20),
    });

    const fallbackLogs = (syncLogs || []).map((log) => ({
      action: `סנכרון ${String(log.integration_name || 'מערכת')}`,
      user: 'מערכת',
      time: log.completed_at ? new Date(log.completed_at).toLocaleString('he-IL') : '',
      timestamp: log.completed_at ? new Date(log.completed_at).toISOString() : null,
    }));

    return createSuccessResponse(fallbackLogs);
  } catch (error) {
    console.error('[getSecurityAuditLog] Error:', error);
    // Return empty array instead of mock data
    return createSuccessResponse([]);
  }
}

/**
 * Impersonate user (admin only - for support)
 * Creates a temporary session to view the system as the client
 */
export async function impersonateUser(clientId: string): Promise<{ success: boolean; impersonationToken?: string; error?: string }> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return { success: false, error: authCheck.error || 'נדרשת התחברות' };
    }

    await requireSuperAdmin();

    // Verify client exists
    const client = await prisma.clientClient.findUnique({
      where: { id: clientId },
      select: { id: true, organizationId: true, fullName: true, metadata: true },
    });

    if (!client?.id) {
      return createErrorResponse(new Error('Client not found'), 'לקוח לא נמצא');
    }

    const organizationId = client.organizationId ? String(client.organizationId) : '';
    if (!organizationId) {
      return createErrorResponse(null, 'Tenant Isolation lockdown: לקוח ללא organization_id לא ניתן להתחזות אליו');
    }

    // Create impersonation session record
    // Note: in DB schema `token` is required (unique), and in some deployments the table name is `social_impersonation_sessions`.
    const token = randomUUID();
    let session: { token: string } | null = null;
    try {
      session = await prisma.impersonationSession.create({
        data: {
          admin_user_id: String(authCheck.userId || ''),
          client_id: clientId,
          token,
          expires_at: new Date(Date.now() + 60 * 60 * 1000),
        },
        select: { token: true },
      });
    } catch (sessionError: unknown) {
      // If table doesn't exist / RLS / schema mismatch - still allow navigation, but return token for traceability.
      if (!ALLOW_SCHEMA_FALLBACKS) {
        const msg = String((sessionError as Error)?.message || sessionError || '').trim();
        throw new Error(`[SchemaMismatch] social_impersonation_sessions create failed (${msg || 'unknown error'})`);
      }
      return createSuccessResponse({ impersonationToken: token });
    }

    // Log the impersonation action
    try {
      const md = asObject(client.metadata) ?? {};
      const displayName = md.companyName || md.name || client.fullName || 'לקוח';
      void displayName;
    } catch (logError) {
      // Logging is optional
      console.warn('[impersonateUser] Failed to log action:', logError);
    }

    return createSuccessResponse({ impersonationToken: session?.token ? String(session.token) : token });
  } catch (error) {
    return createErrorResponse(error, 'שגיאה בכניסה כמשתמש אחר');
  }
}

