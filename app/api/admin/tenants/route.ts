/**
 * API Route: Tenants
 * 
 * Handles creation and retrieval of tenants (businesses)
 */

import { NextRequest } from 'next/server';
import { getAuthenticatedUser, requireSuperAdmin } from '@/lib/auth';
import { ModuleId, Tenant } from '@/types';
import { logAuditEvent } from '@/lib/audit';
import { sendTenantInvitationEmail } from '@/lib/email';
import { getBaseUrl } from '@/lib/utils';
import prisma from '@/lib/prisma';
import { apiError, apiErrorCompat, apiSuccessCompat } from '@/lib/server/api-response';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

function asObject(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object') return null;
    if (Array.isArray(value)) return null;
    return value as Record<string, unknown>;
}

function getString(obj: Record<string, unknown>, key: string, fallback = ''): string {
    const v = obj[key];
    return typeof v === 'string' ? v : v == null ? fallback : String(v);
}

function getNullableString(obj: Record<string, unknown>, key: string): string | null {
    const v = obj[key];
    if (v == null) return null;
    return typeof v === 'string' ? v : String(v);
}

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    const obj = asObject(error);
    const msg = obj ? obj['message'] : undefined;
    return typeof msg === 'string' ? msg : '';
}

function isTenantRegion(value: unknown): value is NonNullable<Tenant['region']> {
    return value === 'il-central' || value === 'eu-west' || value === 'us-east';
}

function coerceTenantRegion(value: unknown, fallback: Tenant['region']): Tenant['region'] {
    return isTenantRegion(value) ? value : fallback;
}

function isTenantStatus(value: unknown): value is Tenant['status'] {
    return value === 'Active' || value === 'Trial' || value === 'Churned' || value === 'Provisioning';
}

function coerceTenantStatus(value: unknown, fallback: Tenant['status']): Tenant['status'] {
    return isTenantStatus(value) ? value : fallback;
}

function isModuleId(value: unknown): value is ModuleId {
    return (
        value === 'crm' ||
        value === 'finance' ||
        value === 'ai' ||
        value === 'team' ||
        value === 'content' ||
        value === 'assets' ||
        value === 'operations'
    );
}

function coerceModules(value: unknown, fallback: ModuleId[]): ModuleId[] {
    if (!Array.isArray(value)) return fallback;
    return value.map((x) => String(x)).filter(isModuleId);
}

function mapTenantRow(row: unknown): Tenant {
    const obj = asObject(row);
    return {
        id: obj ? getString(obj, 'id') : '',
        name: obj ? getString(obj, 'name') : '',
        ownerEmail: obj ? (getNullableString(obj, 'ownerEmail') ?? getNullableString(obj, 'owner_email') ?? '') : '',
        subdomain: obj ? (getNullableString(obj, 'subdomain') ?? '') : '',
        plan: obj ? (getNullableString(obj, 'plan') ?? '') : '',
        status: coerceTenantStatus(obj ? getNullableString(obj, 'status') : null, 'Provisioning'),
        joinedAt: obj ? (getNullableString(obj, 'joinedAt') ?? getNullableString(obj, 'joined_at') ?? '') : '',
        mrr: Number(obj ? (obj['mrr'] ?? 0) : 0) || 0,
        usersCount: Number(obj ? (obj['usersCount'] ?? obj['users_count'] ?? 0) : 0) || 0,
        logo: obj ? (getNullableString(obj, 'logo') ?? undefined) : undefined,
        modules: coerceModules(obj ? obj['modules'] : null, []),
        region: coerceTenantRegion(obj ? getNullableString(obj, 'region') : null, undefined),
        version: obj ? (getNullableString(obj, 'version') ?? undefined) : undefined,
        allowedEmails: (() => {
            const v = obj ? (obj['allowedEmails'] ?? obj['allowed_emails']) : null;
            return Array.isArray(v) ? v.map((x) => String(x)) : [];
        })(),
        requireApproval: Boolean(obj ? (obj['requireApproval'] ?? obj['require_approval']) : false),
    } as Tenant;
}

