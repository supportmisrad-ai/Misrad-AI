import { asObject, getErrorMessage } from '@/lib/shared/unknown';
/**
 * API Route: List Documents from Green Invoice
 * GET /api/integrations/green-invoice/list
 * 
 * Returns a list of documents (invoices, quotes, receipts, etc.) from Green Invoice API
 * for the current user's connected account.
 * 
 * Query params:
 *   fromDate - ISO date string (optional)
 *   toDate   - ISO date string (optional)
 *   status   - draft | sent | paid | cancelled (optional)
 *   limit    - number (optional, default 50)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { listInvoices } from '@/lib/integrations/green-invoice';
import prisma from '@/lib/prisma';
import { APIError, getWorkspaceOrThrow } from '@/lib/server/api-workspace';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

const IS_PROD = process.env.NODE_ENV === 'production';

async function selectDbUserId(params: { workspaceId: string; email: string }): Promise<string | null> {
    const email = String(params.email || '').trim().toLowerCase();
    const workspaceIdSafe = String(params.workspaceId || '').trim();
    if (!email || !workspaceIdSafe) return null;

    const row = await prisma.nexusUser.findFirst({
        where: {
            email,
            organizationId: workspaceIdSafe,
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
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { workspaceId } = await getWorkspaceOrThrow(request);

        if (!clerkUser.email) {
            return NextResponse.json(
                { error: 'User email not found' },
                { status: 400 }
            );
        }

        // 2. Find user in database
        const dbUserId = await selectDbUserId({ workspaceId: String(workspaceId), email: clerkUser.email });
        if (!dbUserId) {
            return NextResponse.json(
                { error: 'User not found in database.' },
                { status: 404 }
            );
        }

        const dbUserIdSafe = String(dbUserId || '').trim();
        const workspaceIdSafe = String(workspaceId || '').trim();
        
        if (!dbUserIdSafe || !workspaceIdSafe) {
            return NextResponse.json(
                { error: 'Invalid parameters.' },
                { status: 400 }
            );
        }

        // 2.1 GUARD: Verify Green Invoice integration is connected
        const activeIntegration = await prisma.misradIntegration.findFirst({
            where: {
                tenant_id: workspaceIdSafe,
                user_id: dbUserIdSafe,
                service_type: 'green_invoice',
                is_active: true,
            },
            select: { id: true, access_token: true },
        });
        if (!activeIntegration?.access_token) {
            return NextResponse.json(
                { error: 'אינטגרציה לחשבונית ירוקה לא מחוברת.', code: 'INTEGRATION_NOT_CONNECTED', documents: [] },
                { status: 403 }
            );
        }

        // 3. Parse query params
        const { searchParams } = new URL(request.url);
        const fromDate = searchParams.get('fromDate') || undefined;
        const toDate = searchParams.get('toDate') || undefined;
        const statusParam = searchParams.get('status') || undefined;
        const limitParam = searchParams.get('limit');
        const limit = limitParam ? Number(limitParam) : 50;

        const statusValue: 'draft' | 'sent' | 'paid' | 'cancelled' | undefined =
            statusParam === 'draft' || statusParam === 'sent' || statusParam === 'paid' || statusParam === 'cancelled'
                ? statusParam
                : undefined;

        // 4. Fetch documents from Green Invoice API
        const documents = await listInvoices(dbUserId, String(workspaceId), {
            fromDate,
            toDate,
            status: statusValue,
            limit,
        });

        return NextResponse.json({
            success: true,
            documents,
            total: documents.length,
        });

    } catch (error: unknown) {
        if (IS_PROD) console.error('[API] Error listing Green Invoice documents');
        else console.error('[API] Error listing Green Invoice documents:', error);
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
        const message = getErrorMessage(error);
        const safeMsg = 'Failed to list documents';
        return NextResponse.json(
            { error: IS_PROD ? safeMsg : message || safeMsg },
            { status: 500 }
        );
    }
}

export const GET = shabbatGuard(GETHandler);
