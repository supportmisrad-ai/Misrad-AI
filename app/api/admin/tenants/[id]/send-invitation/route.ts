/**
 * API Route: Send Tenant Invitation Email
 * POST /api/admin/tenants/[id]/send-invitation
 * 
 * Sends an invitation email to the tenant owner with a link to register
 */

import { NextRequest } from 'next/server';
import { getAuthenticatedUser, requireSuperAdmin } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase';
import { sendTenantInvitationEmail } from '@/lib/email';
import { getBaseUrl } from '@/lib/utils';
import { apiError, apiSuccessCompat } from '@/lib/server/api-response';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

function asObject(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object') return null;
    if (Array.isArray(value)) return null;
    return value as Record<string, unknown>;
}

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    const obj = asObject(error);
    const msg = obj?.message;
    return typeof msg === 'string' ? msg : '';
}

function getNullableString(obj: Record<string, unknown>, key: string): string | null {
    const v = obj[key];
    if (v == null) return null;
    return typeof v === 'string' ? v : String(v);
}

async function POSTHandler(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await requireSuperAdmin();
        const user = await getAuthenticatedUser();

        const { id: tenantId } = await params;
        if (!tenantId) {
            return apiError('Tenant ID is required', { status: 400 });
        }

        const supabase = createServiceRoleClient({ allowUnscoped: true, reason: 'tenants_update_metadata' });

        const { data: tenantsRaw, error: getError } = await supabase
            .from('nexus_tenants')
            .select('*')
            .eq('id', tenantId)
            .limit(1);

        if (getError) {
            console.error('[API] Error fetching tenant:', getError);
            return apiError('שגיאה בטעינת Tenant', { status: 500 });
        }

        const tenants = Array.isArray(tenantsRaw) ? (tenantsRaw as unknown[]) : [];
        if (tenants.length === 0) {
            return apiError('Tenant לא נמצא', { status: 404 });
        }

        const tenantObj = asObject(tenants[0]) ?? {};
        const ownerEmail = getNullableString(tenantObj, 'owner_email') || getNullableString(tenantObj, 'ownerEmail');

        if (!ownerEmail) {
            return apiError('Tenant אין אימייל בעלים', { status: 400 });
        }

        const baseUrl = getBaseUrl(request);
        const signupUrl = `${baseUrl}/sign-up?email=${encodeURIComponent(ownerEmail)}&tenant=${encodeURIComponent(tenantId)}&invited=true`;

        const tenantName = getNullableString(tenantObj, 'name') || 'Tenant';
        const subdomain = getNullableString(tenantObj, 'subdomain');

        const emailResult = await sendTenantInvitationEmail(ownerEmail, tenantName, signupUrl, {
            ownerName: null,
            subdomain: subdomain ?? undefined,
        });

        if (!emailResult.success) {
            console.error('[Tenant Invitation] Failed to send email:', emailResult.error);
        } else {
            console.log('[Tenant Invitation] Email sent successfully:', {
                tenantId,
                sentByUserId: user.id,
            });
        }

        try {
            const existingMeta = asObject(tenantObj.metadata) ?? {};
            const metadata = {
                ...existingMeta,
                invitationSent: true,
                invitationSentAt: new Date().toISOString(),
                invitationSentBy: user.id,
            };

            await supabase.from('nexus_tenants').update({ metadata }).eq('id', tenantId);
        } catch (updateError: unknown) {
            console.error('[API] Error updating tenant metadata:', { message: getErrorMessage(updateError) });
        }

        return apiSuccessCompat({
            message: 'הזמנה נשלחה בהצלחה',
            signupUrl,
            tenant: {
                id: getNullableString(tenantObj, 'id') || tenantId,
                name: tenantName,
                ownerEmail,
            },
        });
    } catch (error: unknown) {
        const msg = getErrorMessage(error);
        console.error('[API] Error sending tenant invitation:', { message: msg });
        return apiError(error, { status: msg.includes('Forbidden') ? 403 : 500 });
    }
}

export const POST = shabbatGuard(POSTHandler);
