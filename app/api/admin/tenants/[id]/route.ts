/**
 * API Route: Tenant by ID
 * 
 * Handles update and deletion of specific tenants
 */

import { NextRequest } from 'next/server';
import { getAuthenticatedUser, requireSuperAdmin } from '@/lib/auth';
import { Tenant } from '@/types';
import { logAuditEvent } from '@/lib/audit';
import prisma from '@/lib/prisma';
import { apiError, apiSuccessCompat } from '@/lib/server/api-response';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

function mapTenantRow(row: any): Tenant {
    return {
        id: String(row?.id ?? ''),
        name: row?.name,
        ownerEmail: row?.ownerEmail ?? row?.owner_email,
        subdomain: row?.subdomain,
        plan: row?.plan,
        status: row?.status,
        joinedAt: row?.joinedAt ?? row?.joined_at,
        mrr: row?.mrr || 0,
        usersCount: (row?.usersCount ?? row?.users_count) || 0,
        logo: row?.logo,
        modules: row?.modules || [],
        region: row?.region,
        version: row?.version,
        allowedEmails: (row?.allowedEmails ?? row?.allowed_emails) || [],
        requireApproval: (row?.requireApproval ?? row?.require_approval) || false,
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

function buildTenantDbUpdates(updateData: Partial<Tenant>): any {
    const dbUpdates: any = {};

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

async function PATCHHandler(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await requireSuperAdmin();
        const user = await getAuthenticatedUser();

        const { id: tenantId } = await params;
        if (!tenantId) {
            return apiError('Tenant ID is required', { status: 400 });
        }

        const existingTenant = await loadTenantById({ tenantId });
        if (!existingTenant) {
            return apiError('Tenant not found', { status: 404 });
        }

        const body = await request.json();

        if (body.ownerEmail) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(body.ownerEmail)) {
                return apiError('Invalid email format', { status: 400 });
            }
        }

        if (body.region) {
            const validRegions = ['il-central', 'eu-west', 'us-east'];
            if (!validRegions.includes(body.region)) {
                return apiError('Invalid region. Must be one of: il-central, eu-west, us-east', { status: 400 });
            }
        }

        if (body.status) {
            const validStatuses = ['Provisioning', 'Active', 'Trial', 'Churned'];
            if (!validStatuses.includes(body.status)) {
                return apiError('Invalid status. Must be one of: Provisioning, Active, Trial, Churned', { status: 400 });
            }
        }

        const updateData: Partial<Tenant> = {};

        if (body.name !== undefined) updateData.name = body.name;
        if (body.ownerEmail !== undefined) updateData.ownerEmail = body.ownerEmail;
        if (body.subdomain !== undefined) updateData.subdomain = String(body.subdomain ?? '').toLowerCase().replace(/\s+/g, '-');
        if (body.plan !== undefined) updateData.plan = body.plan;
        if (body.region !== undefined) updateData.region = body.region;
        if (body.status !== undefined) updateData.status = body.status as any;
        if (body.mrr !== undefined) updateData.mrr = body.mrr;
        if (body.modules !== undefined) updateData.modules = body.modules;
        if (body.version !== undefined) updateData.version = body.version;
        if (body.allowedEmails !== undefined) updateData.allowedEmails = body.allowedEmails;
        if (body.requireApproval !== undefined) updateData.requireApproval = body.requireApproval;
        if (body.logo !== undefined) updateData.logo = body.logo;
        if (body.usersCount !== undefined) updateData.usersCount = body.usersCount;

        const dbUpdates = buildTenantDbUpdates(updateData);
        let updatedRow: any;
        try {
            updatedRow = await prisma.nexusTenant.update({
                where: { id: String(tenantId) },
                data: dbUpdates,
            });
        } catch (e: any) {
            if (String(e?.code || '') === 'P2002') {
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
    } catch (error: any) {
        console.error('[API] Error updating tenant:', error);
        return apiError(error, { status: error.message?.includes('Forbidden') ? 403 : 500 });
    }
}

async function DELETEHandler(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await requireSuperAdmin();
        const user = await getAuthenticatedUser();

        const { id: tenantId } = await params;
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
    } catch (error: any) {
        console.error('[API] Error deleting tenant:', error);
        return apiError(error, { status: error.message?.includes('Forbidden') ? 403 : 500 });
    }
}

export const PATCH = shabbatGuard(PATCHHandler);

export const DELETE = shabbatGuard(DELETEHandler);
