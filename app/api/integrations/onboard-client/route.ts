/**
 * Integration API: Onboard Client
 * 
 * Webhook endpoint for external systems to automatically onboard new clients
 * Secured with API key authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRecord } from '../../../../lib/db';
import { supabase } from '../../../../lib/supabase';
import { Client } from '../../../../types';
import { logIntegrationEvent } from '../../../../lib/audit';
import { generateInvitationToken, getBaseUrl } from '../../../../lib/utils';
import { getClientIpFromRequest, rateLimit } from '@/lib/server/rateLimit';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
async function resolveOrganizationIdFromHeader(orgKey: string): Promise<string> {
    if (!supabase) {
        throw new Error('Database not configured');
    }

    const key = String(orgKey || '').trim();
    if (!key) {
        throw new Error('Missing x-org-id header');
    }

    let org: any = null;

    const bySlug = await supabase
        .from('organizations')
        .select('id, slug')
        .eq('slug', key)
        .maybeSingle();

    org = bySlug.data;

    if (!org?.id && bySlug.error?.message) {
        const msg = String(bySlug.error.message).toLowerCase();
        const isMissingSlugColumn = msg.includes('column') && msg.includes('slug');
        if (!isMissingSlugColumn) {
            console.warn('[integrations/onboard-client] organization slug lookup failed:', bySlug.error);
        }
    }

    if (!org?.id) {
        const byId = await supabase
            .from('organizations')
            .select('id')
            .eq('id', key)
            .maybeSingle();

        org = byId.data;
    }

    if (!org?.id) {
        throw new Error('Organization not found');
    }

    return String(org.id);
}

/**
 * POST /api/integrations/onboard-client
 * 
 * Creates a new client from external system (webhook/automation)
 * 
 * Headers:
 *   - x-nexus-api-key: Secret API key (must match NEXUS_API_KEY env var)
 * 
 * Body (JSON):
 *   - companyName: string (required)
 *   - contactName: string (required)
 *   - email: string (required)
 *   - phone: string (required)
 *   - plan: string (required)
 * 
 * Response:
 *   - success: boolean
 *   - clientId: string
 */
