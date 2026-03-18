'use server';


import { createErrorResponse, createSuccessResponse, requireAuth } from '@/lib/errorHandler';
import { getAuthenticatedUser } from '@/lib/auth';
import { getBaseUrl } from '@/lib/utils';
import { sendFirstCustomerEmail, sendOrganizationWelcomeEmail } from '@/lib/email';
import { getPackageModules } from '@/lib/server/workspace';
import type { PackageType } from '@/lib/server/workspace';
import { syncOrganizationAccessFromBilling } from '@/lib/billing/sync';
import { withTenantIsolationContext } from '@/lib/prisma-tenant-guard';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import * as Sentry from '@sentry/nextjs';
import { z } from 'zod';

import { asObjectLoose as asObject, getUnknownErrorMessage } from '@/lib/shared/unknown';
import { reportSchemaFallback } from '@/lib/server/schema-fallbacks';
const ALLOW_SCHEMA_FALLBACKS = String(process.env.IS_E2E_TESTING || '').toLowerCase() === 'true';

type SocialOrganizationsUpdateManyData = Parameters<typeof prisma.organization.updateMany>[0]['data'];
type SubscriptionsCreateData = Parameters<typeof prisma.subscriptions.create>[0]['data'];
type SubscriptionsUpdateData = Parameters<typeof prisma.subscriptions.update>[0]['data'];
type SubscriptionItemsCreateData = Parameters<typeof prisma.subscription_items.create>[0]['data'];
type SubscriptionItemsDeleteManyWhere = Prisma.subscription_itemsDeleteManyArgs['where'];
type ChargesCreateData = Parameters<typeof prisma.charges.create>[0]['data'];
type BillingEventsCreateData = Parameters<typeof prisma.billing_events.create>[0]['data'];
type SocialSyncLogsCreateData = Parameters<typeof prisma.socialMediaSyncLog.create>[0]['data'];


function isMissingRelationError(error: unknown): boolean {
  const errObj = asObject(error) ?? {};
  const message = String((errObj as Record<string, unknown>).message ?? '').toLowerCase();
  const code = String((errObj as Record<string, unknown>).code ?? '').toLowerCase();
  return code === '42p01' || message.includes('does not exist') || message.includes('relation') || message.includes('table');
}

function isMissingColumnError(error: unknown, columnName: string): boolean {
  const errObj = asObject(error) ?? {};
  const message = String((errObj as Record<string, unknown>).message ?? '').toLowerCase();
  const code = String((errObj as Record<string, unknown>).code ?? '').toLowerCase();
  return (
    code === '42703' ||
    (message.includes('column') && message.includes(String(columnName || '').toLowerCase()) && message.includes('does not exist'))
  );
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  const target = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1, d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds(), d.getUTCMilliseconds())
  );
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d.getUTCDate(), lastDay));
  return target;
}

function addYears(date: Date, years: number): Date {
  const d = new Date(date);
  return addMonths(d, years * 12);
}

function toJson(value: unknown): Prisma.InputJsonValue {
  if (value == null) return {};
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return value;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'bigint') return value.toString();
  if (value instanceof Date) return value.toISOString();

  if (Array.isArray(value)) {
    return value.map((v) => toJson(v));
  }

  const obj = asObject(value);
  if (!obj) return {};

  const out: Record<string, Prisma.InputJsonValue> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = toJson(v);
  }
  return out;
}

function captureActionException(error: unknown, context: Record<string, unknown>) {
  Sentry.withScope((scope) => {
    scope.setTag('layer', 'server_action');
    scope.setTag('domain', 'subscription_orders_admin');
    for (const [k, v] of Object.entries(context)) {
      scope.setExtra(k, v);
    }
    Sentry.captureException(error);
  });
}

const AdminMarkOrderPaidSchema = z.object({
  orderId: z.string().min(1),
});

async function requireSuperAdmin(): Promise<{ success: true } | { success: false; error: string }> {
  const authCheck = await requireAuth();
  if (!authCheck.success) {
    return { success: false, error: authCheck.error || 'נדרשת התחברות' };
  }

  const user = await getAuthenticatedUser();
  if (!user?.isSuperAdmin) {
    return { success: false, error: 'אין הרשאה (נדרש Super Admin)' };
  }

  return { success: true };
}

