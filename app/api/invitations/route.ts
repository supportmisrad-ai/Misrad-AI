import { asObject, getErrorMessage } from '@/lib/shared/unknown';
/**
 * API Route: List Invitation Links
 * GET /api/invitations
 * 
 * Gets all invitation links (for admin panel)
 */

import { NextRequest } from 'next/server';
import { getAuthenticatedUser, requireSuperAdmin } from '../../../lib/auth';
import { getBaseUrl } from '../../../lib/utils';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { APIError, getWorkspaceOrThrow } from '@/lib/server/api-workspace';
import { apiError, apiSuccess } from '@/lib/server/api-response';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

const ALLOW_SCHEMA_FALLBACKS = String(process.env.MISRAD_ALLOW_SCHEMA_FALLBACKS || '').toLowerCase() === 'true';

const IS_PROD = process.env.NODE_ENV === 'production';

type InvitationRow = Record<string, unknown>;

type LoadInvitationsResult =
    | { missingTable: boolean; rows: InvitationRow[] }
    | InvitationRow[];

function isMissingTableOrSchemaError(error: unknown): boolean {
    const obj = asObject(error);
    const meta = asObject(obj?.meta);
    const metaCode = meta?.code;
    if (metaCode === '42P01' || metaCode === '42703') return true;
    const msg = String(obj?.message || '').toLowerCase();
    return msg.includes('does not exist') || msg.includes('could not find the table') || msg.includes('schema cache');
}

async function selectDbUserId(params: { workspaceId: string; email: string }): Promise<string | null> {
    const email = String(params.email || '').trim().toLowerCase();
    if (!email) return null;

    const row = await prisma.nexusUser.findFirst({
        where: { email, organizationId: String(params.workspaceId) },
        select: { id: true },
    });

    return row?.id ? String(row.id) : null;
}

async function loadInvitationsForWorkspace(workspaceId: string) {
    try {
        const rows = await prisma.$queryRaw<unknown[]>(
            Prisma.sql`
                SELECT
                    id,
                    token,
                    client_id,
                    created_at,
                    expires_at,
                    is_used,
                    is_active,
                    used_at,
                    ceo_name,
                    ceo_email,
                    company_name,
                    source,
                    metadata
                FROM system_invitation_links
                WHERE organization_id = ${String(workspaceId)}
                ORDER BY created_at DESC
            `
        );
        return (Array.isArray(rows) ? rows : []).map((r) => asObject(r) ?? {});
    } catch (error: unknown) {
        const obj = asObject(error);
        const meta = asObject(obj?.meta);
        const code = String(obj?.code || meta?.code || '');
        if (code === '42P01' || (isMissingTableOrSchemaError(error) && code === '42P01')) {
            if (!ALLOW_SCHEMA_FALLBACKS) {
                throw new Error(`[SchemaMismatch] system_invitation_links missing table (${getErrorMessage(error) || 'missing relation'})`);
            }
            return { missingTable: true as const, rows: [] as InvitationRow[] };
        }
        if (code === '42703') {
            if (!ALLOW_SCHEMA_FALLBACKS) {
                throw new Error(`[SchemaMismatch] system_invitation_links.organization_id missing column (${getErrorMessage(error) || 'missing column'})`);
            }
            const rows = await prisma.$queryRaw<unknown[]>(
                Prisma.sql`
                    SELECT
                        id,
                        token,
                        client_id,
                        created_at,
                        expires_at,
                        is_used,
                        is_active,
                        used_at,
                        ceo_name,
                        ceo_email,
                        company_name,
                        source,
                        metadata
                    FROM system_invitation_links
                    ORDER BY created_at DESC
                `
            );
            return { missingTable: false as const, rows: (Array.isArray(rows) ? rows : []).map((r) => asObject(r) ?? {}) };
        }
        throw error;
    }
}

function normalizeLoadInvitationsResult(value: LoadInvitationsResult): { missingTable: boolean; rows: InvitationRow[] } {
    if (Array.isArray(value)) return { missingTable: false, rows: value };
    const obj = asObject(value) ?? {};
    const missingTable = Boolean(obj.missingTable);
    const rowsRaw = obj.rows;
    const rows = Array.isArray(rowsRaw) ? rowsRaw.map((r) => asObject(r) ?? {}) : [];
    return { missingTable, rows };
}

async function GETHandler(request: NextRequest) {
    try {
        // 1. Authenticate user
        const clerkUser = await getAuthenticatedUser();

        try {
            await requireSuperAdmin();
        } catch (e: unknown) {
            const safeMsg = 'Forbidden - Super Admin required';
            return apiError(IS_PROD ? safeMsg : getErrorMessage(e) || safeMsg, { status: 403 });
        }

        if (!clerkUser.email) {
            return apiError('User email not found', { status: 400 });
        }

        const { workspace } = await getWorkspaceOrThrow(request);

        // 2. Find user in database by email
        const dbUserId = await selectDbUserId({ workspaceId: workspace.id, email: clerkUser.email });

        if (!dbUserId) {
            return apiError('User not found in database. Please sync your account first.', { status: 404 });
        }

        // Super admin already validated above

        const res = await loadInvitationsForWorkspace(String(workspace.id));
        const normalized = normalizeLoadInvitationsResult(res as LoadInvitationsResult);
        const invitations = normalized.rows;
        const missingTable = normalized.missingTable;

        if (missingTable) {
            if (IS_PROD) console.warn('[API] invitation_links table does not exist');
            else console.warn('[API] invitation_links table does not exist. Please run the schema SQL.');
            return apiSuccess({
                invitations: [],
                warning: 'invitation_links table does not exist. Please run supabase-invitation-links-schema.sql'
            });
        }

        // 4. Generate URLs for each invitation
        const baseUrl = getBaseUrl(request);

        const invitationsWithUrls = (invitations || []).map((invitation) => ({
            ...invitation,
            url: `${baseUrl}/invite/${invitation.token}`
        }));

        return apiSuccess({ invitations: invitationsWithUrls });

    } catch (error: unknown) {
        if (IS_PROD) console.error('[API] Error getting invitations');
        else console.error('[API] Error getting invitations:', error);
        if (error instanceof APIError) {
            const safeMsg =
                error.status === 400
                    ? 'Bad request'
                    : error.status === 401
                        ? 'Unauthorized'
                        : error.status === 404
                            ? 'Not found'
                            : 'Forbidden';
            return apiError(error, {
                status: error.status,
                message: IS_PROD ? safeMsg : error.message || safeMsg,
            });
        }
        const safeMsg = 'Failed to get invitations';
        const msg = getErrorMessage(error) || safeMsg;
        return apiError(IS_PROD ? safeMsg : error, { status: 500, message: IS_PROD ? safeMsg : msg });
    }
}


export const GET = shabbatGuard(GETHandler);
