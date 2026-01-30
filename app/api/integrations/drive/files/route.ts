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
import { createClient } from '@/lib/supabase';
import { APIError, getWorkspaceOrThrow } from '@/lib/server/api-workspace';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

async function selectDbUserId(params: { supabase: any; workspaceId: string; email: string | null | undefined }): Promise<string | null> {
    const email = String(params.email || '').trim().toLowerCase();
    if (!email) return null;

    const byOrg = await params.supabase
        .from('nexus_users')
        .select('id')
        .eq('email', email)
        .eq('organization_id', params.workspaceId)
        .limit(1)
        .maybeSingle();

    if ((byOrg as any)?.error?.code === '42703') {
        throw new Error('[SchemaMismatch] nexus_users is missing organization_id');
    }

    return byOrg.data?.id ? String(byOrg.data.id) : null;
}
async function GETHandler(request: NextRequest) {
    try {
        const { workspace } = await getWorkspaceOrThrow(request);

        const clerkUser = await getAuthenticatedUser();

        let supabase: any;
        try {
            supabase = createClient();
        } catch {
            return NextResponse.json({ files: [], nextPageToken: undefined });
        }

        const dbUserId = await selectDbUserId({ supabase, workspaceId: workspace.id, email: clerkUser.email });
        
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

    } catch (error: any) {
        if (error instanceof APIError) {
            return NextResponse.json({ error: error.message || 'Forbidden' }, { status: error.status });
        }
        if (String(error?.message || '').includes('[SchemaMismatch]')) {
            return NextResponse.json({ error: String(error.message) }, { status: 500 });
        }
        console.warn('[API] Error fetching drive files (non-critical):', error.message);
        return NextResponse.json({ files: [], nextPageToken: undefined });
    }
}


export const GET = shabbatGuard(GETHandler);
