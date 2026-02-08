/**
 * API Route: Get Drive Files
 * 
 * GET /api/integrations/drive/files
 * 
 * Lists files from Google Drive
 * 
 * Query params:
 *   - pageSize: Number of files (default: 20)
 *   - pageToken: Token for pagination
 *   - search: Optional search query
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '../../../../../lib/auth';
import { listDriveFiles, searchDriveFiles } from '../../../../../lib/integrations/google-drive';
import prisma from '@/lib/prisma';
import { APIError, getWorkspaceOrThrow } from '@/lib/server/api-workspace';
import { getErrorMessage } from '@/lib/server/workspace-access/utils';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

const IS_PROD = process.env.NODE_ENV === 'production';

async function selectDbUserId(params: { workspaceId: string; email: string | null | undefined }): Promise<string | null> {
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
        const { workspace } = await getWorkspaceOrThrow(request);

        const clerkUser = await getAuthenticatedUser();

        const dbUserId = await selectDbUserId({ workspaceId: workspace.id, email: clerkUser.email });
        
        if (!dbUserId) {
            return NextResponse.json({ files: [], nextPageToken: undefined });
        }
        
        const searchParams = request.nextUrl.searchParams;
        const pageSize = parseInt(searchParams.get('pageSize') || '20');
        const pageToken = searchParams.get('pageToken') || undefined;
        const search = searchParams.get('search');

        if (search) {
            // Search files
            const files = await searchDriveFiles(dbUserId, search, workspace.id);
            return NextResponse.json({ files: files || [] });
        } else {
            // List files
            const result = await listDriveFiles(dbUserId, workspace.id, pageSize, pageToken);
            return NextResponse.json({ files: result.files || [], nextPageToken: result.nextPageToken });
        }

    } catch (error: unknown) {
        if (error instanceof APIError) {
            const safeMsg =
                error.status === 400
                    ? 'Bad request'
                    : error.status === 401
                        ? 'Unauthorized'
                        : error.status === 404
                            ? 'Not found'
                            : 'Forbidden';
            return NextResponse.json(
                { error: IS_PROD ? safeMsg : error.message || safeMsg },
                { status: error.status }
            );
        }
        const message = getErrorMessage(error);
        if (message.includes('[SchemaMismatch]')) {
            const safeMsg = 'Internal server error';
            return NextResponse.json({ error: IS_PROD ? safeMsg : message }, { status: 500 });
        }
        if (IS_PROD) console.warn('[API] Error fetching drive files (non-critical)');
        else console.warn('[API] Error fetching drive files (non-critical):', message);
        return NextResponse.json({ files: [], nextPageToken: undefined });
    }
}


export const GET = shabbatGuard(GETHandler);
