/**
 * API Route: Permissions
 * 
 * GET /api/permissions - Get all available permissions
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, requirePermission } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getErrorMessage } from '@/lib/server/workspace-access/utils';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
import { withTenantIsolationContext } from '@/lib/prisma-tenant-guard';

const IS_PROD = process.env.NODE_ENV === 'production';

async function GETHandler(request: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        
        // Only users with manage_system permission can view permissions
        await requirePermission('manage_system');

        return await withTenantIsolationContext(
            { source: 'api_permissions', reason: 'list_permissions', suppressReporting: true },
            async () => {
                const rows = await prisma.scale_permissions.findMany({
                    orderBy: { id: 'asc' },
                    select: { id: true, label: true, description: true, category: true },
                });

                const permissions = (rows || []).map((p) => ({
                    id: p.id,
                    label: p.label,
                    description: p.description,
                    category: p.category || 'access',
                }));
                
                return NextResponse.json({ permissions });
            }
        );
        
    } catch (error: unknown) {
        if (IS_PROD) console.error('[API] Error fetching permissions');
        else console.error('[API] Error fetching permissions:', error);

        const message = getErrorMessage(error);
        
        if (message.includes('Forbidden') || message.includes('Unauthorized')) {
            const status = message.includes('Forbidden') ? 403 : 401;
            const safeMsg = status === 403 ? 'Forbidden' : 'Unauthorized';
            return NextResponse.json(
                { error: IS_PROD ? safeMsg : message },
                { status }
            );
        }
        
        return NextResponse.json(
            { error: 'Failed to fetch permissions' },
            { status: 500 }
        );
    }
}


export const GET = shabbatGuard(GETHandler);
