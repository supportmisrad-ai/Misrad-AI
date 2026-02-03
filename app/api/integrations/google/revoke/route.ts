/**
 * API Route: Revoke Google Integration
 * 
 * POST /api/integrations/google/revoke
 * 
 * Revokes and removes Google integration
 * 
 * Body:
 *   - serviceType: 'google_calendar' | 'google_drive'
 *   - integrationId: Optional - specific integration ID to revoke
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { revokeToken } from '@/lib/integrations/google-oauth';
import prisma from '@/lib/prisma';
import { APIError, getWorkspaceOrThrow } from '@/lib/server/api-workspace';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

async function selectDbUserId(params: { workspaceId: string; email: string }): Promise<string | null> {
    const email = String(params.email || '').trim().toLowerCase();
    if (!email) return null;

    const row = await prisma.nexusUser.findFirst({
        where: {
            email,
            organizationId: String(params.workspaceId),
        },
        select: { id: true },
    });

    return row?.id ? String(row.id) : null;
}
async function POSTHandler(request: NextRequest) {
    try {
        const { workspace } = await getWorkspaceOrThrow(request);
        const clerkUser = await getAuthenticatedUser();

        const dbUserId = await selectDbUserId({ workspaceId: workspace.id, email: clerkUser.email });
        
        if (!dbUserId) {
            return NextResponse.json(
                { error: 'User not found in database. Please sync your account first.' },
                { status: 404 }
            );
        }
        
        const body = await request.json();
        const { serviceType, integrationId } = body;

        if (!serviceType || !['google_calendar', 'google_drive'].includes(serviceType)) {
            return NextResponse.json(
                { error: 'Invalid service type' },
                { status: 400 }
            );
        }

        let integrations: any[] = [];
        try {
            integrations = await prisma.scale_integrations.findMany({
                where: {
                    user_id: String(dbUserId),
                    tenant_id: String(workspace.id),
                    service_type: String(serviceType),
                    is_active: true,
                    ...(integrationId ? { id: String(integrationId) } : {}),
                },
            });
        } catch (fetchError: any) {
            console.error('[API] Error fetching integrations:', fetchError);
            throw new Error('Failed to fetch integrations');
        }

        if (!integrations || integrations.length === 0) {
            return NextResponse.json(
                { error: 'Integration not found' },
                { status: 404 }
            );
        }

        // Revoke tokens and delete integrations
        const revokePromises = integrations.map(async (integration: any) => {
            try {
                // Revoke token with Google
                if (integration.access_token) {
                    await revokeToken(integration.access_token);
                }
            } catch (error) {
                // Continue even if revocation fails (token might already be revoked)
                console.warn('[API] Error revoking token:', {
                    message: (error as any)?.message,
                    name: (error as any)?.name
                });
            }

            // Delete from database
            return prisma.scale_integrations.delete({ where: { id: String(integration.id) } });
        });

        await Promise.all(revokePromises);

        return NextResponse.json({
            success: true,
            message: `${serviceType === 'google_calendar' ? 'Calendar' : 'Drive'} integration revoked successfully`
        });

    } catch (error: any) {
        console.error('[API] Error revoking Google integration:', {
            message: error?.message,
            name: error?.name
        });
        if (error instanceof APIError) {
            return NextResponse.json({ error: error.message || 'Forbidden' }, { status: error.status });
        }
        return NextResponse.json(
            { error: error.message || 'Failed to revoke integration' },
            { status: 500 }
        );
    }
}


export const POST = shabbatGuard(POSTHandler);
