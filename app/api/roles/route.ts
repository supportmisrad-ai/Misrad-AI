import { asObject, getErrorMessage } from '@/lib/shared/unknown';
/**
 * API Route: Roles Management
 * 
 * GET /api/roles - Get all roles
 * POST /api/roles - Create a new role
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, requirePermission, requireSuperAdmin } from '@/lib/auth';
import { PermissionId, RoleDefinition } from '@/types';
import { logAuditEvent } from '@/lib/audit';
import prisma from '@/lib/prisma';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
import { withTenantIsolationContext } from '@/lib/prisma-tenant-guard';

type UnknownRecord = Record<string, unknown>;

const IS_PROD = process.env.NODE_ENV === 'production';

const PERMISSION_IDS: readonly PermissionId[] = [
    'view_financials',
    'manage_team',
    'manage_system',
    'delete_data',
    'view_intelligence',
    'view_crm',
    'view_assets',
] as const;

function isPermissionId(value: unknown): value is PermissionId {
    return typeof value === 'string' && (PERMISSION_IDS as readonly string[]).includes(value);
}

function normalizePermissions(value: unknown): PermissionId[] {
    if (!Array.isArray(value)) return [];
    return value.filter(isPermissionId);
}

function mapRoleRow(row: unknown): RoleDefinition {
    const r = asObject(row) ?? {};
    return {
        id: r.id ? String(r.id) : undefined,
        name: String(r.name || ''),
        permissions: normalizePermissions(r.permissions),
        isSystem: Boolean(r.is_system ?? false),
        description: r.description == null ? undefined : String(r.description),
    };
}
async function GETHandler(request: NextRequest) {
    try {
        // Try to get authenticated user
        let user;
        try {
            user = await getAuthenticatedUser();
        } catch {
            // Return 401 if authentication fails
            return NextResponse.json(
                { error: 'Unauthorized - Please sign in' },
                { status: 401 }
            );
        }
        
        // All authenticated users can view roles (needed for selecting roles when editing users)
        // Only creating/editing roles requires manage_system permission
        return await withTenantIsolationContext(
            { source: 'api_roles', reason: 'list_roles', suppressReporting: true },
            async () => {
                const data = await prisma.misradRole.findMany({
                    orderBy: { name: 'asc' },
                });

                const roles = (Array.isArray(data) ? data : []).map((row) => mapRoleRow(row));
                
                return NextResponse.json({ roles });
            }
        );
        
    } catch (error: unknown) {
        if (IS_PROD) console.error('[API] Error fetching roles');
        else console.error('[API] Error fetching roles:', error);
        const msg = getErrorMessage(error);
        
        if (msg.includes('Forbidden') || msg.includes('Unauthorized')) {
            const status = msg.includes('Forbidden') ? 403 : 401;
            const safeMsg = status === 401 ? 'Unauthorized' : 'Forbidden';
            return NextResponse.json(
                { error: IS_PROD ? safeMsg : msg || safeMsg },
                { status }
            );
        }
        
        return NextResponse.json(
            { error: 'Failed to fetch roles' },
            { status: 500 }
        );
    }
}

async function POSTHandler(request: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        
        // Only users with manage_system permission can create roles
        await requireSuperAdmin();
        await requirePermission('manage_system');
        
        const body: unknown = await request.json();
        const bodyObj = asObject(body) ?? {};

        const name = bodyObj.name;
        const permissions = bodyObj.permissions;
        const description = bodyObj.description;
        const isSystem = bodyObj.isSystem;
        
        if (!name || typeof name !== 'string') {
            return NextResponse.json(
                { error: 'Role name is required' },
                { status: 400 }
            );
        }
        
        // Validate permissions
        if (permissions && !Array.isArray(permissions)) {
            return NextResponse.json(
                { error: 'Permissions must be an array' },
                { status: 400 }
            );
        }

        const parsedPermissions = normalizePermissions(permissions);

        return await withTenantIsolationContext(
            { source: 'api_roles', reason: 'create_role', mode: 'global_admin', isSuperAdmin: true },
            async () => {
                let created;
                try {
                    created = await prisma.misradRole.create({
                        data: {
                            name: name.trim(),
                            permissions: parsedPermissions,
                            is_system: Boolean(isSystem),
                            description: description == null ? null : String(description),
                        },
                    });
                } catch (e: unknown) {
                    // Prisma unique constraint
                    const code = String(asObject(e)?.code || '');
                    if (code === 'P2002') {
                        return NextResponse.json(
                            { error: 'Role with this name already exists' },
                            { status: 409 }
                        );
                    }
                    throw e;
                }

                const createdRole = mapRoleRow(created);
                
                await logAuditEvent('role.create', 'role', {
                    resourceId: createdRole.id,
                    details: {
                        createdBy: user.id,
                        roleName: createdRole.name
                    }
                });
                
                return NextResponse.json({ success: true, role: createdRole });
            }
        );
        
    } catch (error: unknown) {
        if (IS_PROD) console.error('[API] Error creating role');
        else console.error('[API] Error creating role:', error);
        const msg = getErrorMessage(error);
        
        if (msg.includes('Forbidden') || msg.includes('Unauthorized')) {
            const status = msg.includes('Forbidden') ? 403 : 401;
            const safeMsg = status === 401 ? 'Unauthorized' : 'Forbidden';
            return NextResponse.json(
                { error: IS_PROD ? safeMsg : msg || safeMsg },
                { status }
            );
        }

        const safeMsg = 'Internal server error';
        return NextResponse.json(
            { error: IS_PROD ? safeMsg : msg || 'Failed to create role' },
            { status: 500 }
        );
    }
}


export const GET = shabbatGuard(GETHandler);

export const POST = shabbatGuard(POSTHandler);
