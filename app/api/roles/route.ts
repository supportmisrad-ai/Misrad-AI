/**
 * API Route: Roles Management
 * 
 * GET /api/roles - Get all roles
 * POST /api/roles - Create a new role
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, requirePermission } from '../../../lib/auth';
import { RoleDefinition } from '../../../types';
import { logAuditEvent } from '../../../lib/audit';
import { createClient } from '@/lib/supabase';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

function mapRoleRow(row: any): RoleDefinition {
    return {
        id: row?.id,
        name: row?.name,
        permissions: (row?.permissions || []) as any,
        isSystem: row?.is_system || false,
        description: row?.description,
    } as any;
}
async function GETHandler(request: NextRequest) {
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
        
        const supabase = createClient();

        // All authenticated users can view roles (needed for selecting roles when editing users)
        // Only creating/editing roles requires manage_system permission
        const { data, error } = await supabase
            .from('misrad_roles')
            .select('*')
            .order('name');

        if (error) {
            throw error;
        }

        const roles = (Array.isArray(data) ? data : []).map(mapRoleRow);
        
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

async function POSTHandler(request: NextRequest) {
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

        const supabase = createClient();

        const { data, error } = await supabase
            .from('misrad_roles')
            .insert({
                name: (newRole as any).name,
                permissions: (newRole as any).permissions,
                is_system: (newRole as any).isSystem || false,
                description: (newRole as any).description || null,
            })
            .select('*')
            .single();

        if (error) {
            throw error;
        }

        const createdRole = mapRoleRow(data);
        
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


export const GET = shabbatGuard(GETHandler);

export const POST = shabbatGuard(POSTHandler);
