/**
 * API Route: Telephony Integration Settings
 * GET /api/settings/telephony - Get telephony configuration for current tenant
 * PUT /api/settings/telephony - Update/save telephony configuration for current tenant
 * 
 * BYOC (Bring Your Own Carrier) - Each organization brings their own provider credentials
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, requirePermission } from '../../../../lib/auth';
import { getTenants } from '../../../../lib/db';
import { prisma } from '../../../../lib/prisma';

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
 * GET /api/settings/telephony
 * Get telephony configuration for current tenant
 */
export async function GET(request: NextRequest) {
    try {
        // 1. Authenticate user
        const user = await getAuthenticatedUser();
        
        // 2. Check permissions - only admins can view telephony settings
        await requirePermission('manage_system');
        
        // 3. Get tenant ID
        const tenantId = await getTenantId(request, user.email);
        if (!tenantId) {
            return NextResponse.json(
                { error: 'Tenant not found' },
                { status: 404 }
            );
        }
        
        // 4. Fetch telephony integrations from database
        const integrations = await prisma.systemTelephonyIntegration.findMany({
            where: {
                tenantId: tenantId
            },
            select: {
                id: true,
                provider: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
                // Don't expose credentials in GET - use separate endpoint if needed
            }
        });
        
        return NextResponse.json({
            tenantId,
            integrations: integrations.map(integration => ({
                id: integration.id,
                provider: integration.provider,
                isActive: integration.isActive,
                configured: true, // If record exists, it's configured
                createdAt: integration.createdAt,
                updatedAt: integration.updatedAt
            }))
        });
        
    } catch (error: any) {
        console.error('[API] Error fetching telephony settings:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: error.message?.includes('Forbidden') ? 403 : 500 }
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
export async function PUT(request: NextRequest) {
    try {
        // 1. Authenticate user
        const user = await getAuthenticatedUser();
        
        // 2. Check permissions - only admins can update telephony settings
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
        const { provider, credentials, isActive } = body;
        
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
        
        // 6. Check if integration already exists
        const existingIntegration = await prisma.systemTelephonyIntegration.findFirst({
            where: {
                tenantId: tenantId,
                provider: provider.toLowerCase()
            }
        });

        let integration;
        if (existingIntegration) {
            // Update existing integration
            integration = await prisma.systemTelephonyIntegration.update({
                where: {
                    id: existingIntegration.id
                },
                data: {
                    credentials: credentials,
                    isActive: isActive !== undefined ? isActive : true
                }
            });
        } else {
            // Create new integration
            integration = await prisma.systemTelephonyIntegration.create({
                data: {
                    tenantId: tenantId,
                    provider: provider.toLowerCase(),
                    credentials: credentials,
                    isActive: isActive !== undefined ? isActive : true
                }
            });
        }
        
        return NextResponse.json({
            success: true,
            message: 'Telephony configuration saved successfully',
            integration: {
                id: integration.id,
                provider: integration.provider,
                isActive: integration.isActive,
                tenantId: integration.tenantId
            }
        });
        
    } catch (error: any) {
        console.error('[API] Error saving telephony settings:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: error.message?.includes('Forbidden') ? 403 : 500 }
        );
    }
}

