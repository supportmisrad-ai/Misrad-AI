import { asObject, getErrorMessage } from '@/lib/shared/unknown';
/**
 * API Route: Create Invitation Link
 * POST /api/invitations/create
 * 
 * Creates a one-time invitation link for client onboarding
 */

import { NextRequest } from 'next/server';
import { getAuthenticatedUser, requireSuperAdmin } from '@/lib/auth';
import { generateInvitationToken, getBaseUrl } from '@/lib/utils';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { APIError, getWorkspaceOrThrow } from '@/lib/server/api-workspace';
import { apiError, apiSuccess } from '@/lib/server/api-response';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

const ALLOW_SCHEMA_FALLBACKS = String(process.env.MISRAD_ALLOW_SCHEMA_FALLBACKS || '').toLowerCase() === 'true';

const IS_PROD = process.env.NODE_ENV === 'production';

type InvitationRow = Record<string, unknown>;

type InvitationInsert = {
    organization_id: string;
    token: string;
    client_id: string | null;
    created_by: string | null;
    expires_at: string;
    is_used: boolean;
    is_active: boolean;
    source: string;
    metadata: Record<string, unknown>;
};

async function selectDbUserId(params: { workspaceId: string; email: string }): Promise<string | null> {
    const email = String(params.email || '').trim().toLowerCase();
    if (!email) return null;

    const row = await prisma.nexusUser.findFirst({
        where: { email, organizationId: String(params.workspaceId) },
        select: { id: true },
    });

    return row?.id ? String(row.id) : null;
}

async function insertInvitation(params: { workspaceId: string; invitation: InvitationInsert }): Promise<InvitationRow | null> {
    const inv = params.invitation;
    try {
        const rows = await prisma.$queryRaw<unknown[]>(
            Prisma.sql`
                INSERT INTO system_invitation_links (
                    organization_id,
                    token,
                    client_id,
                    created_by,
                    expires_at,
                    is_used,
                    is_active,
                    source,
                    metadata
                ) VALUES (
                    ${String(params.workspaceId)},
                    ${String(inv.token)},
                    ${inv.client_id ? String(inv.client_id) : null},
                    ${inv.created_by ? String(inv.created_by) : null},
                    ${String(inv.expires_at)},
                    ${Boolean(inv.is_used)},
                    ${Boolean(inv.is_active)},
                    ${String(inv.source || 'manual')},
                    ${JSON.stringify(inv.metadata || {})}
                )
                RETURNING *
            `
        );
        const first = Array.isArray(rows) ? rows[0] : null;
        return first ? (asObject(first) ?? {}) : null;
    } catch (error: unknown) {
        const obj = asObject(error);
        const meta = asObject(obj?.meta);
        const code = String(obj?.code || meta?.code || '');
        if (code === '42P01') {
            if (!ALLOW_SCHEMA_FALLBACKS) {
                throw new Error(`[SchemaMismatch] system_invitation_links missing table (${getErrorMessage(error) || 'missing relation'})`);
            }
        }
        if (code === '42703') {
            if (!ALLOW_SCHEMA_FALLBACKS) {
                throw new Error(`[SchemaMismatch] system_invitation_links.organization_id missing column (${getErrorMessage(error) || 'missing column'})`);
            }
            const rows = await prisma.$queryRaw<unknown[]>(
                Prisma.sql`
                    INSERT INTO system_invitation_links (
                        token,
                        client_id,
                        created_by,
                        expires_at,
                        is_used,
                        is_active,
                        source,
                        metadata
                    ) VALUES (
                        ${String(inv.token)},
                        ${inv.client_id ? String(inv.client_id) : null},
                        ${inv.created_by ? String(inv.created_by) : null},
                        ${String(inv.expires_at)},
                        ${Boolean(inv.is_used)},
                        ${Boolean(inv.is_active)},
                        ${String(inv.source || 'manual')},
                        ${JSON.stringify(inv.metadata || {})}
                    )
                    RETURNING *
                `
            );
            const first = Array.isArray(rows) ? rows[0] : null;
            return first ? (asObject(first) ?? {}) : null;
        }
        throw error;
    }
}
async function POSTHandler(request: NextRequest) {
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

        // 3. Parse request body
        const body: unknown = await request.json();
        const bodyObj = asObject(body) ?? {};
        const clientId = bodyObj.clientId;
        const expiresInDaysRaw = bodyObj.expiresInDays;
        const expiresInDays = Number.isFinite(Number(expiresInDaysRaw)) ? Number(expiresInDaysRaw) : 7;
        const source = typeof bodyObj.source === 'string' ? bodyObj.source : 'manual';

        // 4. Generate unique token
        const token = await generateInvitationToken();
        
        if (!token || token.trim() === '') {
            throw new Error('Failed to generate invitation token');
        }

        // 5. Calculate expiration date
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + expiresInDays);

        const invitationData: InvitationInsert = {
            organization_id: workspace.id,
            token,
            client_id: clientId ? String(clientId) : null,
            created_by: dbUserId,
            expires_at: expiresAt.toISOString(),
            is_used: false,
            is_active: true,
            source,
            metadata: {}
        };

        let invitation: InvitationRow | null = null;
        try {
            invitation = await insertInvitation({ workspaceId: String(workspace.id), invitation: invitationData });
        } catch (createError: unknown) {
            if (IS_PROD) console.error('[API] Error creating invitation link');
            else console.error('[API] Error creating invitation link:', createError);
            const msg = getErrorMessage(createError) || 'Failed to create invitation link';
            return apiError(IS_PROD ? 'Failed to create invitation link' : msg, { status: 500 });
        }

        if (!invitation) {
            return apiError('Failed to create invitation link', { status: 500 });
        }

        // 7. Generate invitation URL
        const baseUrl = getBaseUrl(request);
        const invitationUrl = `${baseUrl}/invite/${token}`;

        const invObj = asObject(invitation) ?? {};

        return apiSuccess({
            invitation: {
                id: invObj.id,
                token: invObj.token,
                url: invitationUrl,
                expiresAt: invObj.expires_at,
                createdAt: invObj.created_at
            }
        }, { status: 201 });

    } catch (error: unknown) {
        if (IS_PROD) console.error('[API] Error creating invitation link');
        else console.error('[API] Error creating invitation link:', error);
        if (error instanceof APIError) {
            const safeMsg =
                error.status === 400
                    ? 'Bad request'
                    : error.status === 401
                        ? 'Unauthorized'
                        : error.status === 404
                            ? 'Not found'
                            : 'Forbidden';
            return apiError(error, { status: error.status, message: IS_PROD ? safeMsg : error.message || safeMsg });
        }
        const safeMsg = 'Failed to create invitation link';
        const msg = getErrorMessage(error) || safeMsg;
        return apiError(IS_PROD ? safeMsg : error, { status: 500, message: IS_PROD ? safeMsg : msg });
    }
}


export const POST = shabbatGuard(POSTHandler);
