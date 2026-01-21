'use server';

import { createClient } from '@/lib/supabase';
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/errorHandler';
import { requireSuperAdmin } from '@/lib/auth';

export type AdminGodViewKpis = {
  totalOrganizations: number;
  totalProfiles: number;
  revenuePaidThisMonth: number;
  aiCreditsUsedTodayCents: number;
};

export type AdminGodViewRecentOrganization = {
  id: string;
  name: string;
  slug: string | null;
  createdAt: string | null;
  subscriptionStatus: string | null;
  primaryClientId: string | null;
};

export type AdminGodViewAlertType = 'ai_quota_exceeded' | 'payment_overdue';

export type AdminGodViewAlert = {
  type: AdminGodViewAlertType;
  title: string;
  details: string;
  organizationId?: string | null;
  organizationSlug?: string | null;
};

function startOfTodayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function startOfMonthISO() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

async function sumPaidInvoicesThisMonth(supabase: ReturnType<typeof createClient>): Promise<number> {
  const monthStart = startOfMonthISO();

  const attemptPaidDate = await supabase
    .from('invoices')
    .select('amount, paid_date, status')
    .eq('status', 'paid')
    .gte('paid_date', monthStart);

  if (!attemptPaidDate.error) {
    const rows = Array.isArray(attemptPaidDate.data) ? attemptPaidDate.data : [];
    return rows.reduce((sum: number, r: any) => sum + (Number(r?.amount) || 0), 0);
  }

  const attemptDate = await supabase
    .from('invoices')
    .select('amount, date, status')
    .eq('status', 'paid')
    .gte('date', monthStart);

  if (!attemptDate.error) {
    const rows = Array.isArray(attemptDate.data) ? attemptDate.data : [];
    return rows.reduce((sum: number, r: any) => sum + (Number(r?.amount) || 0), 0);
  }

  const attemptCreatedAt = await supabase
    .from('invoices')
    .select('amount, created_at, status')
    .eq('status', 'paid')
    .gte('created_at', monthStart);

  if (!attemptCreatedAt.error) {
    const rows = Array.isArray(attemptCreatedAt.data) ? attemptCreatedAt.data : [];
    return rows.reduce((sum: number, r: any) => sum + (Number(r?.amount) || 0), 0);
  }

  return 0;
}

async function sumAiCreditsUsedTodayCents(supabase: ReturnType<typeof createClient>): Promise<number> {
  const todayStart = startOfTodayISO();
  const { data, error } = await supabase
    .from('ai_usage_logs')
    .select('charged_cents, status, created_at')
    .eq('status', 'success')
    .gte('created_at', todayStart)
    .limit(10000);

  if (error) return 0;

  const rows = Array.isArray(data) ? data : [];
  return rows.reduce((sum: number, r: any) => sum + (Number(r?.charged_cents) || 0), 0);
}

async function getRecentOrganizationsWithPrimaryClientId(supabase: ReturnType<typeof createClient>): Promise<AdminGodViewRecentOrganization[]> {
  const { data: orgs, error } = await supabase
    .from('organizations')
    .select('id, name, slug, created_at, subscription_status')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error || !Array.isArray(orgs) || orgs.length === 0) return [];

  const orgIds = orgs.map((o: any) => String(o.id)).filter(Boolean);
  const { data: clients } = await supabase
    .from('client_clients')
    .select('id, organization_id, created_at')
    .in('organization_id', orgIds)
    .order('created_at', { ascending: true })
    .limit(500);

  const primaryClientByOrgId = new Map<string, string>();
  for (const c of Array.isArray(clients) ? clients : []) {
    const orgId = (c as any)?.organization_id ? String((c as any).organization_id) : '';
    const clientId = (c as any)?.id ? String((c as any).id) : '';
    if (!orgId || !clientId) continue;
    if (!primaryClientByOrgId.has(orgId)) primaryClientByOrgId.set(orgId, clientId);
  }

  return orgs.map((o: any) => {
    const id = String(o.id);
    return {
      id,
      name: String(o.name || ''),
      slug: o.slug ? String(o.slug) : null,
      createdAt: o.created_at ? String(o.created_at) : null,
      subscriptionStatus: o.subscription_status ? String(o.subscription_status) : null,
      primaryClientId: primaryClientByOrgId.get(id) || null,
    };
  });
}