async function POSTHandler(request: NextRequest) {
    try {
        const orgSlugFromHeader = request.headers.get('x-org-id') || request.headers.get('x-orgid');
        if (!orgSlugFromHeader) {
            return NextResponse.json({ error: 'Missing x-org-id header' }, { status: 400 });
        }

        const organizationId = await resolveOrganizationIdFromHeader(orgSlugFromHeader);

        // 1. Verify API Key
        const apiKey = request.headers.get('x-nexus-api-key');
        const expectedApiKey = process.env.NEXUS_API_KEY;

        const ip = getClientIpFromRequest(request);

        if (!expectedApiKey) {
            console.error('[API] NEXUS_API_KEY environment variable is not set');
            return NextResponse.json(
                { error: 'Server configuration error' },
                { status: 500 }
            );
        }

        const rl = await rateLimit({
            namespace: 'integrations-onboard-client',
            key: ip,
            limit: 20,
            windowMs: 60 * 1000,
        });
        if (!rl.ok) {
            await logIntegrationEvent('security.unauthorized', 'integration', {
                success: false,
                details: { reason: 'Rate limited' },
                ipAddress: ip,
                userAgent: request.headers.get('user-agent') || 'unknown'
            });

            return NextResponse.json(
                { error: 'Too many requests' },
                {
                    status: 429,
                    headers: {
                        'Retry-After': String(rl.retryAfterSeconds),
                    },
                }
            );
        }

        if (!apiKey || apiKey !== expectedApiKey) {
            await logIntegrationEvent('security.unauthorized', 'integration', {
                success: false,
                details: { reason: 'Invalid API key' },
                ipAddress: ip,
                userAgent: request.headers.get('user-agent') || 'unknown'
            });

            return NextResponse.json(
                { error: 'Unauthorized - Invalid API key' },
                { status: 401 }
            );
        }

        // 2. Parse and validate request body
        const body = await request.json();
        const { 
            companyName, 
            contactName, 
            email, 
            phone, 
            plan,
            companyLogo, // Optional: logo from leads system
            companyAddress, // Optional
            companyWebsite, // Optional
            additionalNotes // Optional
        } = body;

        // Validate required fields
        if (!companyName || !contactName || !email || !phone || !plan) {
            return NextResponse.json(
                { 
                    error: 'Missing required fields',
                    required: ['companyName', 'contactName', 'email', 'phone', 'plan']
                },
                { status: 400 }
            );
        }

        // Validate email format (basic)
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json(
                { error: 'Invalid email format' },
                { status: 400 }
            );
        }

        // 3. Create client record
        const clientData: Omit<Client, 'id'> = {
            name: contactName,
            companyName,
            contactPerson: contactName,
            email,
            phone,
            package: plan,
            status: 'Onboarding', // Start in onboarding status
            avatar: companyLogo || `https://ui-avatars.com/api/?name=${encodeURIComponent(companyName)}&background=6366f1&color=fff`,
            joinedAt: new Date().toISOString(),
            source: 'integration' // Mark as created via integration
        };

        const newClient = await createRecord<Client>('clients', clientData, { organizationId });

        // 4. Create automatic invitation link for the new client
        let invitationUrl: string | null = null;
        try {
            const token = await generateInvitationToken();
            if (!token || token.trim() === '') {
                throw new Error('Failed to generate invitation token');
            }
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration (temporary link)

            const invitationData = {
                token,
                client_id: newClient.id,
                created_by: null, // System-created
                expires_at: expiresAt.toISOString(),
                is_used: false,
                is_active: true,
                source: 'automatic',
                // Pre-fill with data from webhook if available
                ceo_name: contactName,
                ceo_email: email,
                ceo_phone: phone,
                company_name: companyName,
                company_logo: companyLogo || null,
                company_address: companyAddress || null,
                company_website: companyWebsite || null,
                additional_notes: additionalNotes || null,
                metadata: {
                    createdVia: 'webhook',
                    webhookData: {
                        plan,
                        receivedAt: new Date().toISOString()
                    },
                    organizationId,
                }
            };

            // Use Supabase directly since createRecord doesn't support invitation_links
            if (!supabase) {
                throw new Error('Database not configured');
            }
            const { data: invitation, error: inviteError } = await supabase
                .from('system_invitation_links')
                .insert(invitationData)
                .select()
                .single();
            
            if (inviteError || !invitation) {
                throw new Error(inviteError?.message || 'Failed to create invitation');
            }

            // Generate invitation URL
            const baseUrl = getBaseUrl(request);
            invitationUrl = `${baseUrl}/invite/${token}`;

            console.log('[API] Created automatic invitation link for client:', newClient.id);
        } catch (invitationError: any) {
            console.error('[API] Error creating automatic invitation link:', invitationError);
            // Don't fail the request if invitation creation fails
        }

        // 5. Log audit event
        await logIntegrationEvent('data.write', 'client', {
            resourceId: newClient.id,
            details: {
                createdBy: 'integration',
                source: 'external_api',
                companyName,
                contactName,
                hasInvitationLink: !!invitationUrl
            },
            ipAddress: ip,
            userAgent: request.headers.get('user-agent') || 'unknown'
        });

        // 6. Return success response with invitation link
        return NextResponse.json({
            success: true,
            clientId: newClient.id,
            invitationUrl: invitationUrl || null,
            message: invitationUrl 
                ? 'Client created and invitation link generated automatically'
                : 'Client created (invitation link generation failed)'
        }, { status: 201 });

    } catch (error: any) {
        console.error('[API] Error onboarding client:', error);

        // Handle JSON parsing errors
        if (error instanceof SyntaxError || error.message?.includes('JSON')) {
            return NextResponse.json(
                { error: 'Invalid JSON in request body' },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}


export const POST = shabbatGuard(POSTHandler);
