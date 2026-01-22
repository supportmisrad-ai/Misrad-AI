'use server';

import { createClient } from '@/lib/supabase';
import { createErrorResponse, createSuccessResponse, requireAuth } from '@/lib/errorHandler';
import { getAuthenticatedUser } from '@/lib/auth';
import { getBaseUrl } from '@/lib/utils';
import { sendOrganizationWelcomeEmail } from '@/lib/email';
import { getPackageModules } from '@/lib/server/workspace';
import type { PackageType } from '@/lib/server/workspace';
import { syncOrganizationAccessFromBilling } from '@/lib/billing/sync';

function isMissingRelationError(error: any): boolean {
  const message = String(error?.message || '').toLowerCase();
  const code = String((error as any)?.code || '').toLowerCase();
  return code === '42p01' || message.includes('does not exist') || message.includes('relation') || message.includes('table');
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

    const supabase = createClient();

    let order: any = null;
    const withSeats = await supabase
      .from('subscription_orders')
      .select('id, organization_id, package_type, plan_key, billing_cycle, amount, currency, status, customer_email, customer_name, seats')
      .eq('id', orderId)
      .single();

    if (withSeats.error?.message && String(withSeats.error.message).toLowerCase().includes('column') && String(withSeats.error.message).toLowerCase().includes('seats')) {
      const withoutSeats = await supabase
        .from('subscription_orders')
        .select('id, organization_id, package_type, plan_key, billing_cycle, amount, currency, status, customer_email, customer_name')
        .eq('id', orderId)
        .single();
      if (withoutSeats.error) return createErrorResponse(withoutSeats.error, 'שגיאה בטעינת הזמנה');
      order = withoutSeats.data;
    } else {
      if (withSeats.error) return createErrorResponse(withSeats.error, 'שגיאה בטעינת הזמנה');
      order = withSeats.data;
    }

    const organizationId = order?.organization_id ? String(order.organization_id) : '';
    const packageType = order?.package_type ? (String(order.package_type) as PackageType) : null;

    if (!organizationId) return createErrorResponse(null, 'להזמנה אין organization_id');
    if (!packageType) return createErrorResponse(null, 'להזמנה אין package_type');

    const now = new Date().toISOString();

    const { error: orderUpdateError } = await supabase
      .from('subscription_orders')
      .update({ status: 'paid', updated_at: now })
      .eq('id', orderId);

    if (orderUpdateError) return createErrorResponse(orderUpdateError, 'שגיאה בעדכון סטטוס הזמנה');

    const flags = buildOrgFlagsFromPackageType(packageType);

    const seatsRaw = (order as any)?.seats;
    const seatsNormalized = Number.isFinite(Number(seatsRaw)) ? Math.floor(Number(seatsRaw)) : null;
    const seatsAllowed = seatsNormalized && seatsNormalized > 0 ? seatsNormalized : null;

    const orgUpdatePayload: any = {
      ...flags,
      subscription_status: 'active',
      subscription_plan: packageType,
      subscription_start_date: now,
      updated_at: now,
    };
    if (seatsAllowed) {
      orgUpdatePayload.seats_allowed = seatsAllowed;
    }

    const orgUpdateAttempt = await supabase
      .from('organizations')
      .update(orgUpdatePayload)
      .eq('id', organizationId);

    if (orgUpdateAttempt.error?.message) {
      const msg = String(orgUpdateAttempt.error.message).toLowerCase();
      if (msg.includes('column') && msg.includes('seats_allowed')) {
        delete orgUpdatePayload.seats_allowed;
        const retry = await supabase
          .from('organizations')
          .update(orgUpdatePayload)
          .eq('id', organizationId);
        if (retry.error) return createErrorResponse(retry.error, 'שגיאה בעדכון הרשאות הארגון');
      } else {
        return createErrorResponse(orgUpdateAttempt.error, 'שגיאה בעדכון הרשאות הארגון');
      }
    } else if (orgUpdateAttempt.error) {
      return createErrorResponse(orgUpdateAttempt.error, 'שגיאה בעדכון הרשאות הארגון');
    }

    try {
      const periodStart = new Date(now);
      const periodEnd = order?.billing_cycle === 'yearly' ? addYears(periodStart, 1) : addMonths(periodStart, 1);

      const { data: existingSub } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('organization_id', organizationId)
        .in('status', ['trialing', 'active', 'past_due'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const subscriptionId = existingSub?.id ? String(existingSub.id) : null;
      let subId = subscriptionId;

      if (!subId) {
        const created = await supabase
          .from('subscriptions')
          .insert({
            organization_id: organizationId,
            status: 'active',
            billing_cycle: order?.billing_cycle === 'yearly' ? 'yearly' : 'monthly',
            current_period_start: periodStart.toISOString(),
            current_period_end: periodEnd.toISOString(),
            created_at: now,
            updated_at: now,
            metadata: {
              source: 'subscription_orders',
              order_id: orderId,
            },
          } as any)
          .select('id')
          .single();

        if (created.error) throw created.error;
        subId = String(created.data.id);
      } else {
        await supabase
          .from('subscriptions')
          .update({
            status: 'active',
            billing_cycle: order?.billing_cycle === 'yearly' ? 'yearly' : 'monthly',
            current_period_start: periodStart.toISOString(),
            current_period_end: periodEnd.toISOString(),
            updated_at: now,
          } as any)
          .eq('id', subId);
      }

      const modules =
        packageType === 'solo'
          ? ((order as any)?.plan_key ? [String((order as any).plan_key)] : [])
          : getPackageModules(packageType);

      for (const m of modules) {
        await supabase
          .from('subscription_items')
          .upsert(
            {
              subscription_id: subId,
              organization_id: organizationId,
              kind: 'module',
              module_key: m,
              quantity: 1,
              status: 'active',
              start_at: periodStart.toISOString(),
              end_at: null,
              created_at: now,
              updated_at: now,
            } as any,
            { onConflict: 'subscription_id,kind,module_key' }
          );
      }

      if (seatsAllowed) {
        await supabase
          .from('subscription_items')
          .upsert(
            {
              subscription_id: subId,
              organization_id: organizationId,
              kind: 'seats',
              module_key: null,
              quantity: seatsAllowed,
              status: 'active',
              start_at: periodStart.toISOString(),
              end_at: null,
              created_at: now,
              updated_at: now,
              metadata: { source: 'subscription_orders', order_id: orderId },
            } as any,
            { onConflict: 'subscription_id,kind' }
          );
      }

      await supabase
        .from('charges')
        .insert({
          organization_id: organizationId,
          subscription_id: subId,
          provider: 'manual',
          status: 'succeeded',
          amount: Number(order?.amount || 0),
          currency: String(order?.currency || 'ILS'),
          external_id: orderId,
          created_at: now,
          updated_at: now,
          metadata: {
            source: 'subscription_orders',
            order_id: orderId,
          },
        } as any);

      await supabase
        .from('billing_events')
        .insert({
          organization_id: organizationId,
          subscription_id: subId,
          event_type: 'subscription_order_paid',
          occurred_at: now,
          actor_clerk_user_id: actorClerkUserId,
          payload: {
            order_id: orderId,
            package_type: packageType,
            seats_allowed: seatsAllowed,
          },
          created_at: now,
        } as any);

      await syncOrganizationAccessFromBilling({
        organizationId,
        actorClerkUserId,
      });
    } catch (e: any) {
      if (!isMissingRelationError(e)) {
        console.error('[adminMarkSubscriptionOrderPaid] billing layer write failed (ignored)', e);
      }
    }

    // Best-effort: send welcome email
    try {
      const { data: org } = await supabase
        .from('organizations')
        .select('name, slug')
        .eq('id', organizationId)
        .maybeSingle();

      const ownerEmail = order?.customer_email ? String(order.customer_email) : null;
      if (ownerEmail) {
        const baseUrl = getBaseUrl();
        const portalKey = org?.slug || organizationId;
        const portalUrl = `${baseUrl}/w/${encodeURIComponent(String(portalKey))}/lobby`;
        await sendOrganizationWelcomeEmail({
          ownerEmail,
          organizationName: org?.name ? String(org.name) : 'Scale CRM',
          ownerName: order?.customer_name ? String(order.customer_name) : null,
          portalUrl,
        });
      }
    } catch (e) {
      console.error('[adminMarkSubscriptionOrderPaid] welcome email failed (ignored)', e);
    }

    // Best-effort: audit log
    try {
      if (actorClerkUserId) {
        await supabase.from('activity_logs').insert({
          user_id: actorClerkUserId,
          action: `Subscription order marked as paid: ${orderId}`,
          created_at: now,
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
