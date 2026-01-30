'use server';

import { createErrorResponse, createSuccessResponse, requireAuth } from '@/lib/errorHandler';
import { getAuthenticatedUser } from '@/lib/auth';
import { getBaseUrl } from '@/lib/utils';
import { sendFirstCustomerEmail, sendOrganizationWelcomeEmail } from '@/lib/email';
import { getPackageModules } from '@/lib/server/workspace';
import type { PackageType } from '@/lib/server/workspace';
import { syncOrganizationAccessFromBilling } from '@/lib/billing/sync';
import prisma from '@/lib/prisma';

function asObject(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object') {
    return value as Record<string, unknown>;
  }
  return null;
}

function getUnknownErrorMessage(error: unknown): string | null {
  if (!error) return null;
  if (error instanceof Error) return error.message;
  const obj = asObject(error);
  const msg = obj?.message;
  return typeof msg === 'string' ? msg : null;
}

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
  return {
    has_nexus: allowed.has('nexus'),
    has_system: allowed.has('system'),
    has_social: allowed.has('social'),
    has_finance: allowed.has('finance'),
    has_client: allowed.has('client'),
    has_operations: allowed.has('operations'),
  };
}

export async function adminMarkSubscriptionOrderPaid(input: {
  orderId: string;
}): Promise<{ success: boolean; data?: true; error?: string }> {
  try {
    const guard = await requireSuperAdmin();
    if (!guard.success) return guard;

    const authCheck = await requireAuth();
    const actorClerkUserId = authCheck.success ? authCheck.userId : null;

    const orderId = String(input.orderId || '').trim();
    if (!orderId) return createErrorResponse(null, 'orderId חסר');

    let order: any = null;
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

    if (!order?.id) return createErrorResponse(null, 'שגיאה בטעינת הזמנה');

    const orderObj = asObject(order) ?? {};

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
    } catch (orderUpdateError) {
      return createErrorResponse(orderUpdateError, 'שגיאה בעדכון סטטוס הזמנה');
    }

    const flags = buildOrgFlagsFromPackageType(packageType);

    const seatsRaw = orderObj.seats;
    const seatsNormalized = Number.isFinite(Number(seatsRaw)) ? Math.floor(Number(seatsRaw)) : null;
    const seatsAllowed = seatsNormalized && seatsNormalized > 0 ? seatsNormalized : null;

    const orgUpdatePayload: Record<string, unknown> = {
      ...flags,
      subscription_status: 'active',
      subscription_plan: packageType,
      subscription_start_date: now,
      updated_at: now,
    };
    if (seatsAllowed) {
      orgUpdatePayload.seats_allowed = seatsAllowed;
    }

    try {
      await prisma.social_organizations.updateMany({
        where: { id: organizationId },
        data: orgUpdatePayload as any,
      });
    } catch (orgUpdateError: unknown) {
      if (seatsAllowed && isMissingColumnError(orgUpdateError, 'seats_allowed')) {
        try {
          delete (orgUpdatePayload as any).seats_allowed;
          await prisma.social_organizations.updateMany({
            where: { id: organizationId },
            data: orgUpdatePayload as any,
          });
        } catch (retryError) {
          return createErrorResponse(retryError, 'שגיאה בעדכון הרשאות הארגון');
        }
      } else {
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
            metadata: { source: 'subscription_orders', order_id: orderId } as any,
          } as any,
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
          } as any,
        });
      }

      const modules =
        packageType === 'solo'
          ? (orderObj.plan_key ? [String(orderObj.plan_key)] : [])
          : getPackageModules(packageType);

      for (const m of modules) {
        await prisma.subscription_items.deleteMany({
          where: { subscription_id: subId, kind: 'module', module_key: String(m) } as any,
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
          } as any,
        });
      }

      if (seatsAllowed) {
        await prisma.subscription_items.deleteMany({
          where: { subscription_id: subId, kind: 'seats' } as any,
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
            metadata: { source: 'subscription_orders', order_id: orderId } as any,
          } as any,
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
          metadata: { source: 'subscription_orders', order_id: orderId } as any,
        } as any,
      });

      await prisma.billing_events.create({
        data: {
          organization_id: organizationId,
          subscription_id: subId,
          event_type: 'subscription_order_paid',
          occurred_at: now,
          actor_clerk_user_id: actorClerkUserId,
          payload: { order_id: orderId, package_type: packageType, seats_allowed: seatsAllowed } as any,
          created_at: now,
        } as any,
      });

      await syncOrganizationAccessFromBilling({
        organizationId,
        actorClerkUserId,
      });
    } catch (e: unknown) {
      if (!isMissingRelationError(e)) {
        console.error('[adminMarkSubscriptionOrderPaid] billing layer write failed (ignored)', e);
      }
    }

    // Best-effort: send welcome email
    try {
      const org = await prisma.social_organizations.findFirst({
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
        } catch (e) {
          console.error('[adminMarkSubscriptionOrderPaid] first customer email failed (ignored)', e);
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
    } catch (e) {
      console.error('[adminMarkSubscriptionOrderPaid] welcome email failed (ignored)', e);
    }

    // Best-effort: audit log
    try {
      if (actorClerkUserId) {
        await prisma.social_sync_logs.create({
          data: {
            user_id: String(actorClerkUserId),
            integration_name: 'admin',
            sync_type: 'subscription_order_mark_paid',
            status: 'success',
            items_synced: 1,
            started_at: new Date(),
            completed_at: new Date(),
            metadata: { orderId } as any,
          },
        });
      }
    } catch {
      // ignore
    }

    return createSuccessResponse(true);
  } catch (e) {
    return createErrorResponse(e, 'שגיאה באישור תשלום');
  }
}
