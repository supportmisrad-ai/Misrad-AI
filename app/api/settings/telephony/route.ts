/**
 * API Route: Telephony Integration Settings
 * GET /api/settings/telephony - Get telephony configuration for current tenant
 * PUT /api/settings/telephony - Update/save telephony configuration for current tenant
 * 
 * BYOC (Bring Your Own Carrier) - Each organization brings their own provider credentials
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, isTenantAdmin } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { queryRawTenantScoped } from '@/lib/prisma';
import { getWorkspaceOrThrow } from '@/lib/server/api-workspace';
import { asObject, getErrorMessage } from '@/lib/server/workspace-access/utils';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

const IS_PROD = process.env.NODE_ENV === 'production';

/**
 * Require that the caller is either a super-admin (system-level)
 * or a tenant admin / CEO (business-level) for this workspace.
 * Telephony settings are a tenant-level configuration — the business
 * owner (מנכ"ל) must be able to manage them.
 */
async function requireTelephonyAccess(): Promise<void> {
    const user = await getAuthenticatedUser();
    if (user.isSuperAdmin) return;
    const isAdmin = await isTenantAdmin();
    if (isAdmin) return;
    throw new Error('Forbidden - Missing permission: manage telephony settings');
}

/**
 * GET /api/settings/telephony
 * Get telephony configuration for current tenant
 */
async function GETHandler(request: NextRequest) {
    try {
        // 1. Authenticate + authorise (superAdmin OR tenantAdmin/CEO)
        await requireTelephonyAccess();

        // 2. Resolve workspace from x-org-id header
        const { workspace } = await getWorkspaceOrThrow(request);
        const tenantId = String(workspace.id);

        const rows = await queryRawTenantScoped<
            Array<{ id: string; system_flags: unknown; created_at: string | null; updated_at: string | null }>
        >(prisma, {
            tenantId,
            reason: 'telephony_settings_get',
            query: `
                SELECT id, system_flags, created_at, updated_at
                FROM system_settings
                WHERE tenant_id = $1::uuid
                LIMIT 1
            `,
            values: [tenantId],
        });

        const row = Array.isArray(rows) && rows.length ? rows[0] : null;

        const systemFlagsObj = asObject(row?.system_flags);
        const telephony = asObject(systemFlagsObj?.telephony);

        const integrations = row && telephony
            ? [
                {
                    id: String(row.id),
                    provider: String(telephony.provider || ''),
                    isActive: Boolean(telephony.isActive ?? true),
                    createdAt: row.created_at,
                    updatedAt: row.updated_at,
                },
            ]
            : [];
        
        return NextResponse.json({
            tenantId,
            integrations: integrations.map((integration) => ({
                id: integration.id,
                provider: integration.provider,
                isActive: integration.isActive,
                configured: true, // If record exists, it's configured
                createdAt: integration.createdAt,
                updatedAt: integration.updatedAt
            }))
        });
        
    } catch (error: unknown) {
        if (IS_PROD) console.error('[API] Error fetching telephony settings');
        else console.error('[API] Error fetching telephony settings:', error);
        const message = getErrorMessage(error);
        return NextResponse.json(
            { error: message || 'Internal server error' },
            { status: message.includes('Forbidden') ? 403 : 500 }
        );
    }
}

/**
 * PUT /api/settings/telephony
 * Save/update telephony configuration for current tenant
 * 
 * Body (JSON):
 *   - provider: string (required) - 'voicenter' | 'twilio' | etc.
 *   - credentials: object (required) - { api_key, secret, account_id, etc. }
 *   - isActive: boolean (optional) - Whether to activate this integration
 */
async function PUTHandler(request: NextRequest) {
    try {
        // 1. Authenticate + authorise (superAdmin OR tenantAdmin/CEO)
        await requireTelephonyAccess();

        // 2. Resolve workspace from x-org-id header
        const { workspace } = await getWorkspaceOrThrow(request);
        const tenantId = String(workspace.id);
        
        // 4. Parse request body
        const bodyJson: unknown = await request.json().catch(() => ({}));
        const bodyObj = asObject(bodyJson) ?? {};
        const provider = typeof bodyObj.provider === 'string' ? bodyObj.provider : '';
        const credentials = asObject(bodyObj.credentials);
        const isActive = bodyObj.isActive;
        
        // 5. Validate input
        if (!provider || !credentials) {
            return NextResponse.json(
                { error: 'Missing required fields: provider and credentials' },
                { status: 400 }
            );
        }
        
        // Validate provider
        const validProviders = ['voicenter', 'twilio'];
        if (!validProviders.includes(provider.toLowerCase())) {
            return NextResponse.json(
                { error: `Invalid provider. Supported providers: ${validProviders.join(', ')}` },
                { status: 400 }
            );
        }
        
        const active = isActive !== undefined ? Boolean(isActive) : true;
        const nextTelephony = {
            provider: provider.toLowerCase(),
            credentials: credentials,
            isActive: active,
        };

        const upserted = await queryRawTenantScoped<Array<{ id: string; tenant_id: string; system_flags: unknown }>>(prisma, {
            tenantId,
            reason: 'telephony_settings_upsert',
            query: `
                INSERT INTO system_settings (tenant_id, system_flags)
                VALUES ($1::uuid, jsonb_build_object('telephony', $2::jsonb))
                ON CONFLICT (tenant_id)
                DO UPDATE SET
                    system_flags = COALESCE(system_settings.system_flags, '{}'::jsonb) || jsonb_build_object('telephony', $2::jsonb),
                    updated_at = NOW()
                RETURNING id, tenant_id, system_flags
            `,
            values: [tenantId, nextTelephony],
        });

        const integration = Array.isArray(upserted) && upserted.length ? upserted[0] : null;

        if (!integration?.id) {
            return NextResponse.json(
                { error: 'Failed to save telephony configuration' },
                { status: 500 }
            );
        }
        
        return NextResponse.json({
            success: true,
            message: 'Telephony configuration saved successfully',
            integration: {
                id: integration.id,
                provider: provider.toLowerCase(),
                isActive: active,
                tenantId: tenantId
            }
        });
        
    } catch (error: unknown) {
        if (IS_PROD) console.error('[API] Error saving telephony settings');
        else console.error('[API] Error saving telephony settings:', error);
        const message = getErrorMessage(error);
        return NextResponse.json(
            { error: message || 'Internal server error' },
            { status: message.includes('Forbidden') ? 403 : 500 }
        );
    }
}


export const GET = shabbatGuard(GETHandler);

export const PUT = shabbatGuard(PUTHandler);
