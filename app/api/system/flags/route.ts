import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getAuthenticatedUser, requireSuperAdmin } from '../../../../lib/auth';
import prisma from '@/lib/prisma';
import { withTenantIsolationContext } from '@/lib/prisma-tenant-guard';
import { getWorkspaceByOrgKeyOrThrow } from '@/lib/server/api-workspace';
import { getErrorMessage } from '@/lib/server/workspace-access/utils';
import { logAuditEvent } from '@/lib/audit';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

const IS_PROD = process.env.NODE_ENV === 'production';

function getOrgKeyFromHeader(request: NextRequest): string | null {
  const orgKey = request.headers.get('x-org-id') || request.headers.get('x-orgid');
  return orgKey ? String(orgKey) : null;
}

/**
 * GET /api/system/flags
 * Get system flags for current tenant
 */
async function GETHandler(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Try to get authenticated user, but don't fail if it doesn't work
        // This allows the API to work even if user is not fully synced
        let _user;
        try {
            _user = await getAuthenticatedUser();
        } catch (authError: unknown) {
            // In development, allow access without full user sync
            if (process.env.NODE_ENV === 'development') {
                console.warn('[API] Could not get authenticated user, using defaults:', getErrorMessage(authError));
                _user = {
                    id: userId,
                    email: null,
                    firstName: null,
                    lastName: null,
                    imageUrl: null,
                    role: 'עובד',
                    isSuperAdmin: false
                };
            } else {
                // In production, return 401 if auth fails
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }
        }
        
        // Note: All authenticated users can READ system flags (needed for ScreenGuard)
        // But only admins can UPDATE them (in PATCH method below)

        const searchParams = request.nextUrl.searchParams;
        const headerOrgKey = getOrgKeyFromHeader(request);

        if (searchParams.get('organizationId') || searchParams.get('tenantId')) {
            return NextResponse.json({ error: 'Missing workspace context' }, { status: 400 });
        }

        const primaryOrgKey = headerOrgKey;
        if (!primaryOrgKey) {
            return NextResponse.json({ error: 'Missing workspace context' }, { status: 400 });
        }

        const { workspace: workspacePrimary } = await getWorkspaceByOrgKeyOrThrow(String(primaryOrgKey));

        // Default flags if no tenant or no settings found
        const defaultFlags: Record<string, 'active' | 'maintenance' | 'hidden'> = {
            dashboard: 'active',
            tasks: 'active',
            calendar: 'active',
            clients: 'active',
            operations: 'active',
            team: 'active',
            reports: 'active',
            assets: 'active',
            trash: 'active',
            brain: 'active'
        };

        const orgId = String(workspacePrimary.id);
        return await withTenantIsolationContext(
            {
                source: 'api_system_flags',
                reason: 'GET',
                organizationId: orgId,
            },
            async () => {
                const settings = await prisma.system_settings.findFirst({
                    where: { tenant_id: orgId },
                    select: { system_flags: true },
                });

                if (settings?.system_flags) {
                    // Merge defaults with saved flags
                    const savedFlags = settings.system_flags as Record<string, 'active' | 'maintenance' | 'hidden'>;
                    return NextResponse.json({
                        systemFlags: { ...defaultFlags, ...savedFlags }
                    });
                }

                // Return defaults if no settings found
                return NextResponse.json({ systemFlags: defaultFlags });
            }
        );
    } catch (error: unknown) {
        if (IS_PROD) console.error('[API] Error fetching system flags');
        else console.error('[API] Error fetching system flags:', error);
        return NextResponse.json(
            { error: 'שגיאה בטעינת הגדרות מערכת' },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/system/flags
 * Update system flag for a screen
 */
async function PATCHHandler(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        try {
            await requireSuperAdmin();
        } catch (e: unknown) {
            const safeMsg = 'Forbidden - Super Admin required';
            return NextResponse.json(
                { error: IS_PROD ? safeMsg : getErrorMessage(e) || safeMsg },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { screenId, status, organizationId: _providedOrganizationId, tenantId: _providedTenantId } = body;

        if (!screenId || !status) {
            return NextResponse.json(
                { error: 'Missing required fields: screenId, status' },
                { status: 400 }
            );
        }

        if (!['active', 'maintenance', 'hidden'].includes(status)) {
            return NextResponse.json(
                { error: 'Invalid status. Must be: active, maintenance, or hidden' },
                { status: 400 }
            );
        }

        const headerOrgKey = getOrgKeyFromHeader(request);

        if (_providedOrganizationId != null || _providedTenantId != null) {
            return NextResponse.json(
                { error: 'Missing workspace context' },
                { status: 400 }
            );
        }

        const primaryOrgKey = headerOrgKey;
        if (!primaryOrgKey) {
            return NextResponse.json({ error: 'Missing workspace context' }, { status: 400 });
        }

        const { workspace: workspacePrimary } = await getWorkspaceByOrgKeyOrThrow(String(primaryOrgKey));

        const orgId = String(workspacePrimary.id);
        return await withTenantIsolationContext(
            {
                source: 'api_system_flags',
                reason: 'PATCH',
                organizationId: orgId,
            },
            async () => {
                const existingSettings = await prisma.system_settings.findFirst({
                    where: { tenant_id: orgId },
                    select: { system_flags: true },
                });

                const currentFlags = (existingSettings?.system_flags || {}) as Record<string, 'active' | 'maintenance' | 'hidden'>;
                const updatedFlags = { ...currentFlags, [screenId]: status };

                await prisma.system_settings.upsert({
                    where: { tenant_id: orgId },
                    create: {
                        tenant_id: orgId,
                        system_flags: updatedFlags,
                    },
                    update: {
                        // Prisma Tenant Guard requires tenant key in update payload for upsert.
                        tenant_id: orgId,
                        system_flags: updatedFlags,
                        updated_at: new Date(),
                    },
                });

                await logAuditEvent('data.write', 'system.flags', {
                    resourceId: String(screenId),
                    details: {
                        screenId,
                        status,
                        tenantId: orgId,
                    },
                });

                return NextResponse.json({
                    success: true,
                    message: `מסך ${screenId} עודכן ל-${status === 'maintenance' ? 'תחזוקה' : status === 'hidden' ? 'מוסתר' : 'פעיל'}`,
                    screenId,
                    status,
                    systemFlags: updatedFlags
                });
            }
        );
    } catch (error: unknown) {
        if (IS_PROD) console.error('[API] Error updating system flag');
        else console.error('[API] Error updating system flag:', error);
        return NextResponse.json(
            { error: 'שגיאה בעדכון הגדרות מערכת' },
            { status: 500 }
        );
    }
}

export const GET = shabbatGuard(GETHandler);

export const PATCH = shabbatGuard(PATCHHandler);
