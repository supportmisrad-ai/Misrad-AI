/**
 * API Route: Telephony Credentials (Internal)
 * GET /api/settings/telephony/credentials - Get telephony credentials for widget
 * 
 * This endpoint returns the full credentials needed for the WebRTC widget.
 * It's separate from the main telephony settings endpoint for security.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, requirePermission } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { queryRawTenantScoped } from '@/lib/prisma';
import { getWorkspaceOrThrow } from '@/lib/server/api-workspace';
import { asObject, getErrorMessage } from '@/lib/server/workspace-access/utils';
import { shabbatGuard } from '@/lib/api-shabbat-guard';

const IS_PROD = process.env.NODE_ENV === 'production';

async function GETHandler(request: NextRequest) {
  try {
    // 1. Authenticate user
    await getAuthenticatedUser();
    
    // 2. Check permissions
    await requirePermission('manage_system');

    const { workspace } = await getWorkspaceOrThrow(request);
    const tenantId = String(workspace.id);

    // 3. Get telephony credentials from system_settings
    const rows = await queryRawTenantScoped<
      Array<{ system_flags: unknown }>
    >(prisma, {
      tenantId,
      reason: 'telephony_credentials_get',
      query: `
        SELECT system_flags
        FROM system_settings
        WHERE tenant_id = $1::uuid
        LIMIT 1
      `,
      values: [tenantId],
    });

    const row = Array.isArray(rows) && rows.length ? rows[0] : null;
    const systemFlagsObj = asObject(row?.system_flags);
    const telephony = asObject(systemFlagsObj?.telephony);

    if (!telephony || !telephony.isActive) {
      return NextResponse.json({
        credentials: null,
        message: 'Telephony not configured or inactive',
      });
    }

    const credentials = asObject(telephony.credentials);

    return NextResponse.json({
      credentials: credentials ? {
        UserCode: credentials.UserCode || null,
        OrganizationCode: credentials.OrganizationCode || null,
        // Widget credentials (if configured)
        username: credentials.username || null,
        password: credentials.password || null,
        domain: credentials.domain || null,
      } : null,
      provider: telephony.provider || null,
      isActive: Boolean(telephony.isActive),
    });

  } catch (error: unknown) {
    if (IS_PROD) console.error('[API] Error fetching telephony credentials');
    else console.error('[API] Error fetching telephony credentials:', error);
    const message = getErrorMessage(error);
    return NextResponse.json(
      { error: message || 'Internal server error' },
      { status: message.includes('Forbidden') ? 403 : 500 }
    );
  }
}

export const GET = shabbatGuard(GETHandler);
