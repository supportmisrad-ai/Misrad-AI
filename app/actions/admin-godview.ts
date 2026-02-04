'use server';

import prisma from '@/lib/prisma';
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/errorHandler';
import { requireSuperAdmin } from '@/lib/auth';
import { withPrismaTenantIsolationOverride, withTenantIsolationContext } from '@/lib/prisma-tenant-guard';

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
  const res = await prisma.social_invoices.aggregate({
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
  const res = await prisma.ai_usage_logs.aggregate({
    where: { status: 'success', created_at: { gte: todayStart } },
    _sum: { charged_cents: true },
  });

  return res?._sum?.charged_cents === null || res?._sum?.charged_cents === undefined ? 0 : Number(res._sum.charged_cents);
}

async function getRecentOrganizationsWithPrimaryClientId(): Promise<AdminGodViewRecentOrganization[]> {
  const orgs = await prisma.social_organizations.findMany({
    select: { id: true, name: true, slug: true, created_at: true, subscription_status: true },
    orderBy: { created_at: 'desc' },
    take: 5,
  });

  if (!Array.isArray(orgs) || orgs.length === 0) return [];

  const orgIds = orgs.map((o) => String(o.id)).filter(Boolean);

  const clients = await prisma.clientClient.findMany({
    where: { organizationId: { in: orgIds } },
    select: { id: true, organizationId: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
    take: 500,
  });

  const primaryClientByOrgId = new Map<string, string>();
  for (const c of Array.isArray(clients) ? clients : []) {
    const orgId = (c as any)?.organizationId ? String((c as any).organizationId) : '';
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
      createdAt: o.created_at ? new Date(o.created_at as any).toISOString() : null,
      subscriptionStatus: o.subscription_status ? String(o.subscription_status) : null,
      primaryClientId: primaryClientByOrgId.get(id) || null,
    };
  });
}

async function getSystemAlerts(): Promise<AdminGodViewAlert[]> {
  return await withTenantIsolationContext(
    { suppressReporting: true, source: 'admin-godview-alerts' },
    async () => {
      const alerts: AdminGodViewAlert[] = [];

      try {
        const monthStart = new Date(startOfMonthISO());

        const settingsRows = await prisma.organization_settings.findMany(
          withPrismaTenantIsolationOverride(
            {
              where: { ai_quota_cents: { not: null } },
              select: { organization_id: true, ai_quota_cents: true },
              take: 30,
            },
            { suppressReporting: true }
          )
        );

        const orgIds = (Array.isArray(settingsRows) ? settingsRows : [])
          .map((r: any) => (r?.organization_id ? String(r.organization_id) : null))
          .filter(Boolean) as string[];

        const orgsById = new Map<string, { name: string; slug: string | null }>();
        if (orgIds.length) {
          const orgs = await prisma.social_organizations.findMany({
            where: { id: { in: orgIds } },
            select: { id: true, name: true, slug: true },
          });

          for (const o of Array.isArray(orgs) ? orgs : []) {
            const id = String((o as any).id);
            orgsById.set(id, { name: String((o as any).name || ''), slug: (o as any).slug ? String((o as any).slug) : null });
          }
        }

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
          const orgId = (row as any)?.organization_id ? String((row as any).organization_id) : '';
          const used = (row as any)?._sum?.charged_cents === null || (row as any)?._sum?.charged_cents === undefined ? 0 : Number((row as any)._sum.charged_cents);
          if (orgId) usedCentsByOrgId.set(orgId, used);
        }

        for (const row of Array.isArray(settingsRows) ? settingsRows : []) {
          const orgId = row?.organization_id ? String(row.organization_id) : null;
          const quota = row?.ai_quota_cents === null || row?.ai_quota_cents === undefined ? null : Number(row.ai_quota_cents);
          if (!orgId || quota === null) continue;

          const used = usedCentsByOrgId.get(orgId) ?? 0;
          const remaining = quota - used;

          if (remaining <= 0 && used > 0) {
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
        const overdueOrgs = await prisma.clientClient.findMany({
          where: {
            metadata: {
              path: ['paymentStatus'],
              equals: 'overdue',
            } as any,
          },
          select: { organizationId: true },
          distinct: ['organizationId'],
          take: 20,
        });

        const orgIds = (Array.isArray(overdueOrgs) ? overdueOrgs : [])
          .map((r: any) => (r?.organizationId ? String(r.organizationId) : null))
          .filter(Boolean) as string[];

        if (orgIds.length) {
          const orgs = await prisma.social_organizations.findMany({
            where: { id: { in: orgIds } },
            select: { id: true, name: true, slug: true },
          });

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
    { suppressReporting: true, source: 'admin-godview-kpis' },
    async () => {
      try {
        const authCheck = await requireAuth();
        if (!authCheck.success) {
          return authCheck as any;
        }

        await requireSuperAdmin();

        const [totalOrganizations, totalProfiles, revenuePaidThisMonth, aiCreditsUsedTodayCents, recentOrganizations, alerts] =
          await Promise.all([
            prisma.social_organizations.count(),
            prisma.profile.count(
              withPrismaTenantIsolationOverride({}, { suppressReporting: true })
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
