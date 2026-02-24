'use server';

import prisma from '@/lib/prisma';
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/errorHandler';
import { requireSuperAdmin } from '@/lib/auth';
import { withPrismaTenantIsolationOverride, withTenantIsolationContext } from '@/lib/prisma-tenant-guard';
import { Prisma } from '@prisma/client';

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

async function sumPaidInvoicesThisMonth(): Promise<number> {
  const monthStart = new Date(startOfMonthISO());
  const res = await prisma.socialMediaInvoice.aggregate({
    where: {
      status: 'paid',
      OR: [{ date: { gte: monthStart } }, { created_at: { gte: monthStart } }],
    },
    _sum: { amount: true },
  });

  return res?._sum?.amount === null || res?._sum?.amount === undefined ? 0 : Number(res._sum.amount);
}

async function sumAiCreditsUsedTodayCents(): Promise<number> {
  const todayStart = new Date(startOfTodayISO());
  const res = await prisma.ai_usage_logs.aggregate(
    withPrismaTenantIsolationOverride(
      {
        where: { status: 'success', created_at: { gte: todayStart } },
        _sum: { charged_cents: true },
      },
      {
        suppressReporting: true,
        reason: 'admin_godview_sum_ai_usage_today_global',
        source: 'admin-godview-kpis',
        mode: 'global_admin',
        isSuperAdmin: true,
        organizationId: 'super-admin-override',
      }
    )
  );

  return res?._sum?.charged_cents === null || res?._sum?.charged_cents === undefined ? 0 : Number(res._sum.charged_cents);
}

async function getRecentOrganizationsWithPrimaryClientId(): Promise<AdminGodViewRecentOrganization[]> {
  const orgs = await prisma.organization.findMany({
    select: { id: true, name: true, slug: true, created_at: true, subscription_status: true },
    orderBy: { created_at: 'desc' },
    take: 5,
  });

  if (!Array.isArray(orgs) || orgs.length === 0) return [];

  const orgIds = orgs.map((o) => String(o.id)).filter(Boolean);

  const primaryClientRows = orgIds.length
    ? await prisma.clientClient.findMany({
        where: { organizationId: { in: orgIds } },
        select: { id: true, organizationId: true, createdAt: true },
        orderBy: [{ organizationId: 'asc' }, { createdAt: 'asc' }],
        distinct: ['organizationId'],
      })
    : [];

  const primaryClientByOrgId = new Map<string, string>();
  for (const row of Array.isArray(primaryClientRows) ? primaryClientRows : []) {
    const orgId = row?.organizationId ? String(row.organizationId) : '';
    const clientId = row?.id ? String(row.id) : '';
    if (!orgId || !clientId) continue;
    primaryClientByOrgId.set(orgId, clientId);
  }

  return orgs.map((o) => {
    const id = String(o.id);
    return {
      id,
      name: String(o.name || ''),
      slug: o.slug ? String(o.slug) : null,
      createdAt: o.created_at ? new Date(o.created_at).toISOString() : null,
      subscriptionStatus: o.subscription_status ? String(o.subscription_status) : null,
      primaryClientId: primaryClientByOrgId.get(id) || null,
    };
  });
}

