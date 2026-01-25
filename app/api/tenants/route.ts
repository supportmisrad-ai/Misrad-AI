/**
 * API Route: Tenants
 * 
 * Handles creation and retrieval of tenants (businesses)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, requirePermission, requireSuperAdmin } from '../../../lib/auth';
import { getTenants, createRecord } from '../../../lib/db';
import { Tenant } from '../../../types';
import { logAuditEvent, logIntegrationEvent } from '../../../lib/audit';
import { sendTenantInvitationEmail } from '../../../lib/email';
import { getBaseUrl } from '../../../lib/utils';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
/**
 * GET /api/tenants
 * 
 * Get tenants (filtered by ownerEmail if provided)
 * 
 * Query params:
 *   - ownerEmail: string (optional) - Filter by owner email
 *   - tenantId: string (optional) - Filter by tenant ID
 *   - status: string (optional) - Filter by status
 */
async function GETHandler(request: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        
        // Only super admins can list all tenants
        // Regular users can only see their own tenant
        const searchParams = request.nextUrl.searchParams;
        const ownerEmail = searchParams.get('ownerEmail');
        const tenantId = searchParams.get('tenantId');
        const status = searchParams.get('status');
        
        const filters: {
            tenantId?: string;
            status?: string;
            ownerEmail?: string;
        } = {};
        
        if (tenantId) {
            filters.tenantId = tenantId;
        }
        if (status) {
            filters.status = status;
        }
        
        // If ownerEmail is provided, allow it ONLY for super admins.
        // Otherwise, if user is not super admin, only show their own tenant.
        if (ownerEmail) {
            if (!user.isSuperAdmin) {
                const normalizedRequested = String(ownerEmail || '').trim().toLowerCase();
                const normalizedActual = String(user.email || '').trim().toLowerCase();
                if (!normalizedActual || normalizedRequested !== normalizedActual) {
                    return NextResponse.json(
                        { error: 'Forbidden - ownerEmail filter is not allowed for non-super-admin' },
                        { status: 403 }
                    );
                }
            }
            filters.ownerEmail = ownerEmail;
        } else if (!user.isSuperAdmin) {
            filters.ownerEmail = user.email || undefined;
        }
        
        const tenants = await getTenants(filters);
        
        await logAuditEvent('data.read', 'tenant', {
            resourceId: 'list',
            details: { 
                requestedBy: user.id,
                filters: filters,
                count: tenants.length
            }
        });
        
        return NextResponse.json({ tenants });
        
    } catch (error: any) {
        console.error('[API] Error fetching tenants:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: error.message?.includes('Unauthorized') ? 401 : 500 }
        );
    }
}

/**
 * POST /api/tenants
 * 
 * Create a new tenant (business)
 * 
 * Supports two authentication methods:
 * 1. API Key (for external systems): Header x-nexus-api-key
 * 2. Clerk Authentication (for SaaS Admin): Requires super admin
 * 
 * Body (JSON):
 *   For API Key (external systems):
 *   - name: string (required) - Business name
 *   - plan: string (required) - Plan name
 *   - contactEmail: string (required) - Contact email (becomes ownerEmail)
 *   
 *   For Clerk Auth (SaaS Admin):
 *   - name: string (required) - Business name
 *   - ownerEmail: string (required) - Owner email
 *   - subdomain: string (required) - Subdomain
 *   - plan: string (required) - Plan name
 *   - region: string (required) - Region (il-central, eu-west, us-east)
 *   - mrr: number (optional) - Monthly recurring revenue
 *   - modules: string[] (optional) - Enabled modules
 *   - status: string (optional) - Status (Provisioning, Active, Trial, Churned)
 * 
 * Response:
 *   - success: boolean
 *   - tenantId: string (UUID) - The ID of the newly created tenant
 *   - tenant: object (full tenant object, optional)
 */
