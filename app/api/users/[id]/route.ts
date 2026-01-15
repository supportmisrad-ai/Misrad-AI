/**
 * API Route: User Management (by ID)
 * 
 * PATCH /api/users/[id] - Update a user
 * DELETE /api/users/[id] - Delete a user
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, requirePermission } from '../../../../lib/auth';
import { updateRecord, deleteRecord, setUserManager } from '../../../../lib/db';
import { User } from '../../../../types';
import { logAuditEvent } from '../../../../lib/audit';
import { requireWorkspaceAccessByOrgSlugApi } from '@/lib/server/workspace';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
async function PATCHHandler(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getAuthenticatedUser();

        const orgIdFromHeader = request.headers.get('x-org-id') || request.headers.get('x-orgid');
        let workspaceId: string | null = null;
        if (orgIdFromHeader) {
            const workspace = await requireWorkspaceAccessByOrgSlugApi(orgIdFromHeader);
            workspaceId = workspace.id;
        } else if (!user.isSuperAdmin) {
            return NextResponse.json({ error: 'Missing x-org-id header' }, { status: 400 });
        }

        const { id: userId } = await params;
        const body = await request.json();
        
        // Check permissions - users can update themselves, managers can update anyone
        let canManageTeam = false;
        try {
            await requirePermission('manage_team');
            canManageTeam = true;
        } catch {
            // User doesn't have manage_team permission
        }
        
        if (userId !== user.id && !canManageTeam) {
            return NextResponse.json(
                { error: 'Forbidden - Only managers can update other users' },
                { status: 403 }
            );
        }
        
        // SECURITY: Only Admin can edit CEO (מנכ״ל)
        // Get the user being edited to check their role
        const { getUsers } = await import('../../../../lib/db');
        const targetUsers = await getUsers({ userId, tenantId: workspaceId || undefined });
        const targetUser = targetUsers[0];

        // Zero-trust: if user not found under this tenant, treat as not found.
        if (!targetUser && workspaceId && !user.isSuperAdmin) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }
        
        if (targetUser) {
            const ceoRoles = ['מנכ״ל', 'מנכ"ל', 'מנכל'];
            const adminRoles = ['אדמין'];
            const isTargetCEO = ceoRoles.includes(targetUser.role);
            const isTargetAdmin = adminRoles.includes(targetUser.role);
            const isCurrentUserAdmin = user.role === 'אדמין' || user.isSuperAdmin;
            const isCurrentUserSuperAdmin = user.isSuperAdmin;
            
            // If trying to edit CEO, only Admin can do it
            if (isTargetCEO && !isCurrentUserAdmin) {
                return NextResponse.json(
                    { error: 'Forbidden - Only Admin can edit CEO' },
                    { status: 403 }
                );
            }
            
            // If trying to edit Admin, only Super Admin can do it
            if (isTargetAdmin && !isCurrentUserSuperAdmin) {
                return NextResponse.json(
                    { error: 'Forbidden - Only Super Admin can edit Admin' },
                    { status: 403 }
                );
            }
        }
        
        // Handle manager_id update separately (hierarchy)
        if (body.managerId !== undefined) {
            if (!canManageTeam) {
                return NextResponse.json(
                    { error: 'Forbidden - Only managers can update hierarchy' },
                    { status: 403 }
                );
            }
            
            await setUserManager(userId, body.managerId || null);
            
            await logAuditEvent('user.update', 'user', {
                resourceId: userId,
                details: {
                    updatedBy: user.id,
                    field: 'manager_id',
                    newValue: body.managerId
                }
            });
            
            // Return updated user
            const { getUsers } = await import('../../../../lib/db');
            const updatedUsers = await getUsers({ userId });
            return NextResponse.json({ success: true, user: updatedUsers[0] || null });
        }
        
        // Handle managedDepartment update separately (requires manage_team permission)
        if (body.managedDepartment !== undefined) {
            if (!canManageTeam) {
                return NextResponse.json(
                    { error: 'Forbidden - Only managers can set department managers' },
                    { status: 403 }
                );
            }
            
            // If setting a new manager, remove old manager from that department first
            if (body.managedDepartment) {
                const { supabase } = await import('../../../../lib/supabase');
                if (supabase) {
                    // Remove any existing manager for this department
                    let clearQuery = supabase
                        .from('nexus_users')
                        .update({ managed_department: null })
                        .eq('managed_department', body.managedDepartment);

                    // Zero-trust: don't affect other tenants.
                    if (workspaceId) {
                        clearQuery = clearQuery.eq('tenant_id', workspaceId);
                    }

                    await clearQuery;
                }
            }
            
            // Update user's managed_department
            const { supabase } = await import('../../../../lib/supabase');
            if (supabase) {
                const { error: updateError } = await supabase
                    .from('nexus_users')
                    .update({ managed_department: body.managedDepartment || null })
                    .eq('id', userId);
                
                if (updateError) {
                    console.error('[API] Error updating managed_department:', updateError);
                    return NextResponse.json(
                        { error: 'שגיאה בעדכון מנהל מחלקה' },
                        { status: 500 }
                    );
                }
            }
            
            await logAuditEvent('user.update', 'user', {
                resourceId: userId,
                details: {
                    updatedBy: user.id,
                    field: 'managed_department',
                    newValue: body.managedDepartment
                }
            });
            
            // Return updated user
            const { getUsers } = await import('../../../../lib/db');
            const updatedUsers = await getUsers({ userId });
            return NextResponse.json({ success: true, user: updatedUsers[0] || null });
        }
        
        // Regular user update
        const allowedUpdates: Partial<User> = {};
        if (body.name !== undefined) allowedUpdates.name = body.name;
        if (body.role !== undefined) allowedUpdates.role = body.role;
        if (body.department !== undefined) allowedUpdates.department = body.department;
        if (body.managedDepartment !== undefined) {
            // Only admins/managers can set department manager
            if (!canManageTeam) {
                return NextResponse.json(
                    { error: 'Forbidden - Only managers can set department managers' },
                    { status: 403 }
                );
            }
            allowedUpdates.managedDepartment = body.managedDepartment;
        }
        if (body.avatar !== undefined) allowedUpdates.avatar = body.avatar;
        if (body.capacity !== undefined) allowedUpdates.capacity = body.capacity;
        if (body.email !== undefined) allowedUpdates.email = body.email;
        if (body.phone !== undefined) allowedUpdates.phone = body.phone;
        if (body.location !== undefined) allowedUpdates.location = body.location;
        if (body.bio !== undefined) allowedUpdates.bio = body.bio;
        if (body.paymentType !== undefined) allowedUpdates.paymentType = body.paymentType;
        if (body.hourlyRate !== undefined) allowedUpdates.hourlyRate = body.hourlyRate;
        if (body.monthlySalary !== undefined) allowedUpdates.monthlySalary = body.monthlySalary;
        if (body.commissionPct !== undefined) allowedUpdates.commissionPct = body.commissionPct;
        if (body.bonusPerTask !== undefined) allowedUpdates.bonusPerTask = body.bonusPerTask;
        if (body.targets !== undefined) allowedUpdates.targets = body.targets;
        if (body.notificationPreferences !== undefined) allowedUpdates.notificationPreferences = body.notificationPreferences;
        if (body.uiPreferences !== undefined) allowedUpdates.uiPreferences = body.uiPreferences;
        
        // SECURITY: Only Super Admin can set/update isSuperAdmin
        if (body.isSuperAdmin !== undefined) {
            if (!user.isSuperAdmin) {
                return NextResponse.json(
                    { error: 'Forbidden - Only Super Admins can set isSuperAdmin' },
                    { status: 403 }
                );
            }
            allowedUpdates.isSuperAdmin = body.isSuperAdmin;
        }
        
        if (Object.keys(allowedUpdates).length === 0) {
            return NextResponse.json(
                { error: 'No valid fields provided for update' },
                { status: 400 }
            );
        }
        
        const updatedUser = await updateRecord<User>('users', userId, allowedUpdates);
        
        await logAuditEvent('user.update', 'user', {
            resourceId: userId,
            details: {
                updatedBy: user.id,
                updates: allowedUpdates
            }
        });
        
        return NextResponse.json({ success: true, user: updatedUser });
        
    } catch (error: any) {
        console.error('[API] Error updating user:', error);
        
        if (error.message?.includes('Forbidden') || error.message?.includes('Unauthorized')) {
            return NextResponse.json(
                { error: error.message },
                { status: error.message.includes('Forbidden') ? 403 : 401 }
            );
        }
        
        return NextResponse.json(
            { error: error.message || 'Failed to update user' },
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

        const orgIdFromHeader = request.headers.get('x-org-id') || request.headers.get('x-orgid');
        let workspaceId: string | null = null;
        if (orgIdFromHeader) {
            const workspace = await requireWorkspaceAccessByOrgSlugApi(orgIdFromHeader);
            workspaceId = workspace.id;
        } else if (!user.isSuperAdmin) {
            return NextResponse.json({ error: 'Missing x-org-id header' }, { status: 400 });
        }
        
        // Only managers can delete users
        await requirePermission('manage_team');
        
        const { id: userId } = await params;

        if (workspaceId && !user.isSuperAdmin) {
            const { getUsers } = await import('../../../../lib/db');
            const target = await getUsers({ userId, tenantId: workspaceId });
            if (!target?.[0]) {
                return NextResponse.json({ error: 'User not found' }, { status: 404 });
            }
        }
        
        // Prevent deleting yourself
        if (userId === user.id) {
            return NextResponse.json(
                { error: 'Cannot delete your own account' },
                { status: 400 }
            );
        }
        
        await deleteRecord('users', userId);
        
        await logAuditEvent('user.delete', 'user', {
            resourceId: userId,
            details: {
                deletedBy: user.id
            }
        });
        
        return NextResponse.json({ success: true, message: 'User deleted successfully' });
        
    } catch (error: any) {
        console.error('[API] Error deleting user:', error);
        
        if (error.message?.includes('Forbidden') || error.message?.includes('Unauthorized')) {
            return NextResponse.json(
                { error: error.message },
                { status: error.message.includes('Forbidden') ? 403 : 401 }
            );
        }
        
        return NextResponse.json(
            { error: error.message || 'Failed to delete user' },
            { status: 500 }
        );
    }
}


export const PATCH = shabbatGuard(PATCHHandler);

export const DELETE = shabbatGuard(DELETEHandler);