async function selectTenants(params: {
    filters: { tenantId?: string; status?: string; ownerEmail?: string; subdomain?: string };
}): Promise<Tenant[]> {
    const where: any = {};
    if (params.filters.tenantId) where.id = String(params.filters.tenantId);
    if (params.filters.status) where.status = String(params.filters.status);
    if (params.filters.ownerEmail) where.ownerEmail = String(params.filters.ownerEmail);
    if (params.filters.subdomain) where.subdomain = String(params.filters.subdomain);

    const rows = await prisma.nexusTenant.findMany({
        where,
        orderBy: { createdAt: 'desc' },
    });

    const mapped = (Array.isArray(rows) ? rows : []).map((r: any) =>
        mapTenantRow({
            ...r,
            joinedAt: r?.joinedAt ? new Date(r.joinedAt).toISOString() : null,
            mrr: r?.mrr == null ? 0 : Number(r.mrr),
        })
    );

    return mapped;
}

/**
 * GET /api/admin/tenants
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
        await requireSuperAdmin();
        const user = await getAuthenticatedUser();

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
        if (ownerEmail) {
            filters.ownerEmail = ownerEmail;
        }

        const tenants = await selectTenants({ filters });

        await logAuditEvent('data.read', 'tenant', {
            resourceId: 'list',
            details: {
                requestedBy: user.id,
                filters,
                count: tenants.length,
            },
        });

        return apiSuccessCompat({ tenants });
    } catch (error: unknown) {
        console.error('[API] Error fetching tenants:', error);
        const msg = getErrorMessage(error);
        return apiError(error, { status: msg.includes('Unauthorized') ? 401 : msg.includes('Forbidden') ? 403 : 500 });
    }
}

/**
 * POST /api/admin/tenants
 * 
 * Create a new tenant (business)
 */
