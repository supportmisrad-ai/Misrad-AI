'use server';

import { createClient } from '@/lib/supabase';
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/errorHandler';
import { GlobalSystemMetrics, ClientStatus } from '@/types/social';
import { translateError } from '@/lib/errorTranslations';
import { updateClinicClient } from '@/app/actions/client-clinic';
import { requireSuperAdmin } from '@/lib/auth';
import { randomUUID } from 'crypto';

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
      return authCheck as any;
    }

    await requireSuperAdmin();

    const supabase = createClient();
    const limit = Math.max(1, Math.min(500, Number(params?.limit ?? 200)));
    const query = String(params?.query ?? '').trim();

    let q = supabase
      .from('client_clients')
      .select('id, organization_id, full_name, metadata, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (query) {
      q = q.ilike('full_name', `%${query}%`);
    }

    const { data, error } = await q;
    if (error) return createErrorResponse(error, 'שגיאה בטעינת לקוחות') as any;

    const clients: AdminClientLite[] = (data || []).map((row: any) => {
      const md = row?.metadata ?? {};
      const companyName = (md.companyName || md.name || row.full_name || '').toString();
      const email = (md.email || row.email || null) as string | null;
      return {
        id: String(row.id),
        organizationId: row.organization_id ? String(row.organization_id) : null,
        fullName: String(row.full_name || ''),
        companyName,
        email: email ? String(email) : null,
        createdAt: row.created_at ? String(row.created_at) : null,
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
export async function getSystemMetrics(): Promise<{ success: boolean; data?: GlobalSystemMetrics & { trends?: any }; error?: string }> {
  try {
    await requireSuperAdmin();
    const supabase = createClient();

    // Get metrics from database
    const { data: metricsData, error: metricsError } = await supabase
      .from('global_system_metrics')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(2); // Get last 2 to calculate trends

    // Calculate real-time metrics from clients
    const { data: clientsData } = await supabase
      .from('client_clients')
      .select('created_at, metadata');

    const totalMRR = (clientsData || []).reduce((sum, c: any) => sum + (Number(c?.metadata?.monthlyFee) || 0), 0);
    const activeSubscriptions = (clientsData || []).filter((c: any) => (c?.metadata?.status ?? '') === 'Active').length;
    const overdueInvoicesCount = (clientsData || []).filter((c: any) => (c?.metadata?.paymentStatus ?? '') === 'overdue').length;

    // Calculate trends
    const previousMRR = metricsData?.[1]?.total_mrr ? Number(metricsData[1].total_mrr) : totalMRR;
    const currentMRR = metricsData?.[0]?.total_mrr ? Number(metricsData[0].total_mrr) : totalMRR;
    const mrrTrend = previousMRR > 0 ? ((currentMRR - previousMRR) / previousMRR * 100).toFixed(1) : '0';
    
    const previousSubscriptions = metricsData?.[1]?.active_subscriptions || activeSubscriptions;
    const subscriptionsTrend = previousSubscriptions > 0 ? (activeSubscriptions - previousSubscriptions) : 0;
    
    const previousOverdue = metricsData?.[1]?.overdue_invoices_count || overdueInvoicesCount;
    const overdueTrend = previousOverdue > 0 ? ((overdueInvoicesCount - previousOverdue) / previousOverdue * 100).toFixed(0) : '0';

    const thisMonth = new Date();
    thisMonth.setDate(1);
    const newClientsThisMonth = clientsData?.filter(c => {
      const created = new Date(c.created_at);
      return created >= thisMonth;
    }).length || 0;

    const metrics: GlobalSystemMetrics & { trends?: any } = {
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
      return authCheck as any;
    }

    await requireSuperAdmin();

    const supabase = createClient();

    const { data: clientRow, error } = await supabase
      .from('client_clients')
      .select('id, organization_id, metadata')
      .eq('id', clientId)
      .maybeSingle();

    if (error || !clientRow?.id) {
      return createErrorResponse(error || new Error('Client not found'), 'שגיאה בעדכון סטטוס לקוח');
    }

    const nextMetadata = { ...(clientRow as any).metadata, status };
    await updateClinicClient({
      orgId: String((clientRow as any).organization_id),
      clientId: String((clientRow as any).id),
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
      return authCheck as any;
    }

    await requireSuperAdmin();

    const supabase = createClient();

    const status: ClientStatus = blocked ? 'Overdue' : 'Active';
    const { data: clientRow, error } = await supabase
      .from('client_clients')
      .select('id, organization_id, metadata')
      .eq('id', clientId)
      .maybeSingle();

    if (error || !clientRow?.id) {
      return createErrorResponse(error || new Error('Client not found'), 'שגיאה בחסימת/שחרור לקוח');
    }

    const nextMetadata = { ...(clientRow as any).metadata, status };
    await updateClinicClient({
      orgId: String((clientRow as any).organization_id),
      clientId: String((clientRow as any).id),
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
      return authCheck as any;
    }

    await requireSuperAdmin();

    const supabase = createClient();

    // Recalculate and update system metrics
    const { data: clients } = await supabase
      .from('client_clients')
      .select('created_at, metadata');

    const totalMRR = (clients || []).reduce((sum, c: any) => sum + (Number(c?.metadata?.monthlyFee) || 0), 0);
    const activeSubscriptions = (clients || []).filter((c: any) => (c?.metadata?.status ?? '') === 'Active').length;
    const overdueInvoicesCount = (clients || []).filter((c: any) => (c?.metadata?.paymentStatus ?? '') === 'overdue').length;
    
    const thisMonth = new Date();
    thisMonth.setDate(1);
    const newClientsThisMonth = clients?.filter(c => {
      const created = new Date(c.created_at);
      return created >= thisMonth;
    }).length || 0;

    // Update or insert metrics
    await supabase
      .from('global_system_metrics')
      .upsert({
        total_mrr: totalMRR,
        active_subscriptions: activeSubscriptions,
        overdue_invoices_count: overdueInvoicesCount,
        new_clients_this_month: newClientsThisMonth,
      }, {
        onConflict: 'id',
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

export async function getAPIHealthStatus(): Promise<{ success: boolean; data?: any[]; error?: string }> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return authCheck as any;
    }

    await requireSuperAdmin();

    // Check integration statuses
    const supabase = createClient();
    const { data: integrations } = await supabase
      .from('integration_status')
      .select('*')
      .order('name');

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

    const healthStatus = [
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
}): Promise<{ success: boolean; data?: any[]; error?: string }> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return authCheck as any;
    }

    await requireSuperAdmin();

    const supabase = createClient();

    const limit = Math.max(1, Math.min(200, Number(params?.limit ?? 50)));
    const offset = Math.max(0, Number(params?.offset ?? 0));

    // Get activity logs (if table exists)
    const { data: activityLogs } = await supabase
      .from('activity_logs')
      .select(`
        *,
        nexus_users (name)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Transform to audit log format
    const auditLog = (activityLogs || []).map((log: any) => ({
      action: log.action,
      user: log.nexus_users?.name || 'משתמש',
      time: new Date(log.created_at).toLocaleString('he-IL'),
      timestamp: log.created_at,
    }));

    // If we have logs, return them
    if (auditLog.length > 0) {
      return createSuccessResponse(auditLog);
    }

    // If no logs, try to get from sync_logs as fallback
    const { data: syncLogs } = await supabase
      .from('sync_logs')
      .select('*')
      .order('completed_at', { ascending: false })
      .range(offset, offset + Math.min(limit, 20) - 1);

    if (syncLogs && syncLogs.length > 0) {
      const fallbackLogs = syncLogs.map((log: any) => ({
        action: `סנכרון ${log.integration_name || 'מערכת'}`,
        user: 'מערכת',
        time: new Date(log.completed_at).toLocaleString('he-IL'),
        timestamp: log.completed_at,
      }));
      return createSuccessResponse(fallbackLogs);
    }

    // If no data at all, return empty array with message
    return createSuccessResponse([]);
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
      return authCheck as any;
    }

    await requireSuperAdmin();

    const supabase = createClient();

    // Verify client exists
    const { data: client, error: clientError } = await supabase
      .from('client_clients')
      .select('id, organization_id, full_name, metadata')
      .eq('id', clientId)
      .maybeSingle();

    if (clientError || !client) {
      return createErrorResponse(clientError, 'לקוח לא נמצא');
    }

    // Create impersonation session record
    // Note: in DB schema `token` is required (unique), and in some deployments the table name is `social_impersonation_sessions`.
    const token = randomUUID();
    const sessionPayload: any = {
      admin_user_id: authCheck.userId,
      client_id: clientId,
      token,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
    };

    let session: any = null;
    let sessionError: any = null;

    const tryInsert = async (table: string) => {
      const res = await supabase.from(table).insert(sessionPayload).select().single();
      session = res.data as any;
      sessionError = res.error as any;
      return res;
    };

    await tryInsert('impersonation_sessions');
    if (sessionError) {
      await tryInsert('social_impersonation_sessions');
    }

    if (sessionError) {
      // If table doesn't exist / RLS / schema mismatch - still allow navigation, but return token for traceability.
      return createSuccessResponse({ impersonationToken: token });
    }

    // Log the impersonation action
    try {
      const displayName =
        (client as any)?.metadata?.companyName || (client as any)?.metadata?.name || (client as any)?.full_name || 'לקוח';
      await supabase.from('activity_logs').insert({
        user_id: authCheck.userId,
        action: `התחזות ללקוח: ${displayName}`,
        created_at: new Date().toISOString(),
      });
    } catch (logError) {
      // Logging is optional
      console.warn('[impersonateUser] Failed to log action:', logError);
    }

    return createSuccessResponse({ impersonationToken: session?.token ? String(session.token) : token });
  } catch (error) {
    return createErrorResponse(error, 'שגיאה בכניסה כמשתמש אחר');
  }
}