async function POSTHandler(request: NextRequest) {
    try {
        // Check for API key authentication (for external systems)
        const apiKey = request.headers.get('x-nexus-api-key');
        const expectedApiKey = process.env.NEXUS_API_KEY;
        let isApiKeyAuth = false;
        let createdBy = 'system';

        if (apiKey && expectedApiKey && apiKey === expectedApiKey) {
            // API Key authentication - for external systems
            isApiKeyAuth = true;
            createdBy = 'integration';
        } else {
            // Clerk authentication - for SaaS Admin
            try {
                const user = await getAuthenticatedUser();
                try {
                    await requireSuperAdmin();
                } catch (e: any) {
                    return NextResponse.json(
                        { error: e?.message || 'Forbidden - Super Admin required' },
                        { status: 403 }
                    );
                }
                createdBy = user.id;
            } catch (authError: any) {
                // No valid authentication
                if (apiKey) {
                    // API key was provided but invalid
                    await logIntegrationEvent('security.unauthorized', 'integration', {
                        success: false,
                        details: { reason: 'Invalid API key' },
                        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
                        userAgent: request.headers.get('user-agent') || 'unknown'
                    });
                    return NextResponse.json(
                        { error: 'Unauthorized - Invalid API key' },
                        { status: 401 }
                    );
                }
                return NextResponse.json(
                    { error: 'Unauthorized - No valid authentication' },
                    { status: 401 }
                );
            }
        }

        const body = await request.json();

        // Different validation based on auth method
        if (isApiKeyAuth) {
            // API Key flow - simpler, for external systems
            if (!body.name || !body.plan || !body.contactEmail) {
                return NextResponse.json(
                    { 
                        error: 'Missing required fields',
                        required: ['name', 'plan', 'contactEmail']
                    },
                    { status: 400 }
                );
            }

            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(body.contactEmail)) {
                return NextResponse.json(
                    { error: 'Invalid email format' },
                    { status: 400 }
                );
            }

            // Generate subdomain from name
            const subdomain = String(body.name ?? '')
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '')
                .substring(0, 50); // Limit length

            // Create tenant data with defaults for API key flow
            const tenantData: Omit<Tenant, 'id'> = {
                name: body.name,
                ownerEmail: body.contactEmail, // contactEmail becomes ownerEmail
                subdomain: subdomain || `tenant-${Date.now()}`,
                plan: body.plan,
                region: body.region || 'il-central', // Default to Israel
                status: 'Provisioning',
                joinedAt: new Date().toISOString(),
                mrr: body.mrr || 0,
                usersCount: 0,
                logo: `https://ui-avatars.com/api/?name=${encodeURIComponent(body.name)}&background=6366f1&color=fff`,
                modules: body.modules || ['crm', 'finance', 'content', 'ai', 'team'],
                version: undefined,
                allowedEmails: [],
                requireApproval: false,
            };

            // Use Supabase admin client directly for API key requests
            const { createClient } = require('@supabase/supabase-js');
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
            const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

            if (!supabaseUrl || !supabaseServiceKey) {
                console.error('[API] Supabase not configured');
                return NextResponse.json(
                    { error: 'Server configuration error' },
                    { status: 500 }
                );
            }

            const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            });

            // Transform to database format
            const dbData = {
                name: tenantData.name,
                owner_email: tenantData.ownerEmail,
                subdomain: tenantData.subdomain,
                plan: tenantData.plan,
                region: tenantData.region,
                status: tenantData.status,
                joined_at: tenantData.joinedAt,
                mrr: tenantData.mrr,
                users_count: tenantData.usersCount,
                logo: tenantData.logo,
                modules: tenantData.modules,
                version: tenantData.version,
                allowed_emails: tenantData.allowedEmails,
                require_approval: tenantData.requireApproval,
            };

            // Insert directly using admin client
            const { data: insertedData, error: insertError } = await supabaseAdmin
                .from('nexus_tenants')
                .insert(dbData)
                .select()
                .single();

            if (insertError) {
                console.error('[API] Error creating tenant in Supabase:', insertError);
                return NextResponse.json(
                    { error: `Database error: ${insertError.message}` },
                    { status: 500 }
                );
            }

            // Transform back to Tenant interface
            const newTenant: Tenant = {
                id: insertedData.id,
                name: insertedData.name,
                ownerEmail: insertedData.owner_email,
                subdomain: insertedData.subdomain,
                plan: insertedData.plan,
                status: insertedData.status,
                joinedAt: insertedData.joined_at,
                mrr: insertedData.mrr || 0,
                usersCount: insertedData.users_count || 0,
                logo: insertedData.logo,
                modules: insertedData.modules || [],
                region: insertedData.region,
                version: insertedData.version,
                allowedEmails: insertedData.allowed_emails || [],
                requireApproval: insertedData.require_approval || false,
            };

            await logIntegrationEvent('data.write', 'tenant', {
                resourceId: newTenant.id,
                details: {
                    createdBy: 'integration',
                    source: 'external_api',
                    tenantName: newTenant.name,
                    ownerEmail: newTenant.ownerEmail
                },
                ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
                userAgent: request.headers.get('user-agent') || 'unknown'
            });

            // Return tenant ID (critical for next step)
            return NextResponse.json({
                success: true,
                tenantId: newTenant.id,
                tenant: newTenant
            }, { status: 201 });

        } else {
            // Clerk Auth flow - for SaaS Admin (existing logic)
            const user = await getAuthenticatedUser();

            try {
                await requireSuperAdmin();
            } catch (e: any) {
                return NextResponse.json(
                    { error: e?.message || 'Forbidden - Super Admin required' },
                    { status: 403 }
                );
            }
            
            // Validate required fields
            if (!body.name || !body.ownerEmail || !body.subdomain || !body.plan || !body.region) {
                return NextResponse.json(
                    { 
                        error: 'Missing required fields',
                        required: ['name', 'ownerEmail', 'subdomain', 'plan', 'region']
                    },
                    { status: 400 }
                );
            }
            
            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(body.ownerEmail)) {
                return NextResponse.json(
                    { error: 'Invalid email format' },
                    { status: 400 }
                );
            }
            
            // Validate region
            const validRegions = ['il-central', 'eu-west', 'us-east'];
            if (!validRegions.includes(body.region)) {
                return NextResponse.json(
                    { error: 'Invalid region. Must be one of: il-central, eu-west, us-east' },
                    { status: 400 }
                );
            }
            
            // Check if tenant with same subdomain already exists
            const existingTenants = await getTenants({ tenantId: body.subdomain });
            if (existingTenants.length > 0) {
                return NextResponse.json(
                    { error: 'Tenant with this subdomain already exists' },
                    { status: 409 }
                );
            }
            
            // Create tenant data
            const tenantData: Omit<Tenant, 'id'> = {
                name: body.name,
                ownerEmail: body.ownerEmail,
                subdomain: String(body.subdomain ?? '').toLowerCase().replace(/\s+/g, '-'),
                plan: body.plan,
                region: body.region,
                status: body.status || 'Provisioning',
                joinedAt: new Date().toISOString(),
                mrr: body.mrr || 0,
                usersCount: 0,
                logo: body.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(body.name)}&background=6366f1&color=fff`,
                modules: body.modules || ['crm', 'finance', 'content', 'ai', 'team'],
                version: body.version || null,
                allowedEmails: body.allowedEmails || [],
                requireApproval: body.requireApproval || false,
            };
            
            const newTenant = await createRecord<Tenant>('tenants', tenantData);
            
            await logAuditEvent('data.write', 'tenant', {
                resourceId: newTenant.id,
                details: { 
                    createdBy: user.id,
                    tenantName: newTenant.name,
                    ownerEmail: newTenant.ownerEmail
                }
            });

            // 7. Send invitation email automatically (if autoSendInvitation is true)
            const autoSendInvitation = body.autoSendInvitation !== false; // Default: true
            let invitationSent = false;
            let signupUrl: string | null = null;

            if (autoSendInvitation && newTenant.ownerEmail) {
                try {
                    const baseUrl = getBaseUrl(request);
                    
                    signupUrl = `${baseUrl}/sign-up?email=${encodeURIComponent(newTenant.ownerEmail)}&tenant=${encodeURIComponent(newTenant.id)}&invited=true`;

                    // Send email via Resend
                    const emailResult = await sendTenantInvitationEmail(
                        newTenant.ownerEmail,
                        newTenant.name,
                        signupUrl,
                        {
                            ownerName: null, // Can be extracted from invitation data if available
                            subdomain: newTenant.subdomain
                        }
                    );

                    if (emailResult.success) {
                        console.log('[Tenant Creation] Invitation email sent successfully:', {
                            tenantId: newTenant.id,
                            sentByUserId: user.id
                        });
                        invitationSent = true;
                    } else {
                        console.error('[Tenant Creation] Failed to send invitation email:', emailResult.error);
                        // Don't fail the request, but log the error
                    }

                    // Update tenant metadata to track invitation sent (even if email failed)
                    try {
                        // Use Supabase admin client if available, otherwise use regular client
                        const { createClient } = require('@supabase/supabase-js');
                        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
                        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
                        
                        if (supabaseUrl && supabaseServiceKey) {
                            const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
                                auth: {
                                    autoRefreshToken: false,
                                    persistSession: false
                                }
                            });
                            
                            const metadata = { 
                                invitationSent: invitationSent,
                                invitationSentAt: invitationSent ? new Date().toISOString() : null,
                                invitationSentBy: user.id,
                                invitationError: emailResult.error || null
                            };
                            await supabaseAdmin
                                .from('nexus_tenants')
                                .update({ metadata })
                                .eq('id', newTenant.id);
                        }
                    } catch (metadataError) {
                        console.error('[API] Error updating tenant metadata:', metadataError);
                        // Don't fail the request if metadata update fails
                    }
                } catch (emailError: any) {
                    console.error('[API] Error auto-sending invitation email:', emailError);
                    // Don't fail the request if email sending fails
                }
            }
            
            return NextResponse.json({ 
                success: true,
                tenantId: newTenant.id,
                tenant: newTenant,
                invitationSent,
                signupUrl // Return URL for manual sending if auto-send failed
            }, { status: 201 });
        }
        
    } catch (error: any) {
        console.error('[API] Error creating tenant:', error);
        
        // Handle JSON parsing errors
        if (error instanceof SyntaxError || error.message?.includes('JSON')) {
            return NextResponse.json(
                { error: 'Invalid JSON in request body' },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: error.message?.includes('Forbidden') ? 403 : 500 }
        );
    }
}


export const GET = shabbatGuard(GETHandler);

export const POST = shabbatGuard(POSTHandler);
