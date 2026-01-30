/**
 * Integration API: Onboard Client
 * 
 * Webhook endpoint for external systems to automatically onboard new clients
 * Secured with API key authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { Client } from '../../../../types';
import { logIntegrationEvent } from '../../../../lib/audit';
import { generateInvitationToken, getBaseUrl } from '../../../../lib/utils';
import { getClientIpFromRequest, rateLimit } from '@/lib/server/rateLimit';
import { BILLING_PACKAGES } from '@/lib/billing/pricing';
import { createHash, timingSafeEqual } from 'crypto';
import prisma from '@/lib/prisma';
import { APIError, getOrgKeyOrThrow } from '@/lib/server/api-workspace';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

export const runtime = 'nodejs';

function isUuid(input: string): boolean {
    const s = String(input || '').trim();
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

function safeTimingEqual(a: string, b: string): boolean {
    const aa = Buffer.from(String(a ?? ''), 'utf8');
    const bb = Buffer.from(String(b ?? ''), 'utf8');
    if (aa.length !== bb.length) {
        const max = Math.max(aa.length, bb.length);
        const ap = Buffer.concat([aa, Buffer.alloc(Math.max(0, max - aa.length))]);
        const bp = Buffer.concat([bb, Buffer.alloc(Math.max(0, max - bb.length))]);
        timingSafeEqual(ap, bp);
        return false;
    }
    return timingSafeEqual(aa, bb);
}

function parseOrgApiKeyMap(raw: string | undefined | null): Record<string, string> | null {
    const v = String(raw || '').trim();
    if (!v) return null;
    try {
        const parsed = JSON.parse(v);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
        const out: Record<string, string> = {};
        for (const [k, val] of Object.entries(parsed as Record<string, unknown>)) {
            if (!k) continue;
            if (typeof val !== 'string' || String(val).trim().length === 0) continue;
            out[String(k).trim()] = String(val).trim();
        }
        return Object.keys(out).length > 0 ? out : null;
    } catch {
        return null;
    }
}

async function resolveOrganizationIdFromHeader(orgKey: string): Promise<string> {
    const key = String(orgKey || '').trim();
    if (!key) {
        throw new Error('Missing x-org-id header');
    }
    if (!isUuid(key)) {
        throw new Error('Invalid x-org-id header (expected UUID)');
    }
    return key;
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
    let idempotencyRowId: string | null = null;
    let organizationId: string | null = null;
    let idempotencyKey: string | null = null;
    try {
        const orgSlugFromHeader = getOrgKeyOrThrow(request);

        // 1. Verify API Key
        const ip = getClientIpFromRequest(request);

        const apiKey = String(request.headers.get('x-nexus-api-key') || '').trim();

        const rlIp = await rateLimit({
            namespace: 'integrations-onboard-client.ip',
            key: ip,
            limit: 60,
            windowMs: 60 * 1000,
        });
        if (!rlIp.ok) {
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
                        'Retry-After': String(rlIp.retryAfterSeconds),
                    },
                }
            );
        }

        async function updateIdempotency(params: {
            status: number;
            body: any;
            clientId?: string | null;
        }): Promise<void> {
            if (!idempotencyRowId || !organizationId) return;
            await prisma.integration_idempotency_keys.updateMany({
                where: {
                    id: String(idempotencyRowId),
                    organizationId: String(organizationId),
                },
                data: {
                    responseStatus: params.status,
                    responseBody: params.body,
                    clientId: params.clientId ?? null,
                    updatedAt: new Date(),
                },
            });
        }

        async function respondWithIdempotency(params: {
            status: number;
            body: any;
            clientId?: string | null;
        }) {
            await updateIdempotency(params);
            return NextResponse.json(params.body, { status: params.status });
        }

        try {
            organizationId = await resolveOrganizationIdFromHeader(orgSlugFromHeader);
        } catch {
            return NextResponse.json({ error: 'Invalid x-org-id header (expected UUID)' }, { status: 400 });
        }

        const orgApiKeyMap = parseOrgApiKeyMap(process.env.INTEGRATIONS_ONBOARD_CLIENT_API_KEYS);
        const fallbackGlobalKey = String(process.env.NEXUS_API_KEY || '').trim();
        const expectedApiKey = String(orgApiKeyMap ? (orgApiKeyMap[organizationId] || orgApiKeyMap['*'] || '') : fallbackGlobalKey).trim();

        if (!expectedApiKey || !apiKey || !safeTimingEqual(apiKey, expectedApiKey)) {
            await logIntegrationEvent('security.unauthorized', 'integration', {
                success: false,
                details: { reason: 'Invalid API key', organizationId },
                ipAddress: ip,
                userAgent: request.headers.get('user-agent') || 'unknown'
            });

            return NextResponse.json(
                { error: 'Unauthorized - Invalid API key' },
                { status: 401 }
            );
        }

        const rlKey = await rateLimit({
            namespace: 'integrations-onboard-client.key_org',
            key: `${organizationId}:${apiKey}`,
            limit: 20,
            windowMs: 60 * 1000,
        });
        if (!rlKey.ok) {
            await logIntegrationEvent('security.unauthorized', 'integration', {
                success: false,
                details: { reason: 'Rate limited', organizationId },
                ipAddress: ip,
                userAgent: request.headers.get('user-agent') || 'unknown'
            });

            return NextResponse.json(
                { error: 'Too many requests' },
                {
                    status: 429,
                    headers: {
                        'Retry-After': String(rlKey.retryAfterSeconds),
                    },
                }
            );
        }

        idempotencyKey = String(request.headers.get('x-idempotency-key') || request.headers.get('x-idempotency') || '').trim();
        if (!idempotencyKey) {
            return NextResponse.json({ error: 'Missing x-idempotency-key header' }, { status: 400 });
        }

        const rawBody = await request.text();
        let body: any;
        try {
            body = rawBody ? JSON.parse(rawBody) : {};
        } catch {
            return NextResponse.json(
                { error: 'Invalid JSON in request body' },
                { status: 400 }
            );
        }

        const requestHash = createHash('sha256').update(rawBody || '').digest('hex');

        const existingIdemRow = await prisma.integration_idempotency_keys.findFirst({
            where: {
                organizationId: String(organizationId),
                integration: 'onboard-client',
                idempotencyKey: String(idempotencyKey),
            },
            select: {
                id: true,
                requestHash: true,
                responseStatus: true,
                responseBody: true,
            },
        });
        if (existingIdemRow) {
            if (String(existingIdemRow.requestHash || '') !== requestHash) {
                return NextResponse.json(
                    { error: 'Idempotency key reuse with different payload' },
                    { status: 409 }
                );
            }

            const respStatus = (existingIdemRow.responseStatus ?? null) as number | null;
            const respBody = (existingIdemRow.responseBody ?? null) as any;
            if (typeof respStatus === 'number' && respBody) {
                return NextResponse.json(respBody, { status: respStatus });
            }

            return NextResponse.json(
                { error: 'Request is already being processed' },
                { status: 409, headers: { 'Retry-After': '2' } }
            );
        }

        try {
            const insertedIdem = await prisma.integration_idempotency_keys.create({
                data: {
                    organizationId: String(organizationId),
                    integration: 'onboard-client',
                    idempotencyKey: String(idempotencyKey),
                    requestHash,
                    responseStatus: null,
                    updatedAt: new Date(),
                },
                select: { id: true },
            });
            idempotencyRowId = String(insertedIdem.id);
        } catch (e: any) {
            const code = String(e?.code || '');
            if (code !== 'P2002') throw e;

            const racedRow = await prisma.integration_idempotency_keys.findFirst({
                where: {
                    organizationId: String(organizationId),
                    integration: 'onboard-client',
                    idempotencyKey: String(idempotencyKey),
                },
                select: {
                    id: true,
                    requestHash: true,
                    responseStatus: true,
                    responseBody: true,
                },
            });

            if (
                racedRow &&
                String(racedRow.requestHash || '') === requestHash &&
                typeof racedRow.responseStatus === 'number' &&
                racedRow.responseBody
            ) {
                return NextResponse.json(racedRow.responseBody as any, { status: Number(racedRow.responseStatus) });
            }

            return NextResponse.json(
                { error: 'Request is already being processed' },
                { status: 409, headers: { 'Retry-After': '2' } }
            );
        }

        // 2. Parse and validate request body
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
            const responseBody = {
                error: 'Missing required fields',
                required: ['companyName', 'contactName', 'email', 'phone', 'plan']
            };
            return respondWithIdempotency({ status: 400, body: responseBody });
        }

        const normalizedPlan = String(plan || '').trim();
        const allowedPlans = Object.keys(BILLING_PACKAGES);
        if (!allowedPlans.includes(normalizedPlan)) {
            const responseBody = { error: 'Invalid plan', allowedPlans };
            return respondWithIdempotency({ status: 400, body: responseBody });
        }

        // Validate email format (basic)
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            const responseBody = { error: 'Invalid email format' };
            return respondWithIdempotency({ status: 400, body: responseBody });
        }

        const normalizedEmail = String(email || '').trim().toLowerCase();
        const normalizedPhone = String(phone || '').trim();

        const existingClient = await prisma.nexusClient.findFirst({
            where: {
                organizationId: String(organizationId),
                OR: [{ email: normalizedEmail }, { phone: normalizedPhone }],
            },
            select: {
                id: true,
            },
        });

        if (existingClient?.id) {

            let invitationUrl: string | null = null;
            try {
                const latest = await prisma.system_invitation_links.findFirst({
                    where: {
                        client_id: String(existingClient.id),
                        is_active: true,
                        is_used: false,
                    },
                    select: { token: true },
                    orderBy: { created_at: 'desc' },
                });
                if (latest?.token) {
                    const baseUrl = getBaseUrl(request);
                    invitationUrl = `${baseUrl}/invite/${String(latest.token)}`;
                }
            } catch {
                // ignore
            }

            const responseBody = {
                success: true,
                clientId: existingClient.id,
                invitationUrl: invitationUrl || null,
                message: 'Client already exists'
            };

            await updateIdempotency({ status: 200, body: responseBody, clientId: String(existingClient.id) });

            await logIntegrationEvent('data.write', 'client', {
                resourceId: existingClient.id,
                details: {
                    createdBy: 'integration',
                    source: 'external_api',
                    companyName,
                    contactName,
                    hasInvitationLink: !!invitationUrl,
                    alreadyExisted: true,
                },
                ipAddress: ip,
                userAgent: request.headers.get('user-agent') || 'unknown'
            });

            return NextResponse.json(responseBody, { status: 200 });
        }

        // 3. Create client record
        const clientData: Omit<Client, 'id'> = {
            name: contactName,
            companyName,
            contactPerson: contactName,
            email: normalizedEmail,
            phone: normalizedPhone,
            package: normalizedPlan,
            status: 'Onboarding', // Start in onboarding status
            avatar: companyLogo || `https://ui-avatars.com/api/?name=${encodeURIComponent(companyName)}&background=6366f1&color=fff`,
            joinedAt: new Date().toISOString(),
            source: 'integration' // Mark as created via integration
        };

        let newClientId: string;
        try {
            const insertedClient = await prisma.nexusClient.create({
                data: {
                    organizationId: String(organizationId),
                    name: String(clientData.name || ''),
                    companyName: String(clientData.companyName || ''),
                    contactPerson: String(clientData.contactPerson || ''),
                    email: String(clientData.email || ''),
                    phone: String(clientData.phone || ''),
                    package: clientData.package ? String(clientData.package) : null,
                    status: String(clientData.status || 'Onboarding'),
                    avatar: clientData.avatar ? String(clientData.avatar) : null,
                    joinedAt: new Date(clientData.joinedAt),
                    source: clientData.source ? String(clientData.source) : null,
                },
                select: { id: true },
            });
            newClientId = String(insertedClient.id);
        } catch (e: any) {
            const code = String(e?.code || '');
            if (code !== 'P2002') throw e;

            const existing = await prisma.nexusClient.findFirst({
                where: {
                    organizationId: String(organizationId),
                    OR: [{ email: normalizedEmail }, { phone: normalizedPhone }],
                },
                select: { id: true },
            });

            if (existing?.id) {
                const responseBody = {
                    success: true,
                    clientId: String(existing.id),
                    invitationUrl: null,
                    message: 'Client already exists',
                };
                await updateIdempotency({ status: 200, body: responseBody, clientId: String(existing.id) });
                return NextResponse.json(responseBody, { status: 200 });
            }

            throw e;
        }

        const newClient: Client = {
            id: String(newClientId),
            name: contactName,
            companyName,
            avatar: clientData.avatar,
            package: clientData.package,
            status: 'Onboarding',
            contactPerson: contactName,
            email: normalizedEmail,
            phone: normalizedPhone,
            joinedAt: clientData.joinedAt,
            source: 'integration',
        } as any;

        // 4. Create automatic invitation link for the new client
        let invitationUrl: string | null = null;
        try {
            const token = await generateInvitationToken();
            if (!token || token.trim() === '') {
                throw new Error('Failed to generate invitation token');
            }
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration (temporary link)

            await prisma.system_invitation_links.create({
                data: {
                    token,
                    client_id: String(newClient.id),
                    created_by: null,
                    expires_at: expiresAt,
                    is_used: false,
                    is_active: true,
                    source: 'automatic',
                    ceo_name: contactName,
                    ceo_email: normalizedEmail,
                    ceo_phone: normalizedPhone,
                    company_name: companyName,
                    company_logo: companyLogo || null,
                    company_address: companyAddress || null,
                    company_website: companyWebsite || null,
                    additional_notes: additionalNotes || null,
                    metadata: {
                        createdVia: 'webhook',
                        webhookData: {
                            plan: normalizedPlan,
                            receivedAt: new Date().toISOString(),
                        },
                        organizationId,
                    },
                    updated_at: new Date(),
                },
            });

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

        const responseBody = {
            success: true,
            clientId: newClient.id,
            invitationUrl: invitationUrl || null,
            message: invitationUrl 
                ? 'Client created and invitation link generated automatically'
                : 'Client created (invitation link generation failed)'
        };

        if (idempotencyRowId) {
            await updateIdempotency({ status: 201, body: responseBody, clientId: String(newClient.id) });
        }

        // 6. Return success response with invitation link
        return NextResponse.json(responseBody, { status: 201 });

    } catch (error: any) {
        console.error('[API] Error onboarding client:', error);

        if (error instanceof APIError) {
            return NextResponse.json({ error: error.message || 'Forbidden' }, { status: error.status });
        }

        const responseBody = { error: 'Internal server error' };
        try {
            if (idempotencyRowId && organizationId) {
                await prisma.integration_idempotency_keys.updateMany({
                    where: {
                        id: String(idempotencyRowId),
                        organizationId: String(organizationId),
                    },
                    data: {
                        responseStatus: 500,
                        responseBody,
                        updatedAt: new Date(),
                    },
                });
            }
        } catch {
            // ignore
        }

        return NextResponse.json(responseBody, { status: 500 });
    }
}


export const POST = shabbatGuard(POSTHandler);
