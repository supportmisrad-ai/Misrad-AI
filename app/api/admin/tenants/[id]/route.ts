/**
 * API Route: Tenant by ID
 * 
 * Handles update and deletion of specific tenants
 */

import { NextRequest } from 'next/server';
import { getAuthenticatedUser, requireSuperAdmin } from '@/lib/auth';
import { Tenant } from '@/types';
import { logAuditEvent } from '@/lib/audit';
import { createServiceRoleClient } from '@/lib/supabase';
import { apiError, apiSuccessCompat } from '@/lib/server/api-response';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

function mapTenantRow(row: any): Tenant {
    return {
        id: String(row?.id ?? ''),
        name: row?.name,
        ownerEmail: row?.owner_email,
        subdomain: row?.subdomain,
        plan: row?.plan,
        status: row?.status,
        joinedAt: row?.joined_at,
        mrr: row?.mrr || 0,
        usersCount: row?.users_count || 0,
        logo: row?.logo,
        modules: row?.modules || [],
        region: row?.region,
        version: row?.version,
        allowedEmails: row?.allowed_emails || [],
        requireApproval: row?.require_approval || false,
    } as Tenant;
}

async function loadTenantById(params: { supabase: any; tenantId: string }): Promise<Tenant | null> {
    const { data, error } = await params.supabase
        .from('nexus_tenants')
        .select('*')
        .eq('id', params.tenantId)
        .limit(1)
        .maybeSingle();

    if (error || !data) return null;
    return mapTenantRow(data);
}

function buildTenantDbUpdates(updateData: Partial<Tenant>): any {
    const dbUpdates: any = {};

    if (updateData.name !== undefined) dbUpdates.name = updateData.name;
    if (updateData.ownerEmail !== undefined) dbUpdates.owner_email = updateData.ownerEmail;
    if (updateData.subdomain !== undefined) dbUpdates.subdomain = updateData.subdomain;
    if (updateData.plan !== undefined) dbUpdates.plan = updateData.plan;
    if (updateData.region !== undefined) dbUpdates.region = updateData.region;
    if (updateData.status !== undefined) dbUpdates.status = updateData.status;
    if (updateData.mrr !== undefined) dbUpdates.mrr = updateData.mrr;
    if (updateData.usersCount !== undefined) dbUpdates.users_count = updateData.usersCount;
    if (updateData.logo !== undefined) dbUpdates.logo = updateData.logo;
    if (updateData.modules !== undefined) dbUpdates.modules = updateData.modules;
    if (updateData.version !== undefined) dbUpdates.version = updateData.version;
    if (updateData.allowedEmails !== undefined) dbUpdates.allowed_emails = updateData.allowedEmails;
    if (updateData.requireApproval !== undefined) dbUpdates.require_approval = updateData.requireApproval;

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

        const supabaseAdmin = createServiceRoleClient({ allowUnscoped: true, reason: 'tenants_super_admin_update' });

        const existingTenant = await loadTenantById({ supabase: supabaseAdmin, tenantId });
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
        const { data: updatedRow, error: updateError } = await (supabaseAdmin as any)
            .from('nexus_tenants')
            .update(dbUpdates)
            .eq('id', tenantId)
            .select('*')
            .single();

        if (updateError) {
            throw updateError;
        }

        const updatedTenant = mapTenantRow(updatedRow);

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

        const supabaseAdmin = createServiceRoleClient({ allowUnscoped: true, reason: 'tenants_super_admin_delete' });

        const existingTenant = await loadTenantById({ supabase: supabaseAdmin, tenantId });
        if (!existingTenant) {
            return apiError('Tenant not found', { status: 404 });
        }

        const tenantName = existingTenant.name;

        const { error: deleteError } = await (supabaseAdmin as any).from('nexus_tenants').delete().eq('id', tenantId);
        if (deleteError) {
            throw deleteError;
        }

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
