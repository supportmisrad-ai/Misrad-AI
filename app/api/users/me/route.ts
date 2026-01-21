/**
 * Get current authenticated user from database by Clerk email
 * 
 * This endpoint matches the Clerk user's email with a user in the users table
 */

import { NextRequest, NextResponse } from 'next/server';
import { isTenantAdmin, getOwnedTenant } from '../../../../lib/auth';
import { resolveWorkspaceCurrentUserForApi } from '@/lib/server/workspaceUser';
import { createClient } from '@/lib/supabase';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
async function GETHandler(request: NextRequest) {
    try {
        const orgHeader = request.headers.get('x-org-id');
        if (!orgHeader) {
            return NextResponse.json(
                { error: 'Missing organization context (x-org-id)' },
                { status: 400 }
            );
        }

        const resolved = await resolveWorkspaceCurrentUserForApi(orgHeader);

        const normalizeJson = (value: any) => {
            if (!value || typeof value !== 'object') return {};
            if (Array.isArray(value)) return {};
            return value;
        };

        let profileRow: any = null;
        try {
            const supabase = createClient();
            const profileRes = await supabase
                .from('profiles')
                .select('*')
                .eq('organization_id', resolved.workspace.id)
                .eq('clerk_user_id', resolved.clerkUser.id)
                .maybeSingle();

            if (!profileRes.error) {
                profileRow = profileRes.data;
            }
        } catch {
            // ignore
        }

        const nexusUser: any = resolved.user;
        const canonicalUser = {
            id: String(nexusUser?.id ?? ''),
            name: String(profileRow?.full_name ?? nexusUser?.name ?? ''),
            role: String(profileRow?.role ?? nexusUser?.role ?? resolved.clerkUser.role ?? 'עובד'),
            department: typeof nexusUser?.department === 'string' ? nexusUser.department : undefined,
            avatar: String(profileRow?.avatar_url ?? nexusUser?.avatar ?? ''),
            online: Boolean(nexusUser?.online ?? true),
            capacity: Number(nexusUser?.capacity ?? 0),
            email: String(profileRow?.email ?? nexusUser?.email ?? resolved.clerkUser.email ?? ''),
            phone: typeof profileRow?.phone === 'string' ? profileRow.phone : undefined,
            location: typeof profileRow?.location === 'string' ? profileRow.location : undefined,
            bio: typeof profileRow?.bio === 'string' ? profileRow.bio : undefined,
            notificationPreferences: normalizeJson(profileRow?.notification_preferences ?? nexusUser?.notificationPreferences),
            uiPreferences: normalizeJson(profileRow?.ui_preferences ?? nexusUser?.uiPreferences),
            twoFactorEnabled: Boolean(profileRow?.two_factor_enabled ?? nexusUser?.twoFactorEnabled ?? false),
            isSuperAdmin: Boolean(
                (nexusUser as any)?.is_super_admin ??
                    (nexusUser as any)?.isSuperAdmin ??
                    resolved.clerkUser.isSuperAdmin
            ),
            isTenantAdmin: Boolean((nexusUser as any)?.isTenantAdmin ?? false),
            tenantId: resolved.workspace.id,
            billingInfo: normalizeJson(profileRow?.billing_info ?? nexusUser?.billingInfo),
        };

        const tenant = await getOwnedTenant();
        const tenantAdminStatus = await isTenantAdmin(tenant?.id);

        return NextResponse.json({
            user: canonicalUser,
            clerkUser: resolved.clerkUser,
            tenant: tenant
                ? {
                    id: tenant.id,
                    name: tenant.name,
                    ownerEmail: tenant.ownerEmail,
                }
                : null,
            isTenantAdmin: tenantAdminStatus,
            matched: true,
        });

    } catch (error: any) {
        console.error('[API] Error in /api/users/me:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}


export const GET = shabbatGuard(GETHandler);
