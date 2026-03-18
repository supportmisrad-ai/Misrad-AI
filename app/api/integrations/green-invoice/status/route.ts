import { asObject, getErrorMessage } from '@/lib/shared/unknown';
/**
 * API Route: Get Green Invoice Status
 * GET /api/integrations/green-invoice/status
 * 
 * Returns status of Green Invoice integration for current user
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { APIError, getWorkspaceOrThrow } from '@/lib/server/api-workspace';
import { Prisma } from '@prisma/client';

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
async function GETHandler(request: NextRequest) {
    try {
        // 1. Authenticate user
        let clerkUser;
        try {
            clerkUser = await getAuthenticatedUser();
        } catch {
            return NextResponse.json({
                connected: false
            });
        }

        const { workspaceId } = await getWorkspaceOrThrow(request);

        if (!clerkUser.email) {
            return NextResponse.json({
                connected: false
            });
        }

        const dbUserId = await selectDbUserId({ workspaceId: String(workspaceId), email: clerkUser.email });
        if (!dbUserId) {
            return NextResponse.json({ connected: false });
        }

        const dbUserIdSafe = String(dbUserId || '').trim();
        const workspaceIdSafe = String(workspaceId || '').trim();
        
        if (!dbUserIdSafe || !workspaceIdSafe) {
            return NextResponse.json({ connected: false });
        }

        let integration: Prisma.MisradIntegrationGetPayload<{
            select: { id: true; is_active: true; last_synced_at: true; metadata: true };
        }> | null = null;
        try {
            integration = await prisma.misradIntegration.findFirst({
                where: {
                    user_id: dbUserIdSafe,
                    tenant_id: workspaceIdSafe,
                    service_type: 'green_invoice',
                    is_active: true,
                },
                select: { id: true, is_active: true, last_synced_at: true, metadata: true },
            });
        } catch {
            integration = null;
        }

        if (!integration) {
            return NextResponse.json({
                connected: false
            });
        }

        const integrationObj = asObject(integration) ?? {};

        return NextResponse.json({
            connected: true,
            lastSynced: integrationObj.last_synced_at,
            metadata: integrationObj.metadata
        });

    } catch (error: unknown) {
        console.warn('[API] Error getting Green Invoice status (non-critical):', getErrorMessage(error));
        if (error instanceof APIError) {
            // Status endpoints are optional; on screens like /login we may not have workspace context.
            if (error.status === 400) {
                return NextResponse.json({ connected: false });
            }
            return NextResponse.json({ connected: false }, { status: error.status });
        }
        return NextResponse.json({
            connected: false
        });
    }
}


export const GET = shabbatGuard(GETHandler);
