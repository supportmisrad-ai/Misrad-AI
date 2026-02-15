import { asObject, getErrorMessage } from '@/lib/shared/unknown';
/**
 * API Route: Send Tenant Invitation Email
 * POST /api/admin/tenants/[id]/send-invitation
 * 
 * Sends an invitation email to the tenant owner with a link to register
 */

import { NextRequest } from 'next/server';
import { getAuthenticatedUser, requireSuperAdmin } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { sendTenantInvitationEmail } from '@/lib/email';
import { getBaseUrl } from '@/lib/utils';
import { apiError, apiSuccessCompat } from '@/lib/server/api-response';
import { Prisma } from '@prisma/client';
import { withTenantIsolationContext } from '@/lib/prisma-tenant-guard';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

const IS_PROD = process.env.NODE_ENV === 'production';

function getNullableString(obj: Record<string, unknown>, key: string): string | null {
    const v = obj[key];
    if (v == null) return null;
    return typeof v === 'string' ? v : String(v);
}

async function POSTHandler(request: NextRequest, { params }: { params: { id: string } }) {
    return await withTenantIsolationContext(
        {
            source: 'api/admin/tenants/[id]/send-invitation.POST',
            reason: 'admin_send_tenant_invitation',
            mode: 'global_admin',
            isSuperAdmin: true,
            suppressReporting: true,
        },
        async () => {
            try {
                await requireSuperAdmin();
                const user = await getAuthenticatedUser();

                const { id: tenantId } = params;
                if (!tenantId) {
                    return apiError('Tenant ID is required', { status: 400 });
                }

                const tenant = await prisma.nexusTenant.findUnique({
                    where: { id: String(tenantId) },
                    select: { id: true, name: true, ownerEmail: true, subdomain: true },
                });

                if (!tenant) {
                    return apiError('Tenant לא נמצא', { status: 404 });
                }

                const ownerEmail = tenant.ownerEmail ? String(tenant.ownerEmail) : null;

                if (!ownerEmail) {
                    return apiError('Tenant אין אימייל בעלים', { status: 400 });
                }

                const baseUrl = getBaseUrl(request);
                const signupUrl = `${baseUrl}/login?mode=sign-up&email=${encodeURIComponent(ownerEmail)}&tenant=${encodeURIComponent(tenantId)}&invited=true`;

                const tenantName = tenant.name ? String(tenant.name) : 'Tenant';
                const subdomain = tenant.subdomain ? String(tenant.subdomain) : null;

                const emailResult = await sendTenantInvitationEmail(ownerEmail, tenantName, signupUrl, {
                    ownerName: null,
                    subdomain: subdomain ?? undefined,
                });

                if (!emailResult.success) {
                    if (IS_PROD) console.error('[Tenant Invitation] Failed to send email');
                    else console.error('[Tenant Invitation] Failed to send email:', emailResult.error);
                } else {
                    if (!IS_PROD) {
                        console.log('[Tenant Invitation] Email sent successfully:', {
                            tenantId,
                            sentByUserId: user.id,
                        });
                    }
                }

                return apiSuccessCompat({
                    message: 'הזמנה נשלחה בהצלחה',
                    signupUrl,
                    tenant: {
                        id: tenant.id ? String(tenant.id) : tenantId,
                        name: tenantName,
                        ownerEmail,
                    },
                });
            } catch (error: unknown) {
                const msg = getErrorMessage(error);
                if (IS_PROD) console.error('[API] Error sending tenant invitation');
                else console.error('[API] Error sending tenant invitation:', { message: msg });
                const safeMsg = 'שגיאה בשליחת הזמנה';
                return apiError(IS_PROD ? safeMsg : error, {
                    status: msg.includes('Forbidden') ? 403 : 500,
                    message: IS_PROD ? safeMsg : msg || safeMsg,
                });
            }
        }
    );
}

export const POST = shabbatGuard(POSTHandler);
