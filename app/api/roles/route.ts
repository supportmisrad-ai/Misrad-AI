/**
 * API Route: Roles Management
 * 
 * GET /api/roles - Get all roles
 * POST /api/roles - Create a new role
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, requirePermission } from '../../../lib/auth';
import { getRoles, createRole } from '../../../lib/db';
import { RoleDefinition } from '../../../types';
import { logAuditEvent } from '../../../lib/audit';

export async function GET(request: NextRequest) {
    try {
        // Try to get authenticated user
        let user;
        try {
            user = await getAuthenticatedUser();
        } catch (authError: any) {
            // Return 401 if authentication fails
            return NextResponse.json(
                { error: 'Unauthorized - Please sign in' },
                { status: 401 }
            );
        }
        
        // All authenticated users can view roles (needed for selecting roles when editing users)
        // Only creating/editing roles requires manage_system permission
        const roles = await getRoles();
        
        return NextResponse.json({ roles });
        
    } catch (error: any) {
        console.error('[API] Error fetching roles:', error);
        
        if (error.message?.includes('Forbidden') || error.message?.includes('Unauthorized')) {
            return NextResponse.json(
                { error: error.message },
                { status: error.message.includes('Forbidden') ? 403 : 401 }
            );
        }
        
        return NextResponse.json(
            { error: 'Failed to fetch roles' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        
        // Only users with manage_system permission can create roles
        await requirePermission('manage_system');
        
        const body = await request.json();
        const { name, permissions, description, isSystem } = body;
        
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
        
        const newRole: Omit<RoleDefinition, 'id'> = {
            name: name.trim(),
            permissions: permissions || [],
            isSystem: isSystem || false,
            ...(description && { description })
        } as any;
        
        const createdRole = await createRole(newRole);
        
        await logAuditEvent('role.create', 'role', {
            resourceId: createdRole.id,
            details: {
                createdBy: user.id,
                roleName: createdRole.name
            }
        });
        
        return NextResponse.json({ success: true, role: createdRole });
        
    } catch (error: any) {
        console.error('[API] Error creating role:', error);
        
        if (error.message?.includes('Forbidden') || error.message?.includes('Unauthorized')) {
            return NextResponse.json(
                { error: error.message },
                { status: error.message.includes('Forbidden') ? 403 : 401 }
            );
        }
        
        // Check for duplicate role name
        if (error.message?.includes('duplicate') || error.code === '23505') {
            return NextResponse.json(
                { error: 'Role with this name already exists' },
                { status: 409 }
            );
        }
        
        return NextResponse.json(
            { error: error.message || 'Failed to create role' },
            { status: 500 }
        );
    }
}

