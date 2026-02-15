/**
 * API Route: Connect Green Invoice
 * POST /api/integrations/green-invoice/connect
 * 
 * Connects user's Green Invoice account by storing API key
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { APIError, getWorkspaceOrThrow } from '@/lib/server/api-workspace';
import { Prisma } from '@prisma/client';
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
        // 1. Authenticate user
        let clerkUser;
        try {
            clerkUser = await getAuthenticatedUser();
        } catch {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        if (!clerkUser.email) {
            return NextResponse.json(
                { error: 'User email not found' },
                { status: 400 }
            );
        }

        // 2. Find user in database
        const dbUserId = await selectDbUserId({ workspaceId: workspace.id, email: clerkUser.email });

        if (!dbUserId) {
            return NextResponse.json(
                { error: 'User not found in database. Please sync your account first.' },
                { status: 404 }
            );
        }

        // 3. Parse request body
        const bodyJson: unknown = await request.json().catch(() => ({}));
        const bodyObj = asObject(bodyJson) ?? {};
        const apiKey = bodyObj.apiKey;

        if (!apiKey || typeof apiKey !== 'string') {
            return NextResponse.json(
                { error: 'API key is required' },
                { status: 400 }
            );
        }

        const existingIntegration = await prisma.scale_integrations.findFirst({
            where: {
                user_id: String(dbUserId),
                tenant_id: String(workspace.id),
                service_type: 'green_invoice',
            },
            select: { id: true },
        });

        if (existingIntegration?.id) {
            await prisma.scale_integrations.update({
                where: { id: String(existingIntegration.id) },
                data: {
                    access_token: apiKey,
                    is_active: true,
                    updated_at: new Date(),
                },
            });
        } else {
            await prisma.scale_integrations.create({
                data: {
                    user_id: String(dbUserId),
                    tenant_id: String(workspace.id),
                    service_type: 'green_invoice',
                    access_token: apiKey,
                    token_type: 'Bearer',
                    is_active: true,
                    metadata: {
                        connectedAt: new Date().toISOString(),
                    } as Prisma.InputJsonValue,
                    created_at: new Date(),
                    updated_at: new Date(),
                },
            });
        }

        return NextResponse.json({
            success: true,
            message: 'Green Invoice account connected successfully'
        });

    } catch (error: unknown) {
        if (IS_PROD) console.error('[API] Error connecting Green Invoice');
        else console.error('[API] Error connecting Green Invoice:', error);
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
        const safeMsg = 'Failed to connect Green Invoice';
        return NextResponse.json(
            { error: IS_PROD ? safeMsg : getErrorMessage(error) || safeMsg },
            { status: 500 }
        );
    }
}


export const POST = shabbatGuard(POSTHandler);