function buildOrgFlagsFromPackageType(packageType: PackageType): {
  has_nexus: boolean;
  has_system: boolean;
  has_social: boolean;
  has_finance: boolean;
  has_client: boolean;
  has_operations: boolean;
} {
  const allowed = new Set(getPackageModules(packageType));
  // Finance is a free bonus for any paid package
  const hasAnyModule = allowed.size > 0;
  return {
    has_nexus: allowed.has('nexus'),
    has_system: allowed.has('system'),
    has_social: allowed.has('social'),
    has_finance: hasAnyModule, // Free bonus
    has_client: allowed.has('client'),
    has_operations: allowed.has('operations'),
  };
}

export async function adminMarkSubscriptionOrderPaid(input: {
  orderId: string;
}): Promise<{ success: boolean; data?: true; error?: string }> {
  try {
    const parsed = AdminMarkOrderPaidSchema.safeParse(input);
    if (!parsed.success) {
      captureActionException(parsed.error, { action: 'adminMarkSubscriptionOrderPaid', stage: 'validate_input' });
      return createErrorResponse(null, 'קלט לא תקין');
    }

    const guard = await requireSuperAdmin();
    if (!guard.success) return guard;

    return await withTenantIsolationContext(
      {
        source: 'app/actions/subscription-orders-admin.adminMarkSubscriptionOrderPaid',
        reason: 'admin_mark_subscription_order_paid',
        mode: 'global_admin',
        isSuperAdmin: true,
      },
      async () => {

        const authCheck = await requireAuth();
        const actorClerkUserId = authCheck.success ? authCheck.userId : null;

        const orderId = String(parsed.data.orderId || '').trim();
        if (!orderId) return createErrorResponse(null, 'orderId חסר');

        let order: unknown = null;
        try {
          order = await prisma.subscription_orders.findFirst({
            where: { id: orderId },
            select: {
              id: true,
              organization_id: true,
              package_type: true,
              plan_key: true,
              billing_cycle: true,
              amount: true,
              currency: true,
              status: true,
              customer_email: true,
              customer_name: true,
              seats: true,
            },
          });
        } catch (error: unknown) {
          if (isMissingColumnError(error, 'seats')) {
            if (!ALLOW_SCHEMA_FALLBACKS) {
              throw new Error(
                `[SchemaMismatch] subscription_orders.seats missing column (${getUnknownErrorMessage(error) || 'missing column'})`
              );
            }

            reportSchemaFallback({
              source: 'app/actions/subscription-orders-admin.adminMarkSubscriptionOrderPaid',
              reason: 'subscription_orders.seats missing column (fallback to query without seats)',
              error,
              extras: { orderId },
            });
            order = await prisma.subscription_orders.findFirst({
              where: { id: orderId },
              select: {
                id: true,
                organization_id: true,
                package_type: true,
                plan_key: true,
                billing_cycle: true,
                amount: true,
                currency: true,
                status: true,
                customer_email: true,
                customer_name: true,
              },
            });
          } else {
            throw error;
          }
        }

    const orderObjRaw = asObject(order);
    if (!orderObjRaw?.id) return createErrorResponse(null, 'שגיאה בטעינת הזמנה');

    const orderObj = orderObjRaw ?? {};

    const organizationId = orderObj.organization_id ? String(orderObj.organization_id) : '';
    const packageType = orderObj.package_type ? (String(orderObj.package_type) as PackageType) : null;

    if (!organizationId) return createErrorResponse(null, 'להזמנה אין organization_id');
    if (!packageType) return createErrorResponse(null, 'להזמנה אין package_type');

    const now = new Date();

    try {
      await prisma.subscription_orders.update({
        where: { id: orderId },
        data: { status: 'paid', updated_at: now },
      });
    } catch (orderUpdateError: unknown) {
      captureActionException(orderUpdateError, { action: 'adminMarkSubscriptionOrderPaid', stage: 'update_order_status', orderId });
      return createErrorResponse(orderUpdateError, 'שגיאה בעדכון סטטוס הזמנה');
    }

    const flags = buildOrgFlagsFromPackageType(packageType);

    const seatsRaw = orderObj.seats;
    const seatsNormalized = Number.isFinite(Number(seatsRaw)) ? Math.floor(Number(seatsRaw)) : null;
    const seatsAllowed = seatsNormalized && seatsNormalized > 0 ? seatsNormalized : null;

    const orgUpdatePayloadBase: SocialOrganizationsUpdateManyData = {
      ...flags,
      subscription_status: 'active',
      subscription_plan: packageType,
      subscription_start_date: now,
      updated_at: now,
      ...(seatsAllowed ? ({ seats_allowed: seatsAllowed } as SocialOrganizationsUpdateManyData) : {}),
    };

    try {
      await prisma.organization.update({
        where: { id: organizationId },
        data: orgUpdatePayloadBase,
      });
    } catch (orgUpdateError: unknown) {
      if (seatsAllowed && isMissingColumnError(orgUpdateError, 'seats_allowed')) {
        if (!ALLOW_SCHEMA_FALLBACKS) {
          throw new Error(`[SchemaMismatch] social_organizations.seats_allowed missing column (${getUnknownErrorMessage(orgUpdateError) || 'missing column'})`);
        }

        reportSchemaFallback({
          source: 'app/actions/subscription-orders-admin.adminMarkSubscriptionOrderPaid',
          reason: 'organization.seats_allowed missing column (retry update without seats_allowed)',
          error: orgUpdateError,
          extras: { organizationId, seatsAllowed },
        });
        try {
          const { seats_allowed: _seatsAllowed, ...withoutSeatsAllowed } = orgUpdatePayloadBase as SocialOrganizationsUpdateManyData & {
            seats_allowed?: unknown;
          };
          await prisma.organization.update({
            where: { id: organizationId },
            data: withoutSeatsAllowed as SocialOrganizationsUpdateManyData,
          });
        } catch (retryError) {
          captureActionException(retryError, { action: 'adminMarkSubscriptionOrderPaid', stage: 'update_org_permissions_retry', organizationId });
          return createErrorResponse(retryError, 'שגיאה בעדכון הרשאות הארגון');
        }
      } else {
        captureActionException(orgUpdateError, { action: 'adminMarkSubscriptionOrderPaid', stage: 'update_org_permissions', organizationId });
        return createErrorResponse(orgUpdateError, 'שגיאה בעדכון הרשאות הארגון');
      }
    }

    try {
      const periodStart = new Date(now);
      const periodEnd = String(orderObj.billing_cycle) === 'yearly' ? addYears(periodStart, 1) : addMonths(periodStart, 1);

      const existingSub = await prisma.subscriptions.findFirst({
        where: {
          organization_id: organizationId,
          status: { in: ['trialing', 'active', 'past_due'] },
        },
        select: { id: true },
        orderBy: { created_at: 'desc' },
      });

      const subscriptionId = existingSub?.id ? String(existingSub.id) : null;
      let subId = subscriptionId;

      if (!subId) {
        const created = await prisma.subscriptions.create({
          data: {
            organization_id: organizationId,
            status: 'active',
            billing_cycle: String(orderObj.billing_cycle) === 'yearly' ? 'yearly' : 'monthly',
            current_period_start: periodStart,
            current_period_end: periodEnd,
            created_at: now,
            updated_at: now,
            metadata: toJson({ source: 'subscription_orders', order_id: orderId }),
          } satisfies SubscriptionsCreateData,
          select: { id: true },
        });
        subId = String(created.id);
      } else {
        await prisma.subscriptions.update({
          where: { id: subId },
          data: {
            status: 'active',
            billing_cycle: String(orderObj.billing_cycle) === 'yearly' ? 'yearly' : 'monthly',
            current_period_start: periodStart,
            current_period_end: periodEnd,
            updated_at: now,
          } satisfies SubscriptionsUpdateData,
        });
      }

      const modules =
        packageType === 'solo'
          ? (orderObj.plan_key ? [String(orderObj.plan_key)] : [])
          : getPackageModules(packageType);

      for (const m of modules) {
        await prisma.subscription_items.deleteMany({
          where: { subscription_id: subId, kind: 'module', module_key: String(m) } satisfies SubscriptionItemsDeleteManyWhere,
        });
        await prisma.subscription_items.create({
          data: {
            subscription_id: subId,
            organization_id: organizationId,
            kind: 'module',
            module_key: String(m),
            quantity: 1,
            status: 'active',
            start_at: periodStart,
            end_at: null,
            created_at: now,
            updated_at: now,
          } satisfies SubscriptionItemsCreateData,
        });
      }

      if (seatsAllowed) {
        await prisma.subscription_items.deleteMany({
          where: { subscription_id: subId, kind: 'seats' } satisfies SubscriptionItemsDeleteManyWhere,
        });
        await prisma.subscription_items.create({
          data: {
            subscription_id: subId,
            organization_id: organizationId,
            kind: 'seats',
            module_key: null,
            quantity: seatsAllowed,
            status: 'active',
            start_at: periodStart,
            end_at: null,
            created_at: now,
            updated_at: now,
            metadata: toJson({ source: 'subscription_orders', order_id: orderId }),
          } satisfies SubscriptionItemsCreateData,
        });
      }

      await prisma.charges.create({
        data: {
          organization_id: organizationId,
          subscription_id: subId,
          provider: 'manual',
          status: 'succeeded',
          amount: Number(orderObj.amount || 0),
          currency: String(orderObj.currency || 'ILS'),
          external_id: orderId,
          created_at: now,
          updated_at: now,
          metadata: toJson({ source: 'subscription_orders', order_id: orderId }),
        } satisfies ChargesCreateData,
      });

      await prisma.billing_events.create({
        data: {
          organization_id: organizationId,
          subscription_id: subId,
          event_type: 'subscription_order_paid',
          occurred_at: now,
          actor_clerk_user_id: actorClerkUserId,
          payload: toJson({ order_id: orderId, package_type: packageType, seats_allowed: seatsAllowed }),
          created_at: now,
        } satisfies BillingEventsCreateData,
      });

      await syncOrganizationAccessFromBilling({
        organizationId,
        actorClerkUserId,
      });
    } catch (e: unknown) {
      if (isMissingRelationError(e)) {
        if (!ALLOW_SCHEMA_FALLBACKS) {
          throw new Error(`[SchemaMismatch] billing layer missing table (${getUnknownErrorMessage(e) || 'missing relation'})`);
        }

        reportSchemaFallback({
          source: 'app/actions/subscription-orders-admin.adminMarkSubscriptionOrderPaid',
          reason: 'billing layer missing table (skip billing writes)',
          error: e,
          extras: { organizationId, orderId },
        });
      } else {
        captureActionException(e, { action: 'adminMarkSubscriptionOrderPaid', stage: 'billing_layer_write', organizationId, orderId });
      }
    }

    // Best-effort: send welcome email
    try {
      const org = await prisma.organization.findFirst({
        where: { id: organizationId },
        select: { name: true, slug: true },
      });

      const ownerEmail = orderObj.customer_email ? String(orderObj.customer_email) : null;
      if (ownerEmail) {
        try {
          await sendFirstCustomerEmail({
            toEmail: ownerEmail,
            ownerName: orderObj.customer_name ? String(orderObj.customer_name) : null,
          });
        } catch (e: unknown) {
          captureActionException(e, { action: 'adminMarkSubscriptionOrderPaid', stage: 'email_first_customer', organizationId, orderId });
        }

        const baseUrl = getBaseUrl();
        const portalKey = org?.slug || organizationId;
        const portalUrl = `${baseUrl}/w/${encodeURIComponent(String(portalKey))}/lobby`;
        await sendOrganizationWelcomeEmail({
          ownerEmail,
          organizationName: org?.name ? String(org.name) : 'Misrad AI',
          ownerName: orderObj.customer_name ? String(orderObj.customer_name) : null,
          portalUrl,
        });
      }
    } catch (e: unknown) {
      captureActionException(e, { action: 'adminMarkSubscriptionOrderPaid', stage: 'email_welcome_outer', organizationId, orderId });
    }

    // Best-effort: audit log
    try {
      if (actorClerkUserId) {
        await prisma.socialMediaSyncLog.create({
          data: {
            user_id: String(actorClerkUserId),
            integration_name: 'admin',
            sync_type: 'subscription_order_mark_paid',
            status: 'success',
            items_synced: 1,
            started_at: new Date(),
            completed_at: new Date(),
            metadata: toJson({ orderId }),
          } satisfies SocialSyncLogsCreateData,
        });
      }
    } catch (e: unknown) {
      captureActionException(e, { action: 'adminMarkSubscriptionOrderPaid', stage: 'audit_log', organizationId, orderId });
    }

        return createSuccessResponse(true);
      }
    );
  } catch (e: unknown) {
    captureActionException(e, { action: 'adminMarkSubscriptionOrderPaid', stage: 'outer' });
    return createErrorResponse(e, 'שגיאה באישור תשלום');
  }
}
