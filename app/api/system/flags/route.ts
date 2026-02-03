import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getAuthenticatedUser, requireSuperAdmin } from '../../../../lib/auth';
import prisma from '@/lib/prisma';
import { getWorkspaceByOrgKeyOrThrow } from '@/lib/server/api-workspace';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

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
        let user;
        try {
            user = await getAuthenticatedUser();
        } catch (authError: any) {
            // In development, allow access without full user sync
            if (process.env.NODE_ENV === 'development') {
                console.warn('[API] Could not get authenticated user, using defaults:', authError.message);
                user = {
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
        const organizationIdFromQuery = searchParams.get('organizationId');
        const tenantIdFromQuery = searchParams.get('tenantId');
        const headerOrgKey = getOrgKeyFromHeader(request);

        const queryOrgKey = organizationIdFromQuery || tenantIdFromQuery;

        if (!headerOrgKey && queryOrgKey && user?.isSuperAdmin) {
            await requireSuperAdmin();
        }

        if (!headerOrgKey && !queryOrgKey) {
            return NextResponse.json({ error: 'Missing workspace context' }, { status: 400 });
        }

        if (!headerOrgKey && queryOrgKey && !user?.isSuperAdmin) {
            return NextResponse.json({ error: 'Missing workspace context' }, { status: 400 });
        }

        const primaryOrgKey = headerOrgKey || (queryOrgKey ? String(queryOrgKey) : null);
        if (!primaryOrgKey) {
            return NextResponse.json({ error: 'Missing workspace context' }, { status: 400 });
        }

        const { workspace: workspacePrimary } = await getWorkspaceByOrgKeyOrThrow(String(primaryOrgKey));

        if (headerOrgKey && queryOrgKey && String(headerOrgKey) !== String(queryOrgKey)) {
            const { workspace: workspaceSecondary } = await getWorkspaceByOrgKeyOrThrow(String(queryOrgKey));
            if (String(workspaceSecondary.id) !== String(workspacePrimary.id)) {
                return NextResponse.json({ error: 'Conflicting workspace context' }, { status: 400 });
            }
        }

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

        const settings = await prisma.system_settings.findFirst({
            where: { tenant_id: String(workspacePrimary.id) },
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
    } catch (error: any) {
        console.error('[API] Error fetching system flags:', error);
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
        } catch (e: any) {
            return NextResponse.json({ error: e?.message || 'Forbidden - Super Admin required' }, { status: 403 });
        }

        const user = await getAuthenticatedUser();

        const body = await request.json();
        const { screenId, status, organizationId: providedOrganizationId, tenantId: providedTenantId } = body;

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
        const organizationIdFromBody = providedOrganizationId ? String(providedOrganizationId) : null;
        const tenantIdFromBody = providedTenantId ? String(providedTenantId) : null;
        const bodyOrgKey = organizationIdFromBody || tenantIdFromBody;

        if (!headerOrgKey && !bodyOrgKey) {
            return NextResponse.json(
                { error: 'Missing workspace context. Provide x-org-id header or organizationId/tenantId in body.' },
                { status: 400 }
            );
        }

        const primaryOrgKey = headerOrgKey || bodyOrgKey;
        if (!primaryOrgKey) {
            return NextResponse.json({ error: 'Missing workspace context' }, { status: 400 });
        }

        const { workspace: workspacePrimary } = await getWorkspaceByOrgKeyOrThrow(String(primaryOrgKey));

        if (headerOrgKey && bodyOrgKey && String(headerOrgKey) !== String(bodyOrgKey)) {
            const { workspace: workspaceSecondary } = await getWorkspaceByOrgKeyOrThrow(String(bodyOrgKey));
            if (String(workspaceSecondary.id) !== String(workspacePrimary.id)) {
                return NextResponse.json({ error: 'Conflicting workspace context' }, { status: 400 });
            }
        }

        const existingSettings = await prisma.system_settings.findFirst({
            where: { tenant_id: String(workspacePrimary.id) },
            select: { system_flags: true },
        });

        const currentFlags = (existingSettings?.system_flags || {}) as Record<string, 'active' | 'maintenance' | 'hidden'>;
        const updatedFlags = { ...currentFlags, [screenId]: status };

        await prisma.system_settings.upsert({
            where: { tenant_id: String(workspacePrimary.id) },
            create: {
                tenant_id: String(workspacePrimary.id),
                system_flags: updatedFlags,
            },
            update: {
                // Prisma Tenant Guard requires tenant key in update payload for upsert.
                tenant_id: String(workspacePrimary.id),
                system_flags: updatedFlags,
                updated_at: new Date(),
            },
        });

        // Log the change
        console.log(`[System Flag] ${screenId} → ${status} by userId=${user.id} for tenant ${workspacePrimary.id}`);

        return NextResponse.json({
            success: true,
            message: `מסך ${screenId} עודכן ל-${status === 'maintenance' ? 'תחזוקה' : status === 'hidden' ? 'מוסתר' : 'פעיל'}`,
            screenId,
            status,
            systemFlags: updatedFlags
        });
    } catch (error: any) {
        console.error('[API] Error updating system flag:', error);
        return NextResponse.json(
            { error: 'שגיאה בעדכון הגדרות מערכת' },
            { status: 500 }
        );
    }
}

export const GET = shabbatGuard(GETHandler);

export const PATCH = shabbatGuard(PATCHHandler);