async function getSystemAlerts(): Promise<AdminGodViewAlert[]> {
  return await withTenantIsolationContext(
    { suppressReporting: true, reason: 'admin_godview_alerts_load', source: 'admin-godview-alerts' },
    async () => {
      const alerts: AdminGodViewAlert[] = [];

      try {
        const monthStart = new Date(startOfMonthISO());

        const activeOrgs = await prisma.organization.findMany(
          withPrismaTenantIsolationOverride(
            {
              where: { subscription_status: { in: ['active', 'trial'] } },
              select: { id: true, name: true, slug: true, ai_credits_balance_cents: true },
              take: 30,
            },
            { suppressReporting: true, reason: 'admin_godview_alerts_list_orgs_ai_credits', source: 'admin-godview-alerts', mode: 'global_admin', isSuperAdmin: true }
          )
        );

        const orgRows = Array.isArray(activeOrgs) ? activeOrgs : [];
        const orgIds = orgRows.map((r) => String(r.id)).filter(Boolean);

        const usageByOrg = orgIds.length
          ? await prisma.ai_usage_logs.groupBy({
              by: ['organization_id'],
              where: {
                organization_id: { in: orgIds },
                status: 'success',
                created_at: { gte: monthStart },
              },
              _sum: { charged_cents: true },
            })
          : [];

        const usedCentsByOrgId = new Map<string, number>();
        for (const row of Array.isArray(usageByOrg) ? usageByOrg : []) {
          const orgId = row?.organization_id ? String(row.organization_id) : '';
          const used = row?._sum?.charged_cents === null || row?._sum?.charged_cents === undefined ? 0 : Number(row._sum.charged_cents);
          if (orgId) usedCentsByOrgId.set(orgId, used);
        }

        for (const org of orgRows) {
          const orgId = String(org.id);
          const balance = Number(org.ai_credits_balance_cents ?? 0);
          const used = usedCentsByOrgId.get(orgId) ?? 0;

          if (balance <= 0 && used > 0) {
            alerts.push({
              type: 'ai_quota_exceeded',
              title: `קרדיטי AI אזלו${org.name ? ` - ${org.name}` : ''}`,
              details: `נוצלו ${Math.round(used / 100).toLocaleString('he-IL')}₪ החודש. יתרה: ${Math.round(balance / 100).toLocaleString('he-IL')}₪`,
              organizationId: orgId,
              organizationSlug: org.slug ? String(org.slug) : null,
            });
          }

          if (alerts.length >= 10) break;
        }
      } catch {
        // Best-effort only
      }

      try {
        const overdueOrgs = await prisma.clientClient.findMany({
          where: {
            metadata: {
              path: ['paymentStatus'],
              equals: 'overdue',
            } satisfies Prisma.JsonFilter,
          },
          select: { organizationId: true },
          distinct: ['organizationId'],
          take: 20,
        });

        const orgIds = (Array.isArray(overdueOrgs) ? overdueOrgs : [])
          .map((r) => (r?.organizationId ? String(r.organizationId) : null))
          .filter((v): v is string => Boolean(v));

        if (orgIds.length) {
          const orgs = await prisma.organization.findMany({
            where: { id: { in: orgIds } },
            select: { id: true, name: true, slug: true },
          });

          for (const o of Array.isArray(orgs) ? orgs : []) {
            alerts.push({
              type: 'payment_overdue',
              title: `תשלום באיחור - ${String(o.name || '')}`,
              details: 'לפי סטטוס תשלום בנתוני הלקוח (paymentStatus=overdue)',
              organizationId: String(o.id),
              organizationSlug: o.slug ? String(o.slug) : null,
            });
            if (alerts.length >= 15) break;
          }
        }
      } catch {
        // Best-effort only
      }

      return alerts;
    }
  );
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
  return await withTenantIsolationContext(
    { suppressReporting: true, reason: 'admin_godview_kpis_load', source: 'admin-godview-kpis' },
    async () => {
      try {
        const authCheck = await requireAuth();
        if (!authCheck.success) {
          return { success: false, error: authCheck.error || 'נדרשת התחברות' };
        }

        await requireSuperAdmin();

        const [totalOrganizations, totalProfiles, revenuePaidThisMonth, aiCreditsUsedTodayCents, recentOrganizations, alerts] =
          await Promise.all([
            prisma.organization.count(),
            prisma.profile.count(
              withPrismaTenantIsolationOverride(
                {},
                {
                  suppressReporting: true,
                  reason: 'admin_godview_count_profiles_global',
                  source: 'admin-godview-kpis',
                  mode: 'global_admin',
                  isSuperAdmin: true,
                  organizationId: 'super-admin-override',
                }
              )
            ),
            sumPaidInvoicesThisMonth(),
            sumAiCreditsUsedTodayCents(),
            getRecentOrganizationsWithPrimaryClientId(),
            getSystemAlerts(),
          ]);

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
  );
}
