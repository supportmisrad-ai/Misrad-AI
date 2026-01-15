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
import { getUsers } from '../../../../../lib/db';
import { requireWorkspaceAccessByOrgSlugApi } from '@/lib/server/workspace';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
async function GETHandler(request: NextRequest) {
    try {
        const orgIdFromHeader = request.headers.get('x-org-id') || request.headers.get('x-orgid');
        if (orgIdFromHeader) {
            await requireWorkspaceAccessByOrgSlugApi(orgIdFromHeader);
        }

        const clerkUser = await getAuthenticatedUser();
        
        // Convert Clerk ID to Supabase UUID
        const dbUsers = await getUsers({ email: clerkUser.email });
        const dbUser = dbUsers.length > 0 ? dbUsers[0] : null;
        
        if (!dbUser) {
            return NextResponse.json({ files: [], nextPageToken: undefined });
        }
        
        const searchParams = request.nextUrl.searchParams;
        const pageSize = parseInt(searchParams.get('pageSize') || '20');
        const pageToken = searchParams.get('pageToken') || undefined;
        const search = searchParams.get('search');

        if (search) {
            // Search files
            const files = await searchDriveFiles(dbUser.id, search);
            return NextResponse.json({ files: files || [] });
        } else {
            // List files
            const result = await listDriveFiles(dbUser.id, undefined, pageSize, pageToken);
            return NextResponse.json({ files: result.files || [], nextPageToken: result.nextPageToken });
        }

    } catch (error: any) {
        // Return empty result instead of error to prevent UI blocking
        console.warn('[API] Error fetching drive files (non-critical):', error.message);
        return NextResponse.json({ files: [], nextPageToken: undefined });
    }
}


export const GET = shabbatGuard(GETHandler);
