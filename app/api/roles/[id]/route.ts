import { asObject, getErrorMessage as getUnknownErrorMessage } from '@/lib/shared/unknown';
/**
 * API Route: Role Management (by ID)
 * 
 * PATCH /api/roles/[id] - Update a role
 * DELETE /api/roles/[id] - Delete a role
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, requirePermission } from '@/lib/auth';
import { RoleDefinition, PermissionId } from '@/types';
import { logAuditEvent } from '@/lib/audit';
import prisma from '@/lib/prisma';
import type { scale_roles } from '@prisma/client';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

const IS_PROD = process.env.NODE_ENV === 'production';

type RoleUpdateData = Parameters<typeof prisma.scale_roles.update>[0]['data'];

function getUnknownErrorStatus(error: unknown): 401 | 403 | null {
    const msg = getUnknownErrorMessage(error);
    if (msg.includes('Forbidden')) return 403;
    if (msg.includes('Unauthorized')) return 401;
    return null;
}

function mapRoleRow(row: Pick<scale_roles, 'id' | 'name' | 'permissions' | 'is_system' | 'description'>): RoleDefinition {
    return {
        id: String(row.id),
        name: String(row.name),
        permissions: (Array.isArray(row.permissions) ? row.permissions : []).map(String) as PermissionId[],
        isSystem: Boolean(row.is_system),
        description: row.description ?? undefined,
    };
}

async function PATCHHandler(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await getAuthenticatedUser();
        
        // Only users with manage_system permission can update roles
        await requirePermission('manage_system');
        
        const { id: roleId } = params;
        const body: unknown = await request.json();
        const bodyObj = asObject(body) ?? {};
        
        // Validate updates
        const allowedUpdates: { name?: string; permissions?: PermissionId[]; description?: string | null } = {};
        if (bodyObj.name !== undefined) {
            if (typeof bodyObj.name !== 'string' || !bodyObj.name.trim()) {
                return NextResponse.json(
                    { error: 'Role name must be a non-empty string' },
                    { status: 400 }
                );
            }
            allowedUpdates.name = bodyObj.name.trim();
        }
        if (bodyObj.permissions !== undefined) {
            if (!Array.isArray(bodyObj.permissions)) {
                return NextResponse.json(
                    { error: 'Permissions must be an array' },
                    { status: 400 }
                );
            }
            const normalized = bodyObj.permissions.filter((p) => typeof p === 'string').map((p) => String(p));
            allowedUpdates.permissions = normalized as PermissionId[];
        }
        if (bodyObj.isSystem !== undefined) {
            // Prevent changing isSystem flag (security)
            return NextResponse.json(
                { error: 'Cannot change isSystem flag' },
                { status: 400 }
            );
        }
        if (bodyObj.description !== undefined) {
            if (bodyObj.description == null) {
                allowedUpdates.description = null;
            } else if (typeof bodyObj.description === 'string') {
                allowedUpdates.description = bodyObj.description;
            } else {
                allowedUpdates.description = String(bodyObj.description);
            }
        }
        
        if (Object.keys(allowedUpdates).length === 0) {
            return NextResponse.json(
                { error: 'No valid fields provided for update' },
                { status: 400 }
            );
        }

        const dbUpdates: RoleUpdateData = {};
        if (allowedUpdates.name !== undefined) dbUpdates.name = allowedUpdates.name;
        if (allowedUpdates.permissions !== undefined) dbUpdates.permissions = allowedUpdates.permissions;
        if (allowedUpdates.description !== undefined) dbUpdates.description = allowedUpdates.description;
        dbUpdates.updated_at = new Date();

        const data = await prisma.scale_roles.update({
            where: { id: String(roleId) },
            data: dbUpdates,
        });

        const updatedRole = mapRoleRow(data);
        
        await logAuditEvent('role.update', 'role', {
            resourceId: updatedRole.id,
            details: {
                updatedBy: user.id,
                updates: allowedUpdates
            }
        });
        
        return NextResponse.json({ success: true, role: updatedRole });
        
    } catch (error: unknown) {
        if (IS_PROD) console.error('[API] Error updating role');
        else console.error('[API] Error updating role:', error);
        
        const authStatus = getUnknownErrorStatus(error);
        if (authStatus) {
            const msg = getUnknownErrorMessage(error);
            return NextResponse.json(
                { error: msg },
                { status: authStatus }
            );
        }
        
        return NextResponse.json(
            { error: getUnknownErrorMessage(error) || 'Failed to update role' },
            { status: 500 }
        );
    }
}

async function DELETEHandler(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await getAuthenticatedUser();
        
        // Only users with manage_system permission can delete roles
        await requirePermission('manage_system');
        
        const { id: roleId } = params;

        // Check if role is system role
        const roleRow = await prisma.scale_roles.findUnique({
            where: { id: String(roleId) },
            select: { is_system: true },
        });

        if (!roleRow) {
            return NextResponse.json({ error: 'Role not found' }, { status: 404 });
        }

        if (roleRow.is_system) {
            throw new Error('Cannot delete system role');
        }

        await prisma.scale_roles.delete({ where: { id: String(roleId) } });
        
        await logAuditEvent('role.delete', 'role', {
            resourceId: roleId,
            details: {
                deletedBy: user.id
            }
        });
        
        return NextResponse.json({ success: true, message: 'Role deleted successfully' });
        
    } catch (error: unknown) {
        if (IS_PROD) console.error('[API] Error deleting role');
        else console.error('[API] Error deleting role:', error);
        
        const authStatus = getUnknownErrorStatus(error);
        if (authStatus) {
            const msg = getUnknownErrorMessage(error);
            return NextResponse.json(
                { error: msg },
                { status: authStatus }
            );
        }
        
        const msg = getUnknownErrorMessage(error);
        if (msg.includes('system role')) {
            return NextResponse.json(
                { error: 'Cannot delete system role' },
                { status: 400 }
            );
        }
        
        return NextResponse.json(
            { error: msg || 'Failed to delete role' },
            { status: 500 }
        );
    }
}


export const PATCH = shabbatGuard(PATCHHandler);

export const DELETE = shabbatGuard(DELETEHandler);
