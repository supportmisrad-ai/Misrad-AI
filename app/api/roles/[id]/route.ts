/**
 * API Route: Role Management (by ID)
 * 
 * PATCH /api/roles/[id] - Update a role
 * DELETE /api/roles/[id] - Delete a role
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, requirePermission } from '../../../../lib/auth';
import { updateRole, deleteRole } from '../../../../lib/db';
import { RoleDefinition, PermissionId } from '../../../../types';
import { logAuditEvent } from '../../../../lib/audit';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
async function PATCHHandler(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getAuthenticatedUser();
        
        // Only users with manage_system permission can update roles
        await requirePermission('manage_system');
        
        const { id: roleId } = await params;
        const body = await request.json();
        
        // Validate updates
        const allowedUpdates: Partial<RoleDefinition> = {};
        if (body.name !== undefined) {
            if (typeof body.name !== 'string' || !body.name.trim()) {
                return NextResponse.json(
                    { error: 'Role name must be a non-empty string' },
                    { status: 400 }
                );
            }
            allowedUpdates.name = body.name.trim();
        }
        if (body.permissions !== undefined) {
            if (!Array.isArray(body.permissions)) {
                return NextResponse.json(
                    { error: 'Permissions must be an array' },
                    { status: 400 }
                );
            }
            allowedUpdates.permissions = body.permissions as PermissionId[];
        }
        if (body.isSystem !== undefined) {
            // Prevent changing isSystem flag (security)
            return NextResponse.json(
                { error: 'Cannot change isSystem flag' },
                { status: 400 }
            );
        }
        if (body.description !== undefined) {
            (allowedUpdates as any).description = body.description;
        }
        
        if (Object.keys(allowedUpdates).length === 0) {
            return NextResponse.json(
                { error: 'No valid fields provided for update' },
                { status: 400 }
            );
        }
        
        const updatedRole = await updateRole(roleId, allowedUpdates);
        
        await logAuditEvent('role.update', 'role', {
            resourceId: updatedRole.id,
            details: {
                updatedBy: user.id,
                updates: allowedUpdates
            }
        });
        
        return NextResponse.json({ success: true, role: updatedRole });
        
    } catch (error: any) {
        console.error('[API] Error updating role:', error);
        
        if (error.message?.includes('Forbidden') || error.message?.includes('Unauthorized')) {
            return NextResponse.json(
                { error: error.message },
                { status: error.message.includes('Forbidden') ? 403 : 401 }
            );
        }
        
        return NextResponse.json(
            { error: error.message || 'Failed to update role' },
            { status: 500 }
        );
    }
}

async function DELETEHandler(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getAuthenticatedUser();
        
        // Only users with manage_system permission can delete roles
        await requirePermission('manage_system');
        
        const { id: roleId } = await params;
        
        await deleteRole(roleId);
        
        await logAuditEvent('role.delete', 'role', {
            resourceId: roleId,
            details: {
                deletedBy: user.id
            }
        });
        
        return NextResponse.json({ success: true, message: 'Role deleted successfully' });
        
    } catch (error: any) {
        console.error('[API] Error deleting role:', error);
        
        if (error.message?.includes('Forbidden') || error.message?.includes('Unauthorized')) {
            return NextResponse.json(
                { error: error.message },
                { status: error.message.includes('Forbidden') ? 403 : 401 }
            );
        }
        
        if (error.message?.includes('system role')) {
            return NextResponse.json(
                { error: 'Cannot delete system role' },
                { status: 400 }
            );
        }
        
        return NextResponse.json(
            { error: error.message || 'Failed to delete role' },
            { status: 500 }
        );
    }
}


export const PATCH = shabbatGuard(PATCHHandler);

export const DELETE = shabbatGuard(DELETEHandler);
