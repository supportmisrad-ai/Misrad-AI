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
import { asObject, getErrorMessage } from '@/lib/server/workspace-access/utils';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

const IS_PROD = process.env.NODE_ENV === 'production';

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

        if (!clerkUser.email) {
            return NextResponse.json({ error: 'User email not found' }, { status: 400 });
        }

        const dbUserId = await selectDbUserId({ workspaceId: workspace.id, email: clerkUser.email });
        
        if (!dbUserId) {
            return NextResponse.json(
                { error: 'User not found in database. Please sync your account first.' },
                { status: 404 }
            );
        }
        
        const bodyJson: unknown = await request.json().catch(() => ({}));
        const bodyObj = asObject(bodyJson) ?? {};
        const serviceType = typeof bodyObj.serviceType === 'string' ? bodyObj.serviceType : '';
        const integrationId = typeof bodyObj.integrationId === 'string' ? bodyObj.integrationId : null;

        if (!serviceType || !['google_calendar', 'google_drive'].includes(serviceType)) {
            return NextResponse.json(
                { error: 'Invalid service type' },
                { status: 400 }
            );
        }

        let integrations: Awaited<ReturnType<typeof prisma.misradIntegration.findMany>> = [];
        try {
            integrations = await prisma.misradIntegration.findMany({
                where: {
                    user_id: String(dbUserId),
                    tenant_id: String(workspace.id),
                    service_type: String(serviceType),
                    is_active: true,
                    ...(integrationId ? { id: String(integrationId) } : {}),
                },
            });
        } catch (fetchError: unknown) {
            if (IS_PROD) console.error('[API] Error fetching integrations');
            else console.error('[API] Error fetching integrations:', fetchError);
            throw new Error('Failed to fetch integrations');
        }

        if (!integrations || integrations.length === 0) {
            return NextResponse.json(
                { error: 'Integration not found' },
                { status: 404 }
            );
        }

        // Revoke tokens and delete integrations
        const revokePromises = integrations.map(async (integration) => {
            try {
                // Revoke token with Google
                if (integration.access_token) {
                    await revokeToken(integration.access_token);
                }
            } catch (error) {
                // Continue even if revocation fails (token might already be revoked)
                if (IS_PROD) {
                    console.warn('[API] Error revoking token (ignored)');
                } else {
                    console.warn('[API] Error revoking token:', {
                        message: getErrorMessage(error),
                        name: error instanceof Error ? error.name : undefined,
                    });
                }
            }

            // Delete from database
            return prisma.misradIntegration.deleteMany({
                where: {
                    id: String(integration.id),
                    tenant_id: String(workspace.id),
                    user_id: String(dbUserId),
                },
            });
        });

        await Promise.all(revokePromises);

        return NextResponse.json({
            success: true,
            message: `${serviceType === 'google_calendar' ? 'Calendar' : 'Drive'} integration revoked successfully`
        });

    } catch (error: unknown) {
        if (IS_PROD) {
            console.error('[API] Error revoking Google integration');
        } else {
            console.error('[API] Error revoking Google integration:', {
                message: getErrorMessage(error),
                name: error instanceof Error ? error.name : undefined,
            });
        }
        if (error instanceof APIError) {
            const safeMsg =
                error.status === 400
                    ? 'Bad request'
                    : error.status === 401
                        ? 'Unauthorized'
                        : error.status === 404
                            ? 'Not found'
                            : error.status === 500
                                ? 'Internal server error'
                                : 'Forbidden';
            return NextResponse.json(
                { error: IS_PROD ? safeMsg : error.message || safeMsg },
                { status: error.status }
            );
        }
        return NextResponse.json(
            { error: IS_PROD ? 'Failed to revoke integration' : (getErrorMessage(error) || 'Failed to revoke integration') },
            { status: 500 }
        );
    }
}


export const POST = shabbatGuard(POSTHandler);
