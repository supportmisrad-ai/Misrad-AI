/**
 * API Route: Initiate Telephony Call
 * POST /api/telephony/call
 * 
 * Initiates a call using the organization's configured telephony provider
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, requirePermission } from '../../../../lib/auth';
import { getTenants } from '../../../../lib/db';
import { TelephonyService } from '../../../../lib/services/telephony';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
/**
 * Helper function to get tenantId from request/user
 */
async function getTenantId(request: NextRequest, userEmail: string | null): Promise<string | null> {
    const searchParams = request.nextUrl.searchParams;
    const providedTenantId = searchParams.get('tenantId');
    
    if (providedTenantId) {
        return providedTenantId;
    }
    
    // Try to get from subdomain
    const hostname = request.headers.get('host') || '';
    const subdomainMatch = hostname.match(/^([^.]+)\.nexus-os\.co$/);
    const subdomain = subdomainMatch ? subdomainMatch[1] : null;
    
    if (subdomain) {
        const tenants = await getTenants({ subdomain });
        if (tenants.length > 0) {
            return tenants[0].id;
        }
    }
    
    // Try to find by user's email (owner_email)
    if (userEmail) {
        const tenants = await getTenants({ ownerEmail: userEmail });
        if (tenants.length > 0) {
            return tenants[0].id;
        }
    }
    
    return null;
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
        // 1. Authenticate user
        const user = await getAuthenticatedUser();

        // 2. Authorization: only admins can initiate calls
        await requirePermission('manage_system');
        
        // 3. Get tenant ID
        const tenantId = await getTenantId(request, user.email);
        if (!tenantId) {
            return NextResponse.json(
                { error: 'Tenant not found' },
                { status: 404 }
            );
        }
        
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
        
    } catch (error: any) {
        console.error('[API] Error initiating call:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}


export const POST = shabbatGuard(POSTHandler);
