import { asObject, getErrorMessage as getUnknownErrorMessage } from '@/lib/shared/unknown';
/**
 * API Route: Tenant by ID
 * 
 * Handles update and deletion of specific tenants
 */

import { NextRequest } from 'next/server';
import { getAuthenticatedUser, requireSuperAdmin } from '@/lib/auth';
import { Tenant } from '@/types';
import { logAuditEvent } from '@/lib/audit';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { apiError, apiSuccessCompat } from '@/lib/server/api-response';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

const IS_PROD = process.env.NODE_ENV === 'production';

type UnknownRecord = Record<string, unknown>;
type NexusTenantUpdateArgs = NonNullable<Parameters<typeof prisma.nexusTenant.update>[0]>;
type NexusTenantUpdateData = NexusTenantUpdateArgs['data'];


function asString(value: unknown): string {
    return typeof value === 'string' ? value : '';
}


function mapTenantRow(row: unknown): Tenant {
    const obj = asObject(row);
    return {
        id: String(obj?.id ?? ''),
        name: obj?.name as Tenant['name'],
        ownerEmail: (obj?.ownerEmail ?? obj?.owner_email) as Tenant['ownerEmail'],
        subdomain: obj?.subdomain as Tenant['subdomain'],
        plan: obj?.plan as Tenant['plan'],
        status: obj?.status as Tenant['status'],
        joinedAt: (obj?.joinedAt ?? obj?.joined_at) as Tenant['joinedAt'],
        mrr: Number(obj?.mrr ?? 0),
        usersCount: Number((obj?.usersCount ?? obj?.users_count) ?? 0),
        logo: obj?.logo as Tenant['logo'],
        modules: (obj?.modules as Tenant['modules']) || [],
        region: obj?.region as Tenant['region'],
        version: obj?.version as Tenant['version'],
        allowedEmails: ((obj?.allowedEmails ?? obj?.allowed_emails) as Tenant['allowedEmails']) || [],
        requireApproval: Boolean((obj?.requireApproval ?? obj?.require_approval) ?? false),
    } as Tenant;
}

async function loadTenantById(params: { tenantId: string }): Promise<Tenant | null> {
    const row = await prisma.nexusTenant.findUnique({
        where: { id: String(params.tenantId) },
    });
    if (!row) return null;
    return mapTenantRow({
        ...row,
        joinedAt: row?.joinedAt ? new Date(row.joinedAt).toISOString() : null,
        mrr: row?.mrr == null ? 0 : Number(row.mrr),
    });
}

function buildTenantDbUpdates(updateData: Partial<Tenant>): NexusTenantUpdateData {
    const dbUpdates: NexusTenantUpdateData = {};

    if (updateData.name !== undefined) dbUpdates.name = updateData.name;
    if (updateData.ownerEmail !== undefined) dbUpdates.ownerEmail = updateData.ownerEmail;
    if (updateData.subdomain !== undefined) dbUpdates.subdomain = updateData.subdomain;
    if (updateData.plan !== undefined) dbUpdates.plan = updateData.plan;
    if (updateData.region !== undefined) dbUpdates.region = updateData.region;
    if (updateData.status !== undefined) dbUpdates.status = updateData.status;
    if (updateData.mrr !== undefined) dbUpdates.mrr = updateData.mrr;
    if (updateData.usersCount !== undefined) dbUpdates.usersCount = updateData.usersCount;
    if (updateData.logo !== undefined) dbUpdates.logo = updateData.logo;
    if (updateData.modules !== undefined) dbUpdates.modules = updateData.modules;
    if (updateData.version !== undefined) dbUpdates.version = updateData.version;
    if (updateData.allowedEmails !== undefined) dbUpdates.allowedEmails = updateData.allowedEmails;
    if (updateData.requireApproval !== undefined) dbUpdates.requireApproval = updateData.requireApproval;

    return dbUpdates;
}

