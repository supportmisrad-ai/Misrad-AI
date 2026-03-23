/**
 * API Route: Initiate Telephony Call
 * POST /api/telephony/call
 * 
 * Initiates a call using the organization's configured telephony provider
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, isTenantAdmin } from '@/lib/auth';
import { TelephonyService } from '@/lib/services/telephony';
import { getWorkspaceOrThrow } from '@/lib/server/api-workspace';
import { getErrorMessage } from '@/lib/server/workspace-access/utils';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

const IS_PROD = process.env.NODE_ENV === 'production';

async function requireTelephonyAccess(): Promise<void> {
    const user = await getAuthenticatedUser();
    if (user.isSuperAdmin) return;
    const isAdmin = await isTenantAdmin();
    if (isAdmin) return;
    throw new Error('Forbidden - Missing permission: manage telephony settings');
}

/**
 * POST /api/telephony/call
 * Initiate a call via telephony service
 * 
 * Body (JSON):
 *   - to: string (required) - Phone number to call to (destination)
 *   - from: string (required) - Phone number to call from (source/caller)
 */
async function POSTHandler(request: NextRequest) {
    try {
        // 1. Authenticate + authorise (superAdmin OR tenantAdmin/CEO)
        await requireTelephonyAccess();

        // 2. Resolve workspace
        const { workspace } = await getWorkspaceOrThrow(request);
        const tenantId = String(workspace.id);
        
        // 4. Parse request body
        const body = await request.json();
        const { to, from } = body;
        
        // 5. Validate input
        if (!to || !from) {
            return NextResponse.json(
                { error: 'Missing required fields: to and from phone numbers' },
                { status: 400 }
            );
        }
        
        // 6. Initiate call via TelephonyService
        const result = await TelephonyService.initiateCall(from, to, tenantId);
        
        if (!result.success) {
            return NextResponse.json(
                { error: result.error || 'Failed to initiate call' },
                { status: 500 }
            );
        }
        
        return NextResponse.json({
            success: true,
            message: 'Call initiated successfully',
            callId: result.callId,
            sessionId: result.sessionId
        });
        
    } catch (error: unknown) {
        if (IS_PROD) console.error('[API] Error initiating call');
        else console.error('[API] Error initiating call:', error);
        const safeMsg = 'Internal server error';
        return NextResponse.json(
            { error: IS_PROD ? safeMsg : getErrorMessage(error) || safeMsg },
            { status: 500 }
        );
    }
}


export const POST = shabbatGuard(POSTHandler);
