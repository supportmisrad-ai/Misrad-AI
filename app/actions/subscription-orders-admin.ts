'use server';

import { createClient } from '@/lib/supabase';
import { createErrorResponse, createSuccessResponse, requireAuth } from '@/lib/errorHandler';
import { getAuthenticatedUser } from '@/lib/auth';
import { getBaseUrl } from '@/lib/utils';
import { sendOrganizationWelcomeEmail } from '@/lib/email';
import { getPackageModules } from '@/lib/server/workspace';
import type { PackageType } from '@/lib/server/workspace';

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
} {
  const allowed = new Set(getPackageModules(packageType));
  return {
    has_nexus: allowed.has('nexus'),
    has_system: allowed.has('system'),
    has_social: allowed.has('social'),
    has_finance: allowed.has('finance'),
    has_client: allowed.has('client'),
  };
}

export async function adminMarkSubscriptionOrderPaid(input: {
  orderId: string;
}): Promise<{ success: boolean; data?: true; error?: string }> {
  try {
    const guard = await requireSuperAdmin();
    if (!guard.success) return guard;

    const orderId = String(input.orderId || '').trim();
    if (!orderId) return createErrorResponse(null, 'orderId חסר');

    const supabase = createClient();

    let order: any = null;
    const withSeats = await supabase
      .from('subscription_orders')
      .select('id, organization_id, package_type, customer_email, customer_name, seats')
      .eq('id', orderId)
      .single();

    if (withSeats.error?.message && String(withSeats.error.message).toLowerCase().includes('column') && String(withSeats.error.message).toLowerCase().includes('seats')) {
      const withoutSeats = await supabase
        .from('subscription_orders')
        .select('id, organization_id, package_type, customer_email, customer_name')
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
      const authCheck = await requireAuth();
      if (authCheck.success) {
        await supabase.from('activity_logs').insert({
          user_id: authCheck.userId,
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