async function PATCHHandler(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        await requireSuperAdmin();
        const user = await getAuthenticatedUser();

        const { id: tenantId } = params;
        if (!tenantId) {
            return apiError('Tenant ID is required', { status: 400 });
        }

        const existingTenant = await loadTenantById({ tenantId });
        if (!existingTenant) {
            return apiError('Tenant not found', { status: 404 });
        }

        const body: unknown = await request.json();
        const bodyObj = asObject(body) ?? {};

        const ownerEmail = bodyObj.ownerEmail;
        if (typeof ownerEmail === 'string' && ownerEmail) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(ownerEmail)) {
                return apiError('Invalid email format', { status: 400 });
            }
        }

        const region = bodyObj.region;
        if (typeof region === 'string' && region) {
            const validRegions = ['il-central', 'eu-west', 'us-east'];
            if (!validRegions.includes(region)) {
                return apiError('Invalid region. Must be one of: il-central, eu-west, us-east', { status: 400 });
            }
        }

        const status = bodyObj.status;
        if (typeof status === 'string' && status) {
            const validStatuses = ['Provisioning', 'Active', 'Trial', 'Churned'];
            if (!validStatuses.includes(status)) {
                return apiError('Invalid status. Must be one of: Provisioning, Active, Trial, Churned', { status: 400 });
            }
        }

        const updateData: Partial<Tenant> = {};

        if (bodyObj.name !== undefined) updateData.name = bodyObj.name as Tenant['name'];
        if (bodyObj.ownerEmail !== undefined) updateData.ownerEmail = bodyObj.ownerEmail as Tenant['ownerEmail'];
        if (bodyObj.subdomain !== undefined)
            updateData.subdomain = asString(bodyObj.subdomain).toLowerCase().replace(/\s+/g, '-');
        if (bodyObj.plan !== undefined) updateData.plan = bodyObj.plan as Tenant['plan'];
        if (bodyObj.region !== undefined) updateData.region = bodyObj.region as Tenant['region'];
        if (bodyObj.status !== undefined) updateData.status = bodyObj.status as Tenant['status'];
        if (bodyObj.mrr !== undefined) updateData.mrr = bodyObj.mrr as Tenant['mrr'];
        if (bodyObj.modules !== undefined) updateData.modules = bodyObj.modules as Tenant['modules'];
        if (bodyObj.version !== undefined) updateData.version = bodyObj.version as Tenant['version'];
        if (bodyObj.allowedEmails !== undefined) updateData.allowedEmails = bodyObj.allowedEmails as Tenant['allowedEmails'];
        if (bodyObj.requireApproval !== undefined) updateData.requireApproval = bodyObj.requireApproval as Tenant['requireApproval'];
        if (bodyObj.logo !== undefined) updateData.logo = bodyObj.logo as Tenant['logo'];
        if (bodyObj.usersCount !== undefined) updateData.usersCount = bodyObj.usersCount as Tenant['usersCount'];

        const dbUpdates = buildTenantDbUpdates(updateData);
        let updatedRow: Awaited<ReturnType<typeof prisma.nexusTenant.update>>;
        try {
            updatedRow = await prisma.nexusTenant.update({
                where: { id: String(tenantId) },
                data: dbUpdates,
            });
        } catch (e: unknown) {
            if (e instanceof Prisma.PrismaClientKnownRequestError && String(e.code || '') === 'P2002') {
                return apiError('Tenant with this subdomain already exists', { status: 409 });
            }
            throw e;
        }

        const updatedTenant = mapTenantRow({
            ...updatedRow,
            joinedAt: updatedRow?.joinedAt ? new Date(updatedRow.joinedAt).toISOString() : null,
            mrr: updatedRow?.mrr == null ? 0 : Number(updatedRow.mrr),
        });

        await logAuditEvent('data.write', 'tenant', {
            resourceId: tenantId,
            details: {
                updatedBy: user.id,
                tenantName: updatedTenant.name,
                changes: Object.keys(updateData),
            },
        });

        return apiSuccessCompat({ tenant: updatedTenant });
    } catch (error: unknown) {
        if (IS_PROD) console.error('[API] Error updating tenant');
        else console.error('[API] Error updating tenant:', error);
        const msg = getUnknownErrorMessage(error);
        const safeMsg = 'שגיאה בעדכון טננט';
        return apiError(IS_PROD ? safeMsg : error, {
            status: msg.includes('Forbidden') ? 403 : 500,
            message: IS_PROD ? safeMsg : msg || safeMsg,
        });
    }
}

async function DELETEHandler(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        await requireSuperAdmin();
        const user = await getAuthenticatedUser();

        const { id: tenantId } = params;
        if (!tenantId) {
            return apiError('Tenant ID is required', { status: 400 });
        }

        const existingTenant = await loadTenantById({ tenantId });
        if (!existingTenant) {
            return apiError('Tenant not found', { status: 404 });
        }

        const tenantName = existingTenant.name;

        await prisma.nexusTenant.delete({ where: { id: String(tenantId) } });

        await logAuditEvent('data.delete', 'tenant', {
            resourceId: tenantId,
            details: {
                deletedBy: user.id,
                tenantName,
            },
        });

        return apiSuccessCompat({ message: `Tenant ${tenantName} deleted successfully` });
    } catch (error: unknown) {
        if (IS_PROD) console.error('[API] Error deleting tenant');
        else console.error('[API] Error deleting tenant:', error);
        const msg = getUnknownErrorMessage(error);
        const safeMsg = 'שגיאה במחיקת טננט';
        return apiError(IS_PROD ? safeMsg : error, {
            status: msg.includes('Forbidden') ? 403 : 500,
            message: IS_PROD ? safeMsg : msg || safeMsg,
        });
    }
}

export const PATCH = shabbatGuard(PATCHHandler);

export const DELETE = shabbatGuard(DELETEHandler);