async function POSTHandler(request: NextRequest) {
    try {
        await requireSuperAdmin();
        const user = await getAuthenticatedUser();

        const body = (await request.json()) as unknown;
        const bodyObj = asObject(body) ?? {};

        const name = getString(bodyObj, 'name');
        const ownerEmail = getString(bodyObj, 'ownerEmail');
        const subdomainInput = getString(bodyObj, 'subdomain');
        const plan = getString(bodyObj, 'plan');
        const region = getString(bodyObj, 'region');

        if (!name || !ownerEmail || !subdomainInput || !plan || !region) {
            return apiErrorCompat('Missing required fields', {
                status: 400,
                message: 'Missing required fields',
                extra: { required: ['name', 'ownerEmail', 'subdomain', 'plan', 'region'] },
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(ownerEmail)) {
            return apiError('Invalid email format', { status: 400 });
        }

        const validRegions = ['il-central', 'eu-west', 'us-east'];
        if (!validRegions.includes(region)) {
            return apiError('Invalid region. Must be one of: il-central, eu-west, us-east', { status: 400 });
        }

        const requestedStatus = getString(bodyObj, 'status');
        const validStatuses = ['Provisioning', 'Active', 'Trial', 'Churned'];
        if (requestedStatus && !validStatuses.includes(requestedStatus)) {
            return apiError('Invalid status. Must be one of: Provisioning, Active, Trial, Churned', { status: 400 });
        }

        const normalizedSubdomain = String(subdomainInput ?? '').toLowerCase().replace(/\s+/g, '-');
        const existing = await prisma.nexusTenant.findUnique({
            where: { subdomain: normalizedSubdomain },
            select: { id: true },
        });
        if (existing?.id) return apiError('Tenant with this subdomain already exists', { status: 409 });

        const tenantData: Omit<Tenant, 'id'> = {
            name,
            ownerEmail,
            subdomain: String(subdomainInput ?? '').toLowerCase().replace(/\s+/g, '-'),
            plan,
            region: coerceTenantRegion(region, undefined),
            status: coerceTenantStatus(requestedStatus, 'Provisioning'),
            joinedAt: new Date().toISOString(),
            mrr: Number(bodyObj['mrr'] ?? 0) || 0,
            usersCount: 0,
            logo: getString(bodyObj, 'logo') || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366f1&color=fff`,
            modules: coerceModules(bodyObj['modules'], ['crm', 'finance', 'content', 'ai', 'team']),
            version: bodyObj['version'] == null ? undefined : String(bodyObj['version']),
            allowedEmails: Array.isArray(bodyObj['allowedEmails']) ? (bodyObj['allowedEmails'] as unknown[]).map((x) => String(x)) : [],
            requireApproval: Boolean(bodyObj['requireApproval'] ?? false),
        };

        let inserted: any;
        try {
            inserted = await prisma.nexusTenant.create({
                data: {
                    name: tenantData.name,
                    ownerEmail: tenantData.ownerEmail,
                    subdomain: tenantData.subdomain,
                    plan: tenantData.plan,
                    region: tenantData.region ?? null,
                    status: tenantData.status ?? null,
                    joinedAt: new Date(tenantData.joinedAt),
                    mrr: tenantData.mrr,
                    usersCount: tenantData.usersCount,
                    logo: tenantData.logo ?? null,
                    modules: tenantData.modules,
                    version: tenantData.version ?? null,
                    allowedEmails: tenantData.allowedEmails,
                    requireApproval: tenantData.requireApproval,
                },
            });
        } catch (e: any) {
            if (String(e?.code || '') === 'P2002') {
                return apiError('Tenant with this subdomain already exists', { status: 409 });
            }
            throw e;
        }

        const newTenant = mapTenantRow({
            ...inserted,
            joinedAt: inserted?.joinedAt ? new Date(inserted.joinedAt).toISOString() : null,
            mrr: inserted?.mrr == null ? 0 : Number(inserted.mrr),
        });

        await logAuditEvent('data.write', 'tenant', {
            resourceId: newTenant.id,
            details: {
                createdBy: user.id,
                tenantName: newTenant.name,
                ownerEmail: newTenant.ownerEmail,
            },
        });

        const autoSendInvitation = bodyObj['autoSendInvitation'] !== false;
        let invitationSent = false;
        let signupUrl: string | null = null;

        if (autoSendInvitation && newTenant.ownerEmail) {
            try {
                const baseUrl = getBaseUrl(request);
                signupUrl = `${baseUrl}/login?mode=sign-up&email=${encodeURIComponent(newTenant.ownerEmail)}&tenant=${encodeURIComponent(newTenant.id)}&invited=true`;

                const emailResult = await sendTenantInvitationEmail(newTenant.ownerEmail, newTenant.name, signupUrl, {
                    ownerName: null,
                    subdomain: newTenant.subdomain,
                });

                invitationSent = Boolean(emailResult.success);

                try {
                    const metadata = {
                        invitationSent,
                        invitationSentAt: invitationSent ? new Date().toISOString() : null,
                        invitationSentBy: user.id,
                        invitationError: emailResult.error || null,
                    };

                    try {
                        await prisma.$executeRaw`update nexus_tenants set metadata = ${metadata as any} where id = ${newTenant.id}::uuid`;
                    } catch {
                        // ignore
                    }
                } catch {
                    // ignore
                }
            } catch (emailError: unknown) {
                console.error('[API] Error auto-sending invitation email:', emailError);
            }
        }

        return apiSuccessCompat(
            {
                tenantId: newTenant.id,
                tenant: newTenant,
                invitationSent,
                signupUrl,
            },
            { status: 201 }
        );
    } catch (error: unknown) {
        console.error('[API] Error creating tenant:', error);
        const msg = getErrorMessage(error);

        if (error instanceof SyntaxError || msg.includes('JSON')) {
            return apiError('Invalid JSON in request body', { status: 400 });
        }

        return apiError(error, { status: msg.includes('Forbidden') ? 403 : 500 });
    }
}

export const GET = shabbatGuard(GETHandler);

export const POST = shabbatGuard(POSTHandler);