async function getSystemAlerts(supabase: ReturnType<typeof createClient>): Promise<AdminGodViewAlert[]> {
  const alerts: AdminGodViewAlert[] = [];

  try {
    const { data: settingsRows } = await supabase
      .from('organization_settings')
      .select('organization_id, ai_quota_cents')
      .not('ai_quota_cents', 'is', null)
      .limit(30);

    const orgIds = (Array.isArray(settingsRows) ? settingsRows : [])
      .map((r: any) => (r?.organization_id ? String(r.organization_id) : null))
      .filter(Boolean) as string[];

    let orgsById = new Map<string, { name: string; slug: string | null }>();
    if (orgIds.length) {
      const { data: orgs } = await supabase
        .from('organizations')
        .select('id, name, slug')
        .in('id', orgIds);

      for (const o of Array.isArray(orgs) ? orgs : []) {
        const id = String((o as any).id);
        orgsById.set(id, { name: String((o as any).name || ''), slug: (o as any).slug ? String((o as any).slug) : null });
      }
    }

    for (const row of Array.isArray(settingsRows) ? settingsRows : []) {
      const orgId = row?.organization_id ? String(row.organization_id) : null;
      const quota = row?.ai_quota_cents === null || row?.ai_quota_cents === undefined ? null : Number(row.ai_quota_cents);
      if (!orgId || quota === null) continue;

      const { data: statusRows, error } = await supabase.rpc('ai_get_credit_status', {
        p_organization_id: orgId,
      });

      if (error) continue;
      const st = Array.isArray(statusRows) ? statusRows[0] : null;
      const remaining = st?.remaining_cents === null || st?.remaining_cents === undefined ? null : Number(st.remaining_cents);
      const used = st?.used_cents === null || st?.used_cents === undefined ? 0 : Number(st.used_cents);

      if (remaining !== null && remaining <= 0 && used > 0) {
        const info = orgsById.get(orgId);
        alerts.push({
          type: 'ai_quota_exceeded',
          title: `חריגה ממכסת AI${info?.name ? ` - ${info.name}` : ''}`,
          details: `נוצלו ${Math.round(used / 100).toLocaleString('he-IL')} קרדיטים החודש (מכסה: ${Math.round(quota / 100).toLocaleString('he-IL')})`,
          organizationId: orgId,
          organizationSlug: info?.slug ?? null,
        });
      }

      if (alerts.length >= 10) break;
    }
  } catch {
    // Best-effort only
  }

  try {
    const { data: clients } = await supabase
      .from('client_clients')
      .select('organization_id, metadata')
      .limit(2000);

    const overdueOrgIds = new Set<string>();
    for (const c of Array.isArray(clients) ? clients : []) {
      const orgId = (c as any)?.organization_id ? String((c as any).organization_id) : null;
      const paymentStatus = (c as any)?.metadata?.paymentStatus ? String((c as any).metadata.paymentStatus) : '';
      if (!orgId) continue;
      if (paymentStatus.toLowerCase() === 'overdue') overdueOrgIds.add(orgId);
    }

    const orgIds = Array.from(overdueOrgIds).slice(0, 20);
    if (orgIds.length) {
      const { data: orgs } = await supabase
        .from('organizations')
        .select('id, name, slug')
        .in('id', orgIds);

      for (const o of Array.isArray(orgs) ? orgs : []) {
        alerts.push({
          type: 'payment_overdue',
          title: `תשלום באיחור - ${String((o as any).name || '')}`,
          details: 'לפי סטטוס תשלום בנתוני הלקוח (paymentStatus=overdue)',
          organizationId: String((o as any).id),
          organizationSlug: (o as any).slug ? String((o as any).slug) : null,
        });
        if (alerts.length >= 15) break;
      }
    }
  } catch {
    // Best-effort only
  }

  return alerts;
}

export async function getAdminGodView(): Promise<{
  success: boolean;
  data?: {
    kpis: AdminGodViewKpis;
    recentOrganizations: AdminGodViewRecentOrganization[];
    alerts: AdminGodViewAlert[];
  };
  error?: string;
}> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return authCheck as any;
    }

    await requireSuperAdmin();

    const supabase = createClient();

    const [orgCountRes, profilesCountRes] = await Promise.all([
      supabase.from('organizations').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
    ]);

    const totalOrganizations = Number(orgCountRes.count || 0);
    const totalProfiles = Number(profilesCountRes.count || 0);

    const revenuePaidThisMonth = await sumPaidInvoicesThisMonth(supabase);
    const aiCreditsUsedTodayCents = await sumAiCreditsUsedTodayCents(supabase);
    const recentOrganizations = await getRecentOrganizationsWithPrimaryClientId(supabase);
    const alerts = await getSystemAlerts(supabase);

    return createSuccessResponse({
      kpis: {
        totalOrganizations,
        totalProfiles,
        revenuePaidThisMonth,
        aiCreditsUsedTodayCents,
      },
      recentOrganizations,
      alerts,
    });
  } catch (error) {
    return createErrorResponse(error, 'שגיאה בטעינת דשבורד ניהול');
  }
}
