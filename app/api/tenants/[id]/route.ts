/**
 * API Route: Tenant by ID
 * 
 * Handles update and deletion of specific tenants
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '../../../../lib/auth';
import { getTenants, updateRecord, deleteRecord } from '../../../../lib/db';
import { Tenant } from '../../../../types';
import { logAuditEvent } from '../../../../lib/audit';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
/**
 * PATCH /api/tenants/[id]
 * 
 * Update a tenant (business)
 * 
 * Body (JSON):
 *   - name: string (optional)
 *   - ownerEmail: string (optional)
 *   - subdomain: string (optional)
 *   - plan: string (optional)
 *   - region: string (optional)
 *   - status: string (optional) - Status (Provisioning, Active, Trial, Churned)
 *   - mrr: number (optional)
 *   - modules: string[] (optional)
 *   - version: string (optional)
 *   - allowedEmails: string[] (optional)
 *   - requireApproval: boolean (optional)
 * 
 * Response:
 *   - success: boolean
 *   - tenant: object (updated tenant object)
 */
async function PATCHHandler(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getAuthenticatedUser();
        
        // Only super admins can update tenants
        if (!user.isSuperAdmin) {
            return NextResponse.json(
                { error: 'Forbidden - Only super admins can update tenants' },
                { status: 403 }
            );
        }

        const { id: tenantId } = await params;
        
        if (!tenantId) {
            return NextResponse.json(
                { error: 'Tenant ID is required' },
                { status: 400 }
            );
        }

        // Check if tenant exists
        const existingTenants = await getTenants({ tenantId });
        if (existingTenants.length === 0) {
            return NextResponse.json(
                { error: 'Tenant not found' },
                { status: 404 }
            );
        }

        const body = await request.json();
        
        // Validate email format if ownerEmail is being updated
        if (body.ownerEmail) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(body.ownerEmail)) {
                return NextResponse.json(
                    { error: 'Invalid email format' },
                    { status: 400 }
                );
            }
        }

        // Validate region if provided
        if (body.region) {
            const validRegions = ['il-central', 'eu-west', 'us-east'];
            if (!validRegions.includes(body.region)) {
                return NextResponse.json(
                    { error: 'Invalid region. Must be one of: il-central, eu-west, us-east' },
                    { status: 400 }
                );
            }
        }

        // Validate status if provided
        if (body.status) {
            const validStatuses = ['Provisioning', 'Active', 'Trial', 'Churned'];
            if (!validStatuses.includes(body.status)) {
                return NextResponse.json(
                    { error: 'Invalid status. Must be one of: Provisioning, Active, Trial, Churned' },
                    { status: 400 }
                );
            }
        }

        // Prepare update data (only include fields that are provided)
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

        // Update tenant in database
        const updatedTenant = await updateRecord<Tenant>('tenants', tenantId, updateData);
        
        await logAuditEvent('data.write', 'tenant', {
            resourceId: tenantId,
            details: { 
                updatedBy: user.id,
                tenantName: updatedTenant.name,
                changes: Object.keys(updateData)
            }
        });
        
        return NextResponse.json({ 
            success: true, 
            tenant: updatedTenant 
        });
        
    } catch (error: any) {
        console.error('[API] Error updating tenant:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: error.message?.includes('Forbidden') ? 403 : 500 }
        );
    }
}

/**
 * DELETE /api/tenants/[id]
 * 
 * Delete a tenant (business)
 * 
 * Response:
 *   - success: boolean
 *   - message: string
 */
async function DELETEHandler(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getAuthenticatedUser();
        
        // Only super admins can delete tenants
        if (!user.isSuperAdmin) {
            return NextResponse.json(
                { error: 'Forbidden - Only super admins can delete tenants' },
                { status: 403 }
            );
        }

        const { id: tenantId } = await params;
        
        if (!tenantId) {
            return NextResponse.json(
                { error: 'Tenant ID is required' },
                { status: 400 }
            );
        }

        // Check if tenant exists
        const existingTenants = await getTenants({ tenantId });
        if (existingTenants.length === 0) {
            return NextResponse.json(
                { error: 'Tenant not found' },
                { status: 404 }
            );
        }

        const tenantName = existingTenants[0].name;

        // Delete tenant from database
        await deleteRecord('tenants', tenantId);
        
        await logAuditEvent('data.delete', 'tenant', {
            resourceId: tenantId,
            details: { 
                deletedBy: user.id,
                tenantName: tenantName
            }
        });
        
        return NextResponse.json({ 
            success: true,
            message: `Tenant ${tenantName} deleted successfully`
        });
        
    } catch (error: any) {
        console.error('[API] Error deleting tenant:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: error.message?.includes('Forbidden') ? 403 : 500 }
        );
    }
}


export const PATCH = shabbatGuard(PATCHHandler);

export const DELETE = shabbatGuard(DELETEHandler);
