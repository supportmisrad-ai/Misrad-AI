/**
 * Secure Users API
 * 
 * Server-side API with proper authorization
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, hasPermission, filterSensitiveData, requirePermission } from '../../../lib/auth';
import { logAuditEvent, logSensitiveAccess } from '../../../lib/audit';
import { getUsers } from '../../../lib/db';
import { User } from '../../../types';
import { requireWorkspaceAccessByOrgSlugApi } from '@/lib/server/workspace';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
async function GETHandler(request: NextRequest) {
    try {
        // 1. Authenticate user
        let user;
        try {
            user = await getAuthenticatedUser();
        } catch (authError: any) {
            // If user is not authenticated, return empty array instead of error
            if (authError.message?.includes('Unauthorized')) {
                return NextResponse.json({ users: [] }, { status: 200 });
            }
            throw authError;
        }
        
        // 2. Check permissions
        const canManageTeam = await hasPermission('manage_team');

        const headerOrgId = request.headers.get('x-org-id') || request.headers.get('x-orgid');
        let workspaceId: string | null = null;
        if (headerOrgId) {
            const workspace = await requireWorkspaceAccessByOrgSlugApi(headerOrgId);
            workspaceId = workspace.id;
        } else if (!user.isSuperAdmin) {
            return NextResponse.json({ error: 'Missing x-org-id header' }, { status: 400 });
        }
        
        // 3. Log access
        try {
            await logAuditEvent('data.read', 'user', {
                success: true
            });
        } catch (auditError) {
            // Don't fail if audit logging fails
            console.warn('[API] Audit logging failed:', auditError);
        }
        
        // 4. Get query parameters
        const searchParams = request.nextUrl.searchParams;
        const userId = searchParams.get('id');
        const department = searchParams.get('department');
        
        // 5. Fetch users from database
        let users: User[] = [];
        try {
            users = await getUsers({
                department: department || undefined,
                tenantId: workspaceId || undefined,
            });
        } catch (dbError: any) {
            console.error('[API] Error fetching users from database:', dbError);
            // Return empty array on database error
            users = [];
        }
        
        // 6. Filter based on permissions
        if (userId) {
            // Single user request
            const targetUser = users.find(u => u.id === userId);
            if (!targetUser) {
                return NextResponse.json({ error: 'User not found' }, { status: 404 });
            }
            
            // Users can only see their own full data
            if (targetUser.id !== user.id && !canManageTeam) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
            
            // Filter sensitive data
            const filtered = await filterSensitiveData(targetUser, 'user');
            
            // Log if sensitive data was accessed
            if (canManageTeam && targetUser.id !== user.id) {
                await logSensitiveAccess('user', userId, ['financial']);
            }
            
            return NextResponse.json(filtered);
        }
        
        // 7. List users - managers see all, others see limited
        let filteredUsers: any[];
        if (!canManageTeam) {
            // Non-managers only see basic info
            filteredUsers = users.map(u => ({
                id: u.id,
                name: u.name,
                role: u.role,
                avatar: u.avatar,
                online: u.online,
                capacity: u.capacity || 0,
                // No financial data, no targets, etc.
            }));
        } else {
            // Managers see all, but still filter sensitive fields per user
            const filtered = await Promise.all(
                users.map(async u => await filterSensitiveData(u, 'user'))
            );
            filteredUsers = filtered as any[];
            
            await logSensitiveAccess('user', 'all', ['financial']);
        }
        
        // 8. Filter by department if requested (already done in getUsers)
        
        return NextResponse.json({ users: filteredUsers });
        
    } catch (error: any) {
        await logAuditEvent('data.read', 'user', {
            success: false,
            error: error.message
        });
        
        if (error.message.includes('Unauthorized')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        if (error.message.includes('Forbidden')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

async function POSTHandler(request: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        
        // Only managers can create users
        await requirePermission('manage_team');
        
        const body = await request.json();
        
        // Validate input
        if (!body.name || !body.email) {
            return NextResponse.json(
                { error: 'Name and email are required' },
                { status: 400 }
            );
        }
        
        // SECURITY: Only Super Admin can set isSuperAdmin = true
        // Tenant Owners/Admins cannot create Super Admins
        if (body.isSuperAdmin && !user.isSuperAdmin) {
            return NextResponse.json(
                { error: 'Forbidden - Only Super Admins can create Super Admin users' },
                { status: 403 }
            );
        }
        
        // Create user in database
        const { createRecord } = await import('../../../lib/db');
        
        const newUserData: Omit<User, 'id'> = {
            name: body.name,
            role: body.role || 'עובד',
            department: body.department || undefined,
            avatar: body.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(body.name)}&background=random&color=fff`,
            online: false,
            capacity: body.capacity || 0,
            email: body.email,
            phone: body.phone || undefined,
            location: body.location || undefined,
            bio: body.bio || undefined,
            paymentType: body.paymentType || undefined,
            hourlyRate: body.hourlyRate || undefined,
            monthlySalary: body.monthlySalary || undefined,
            commissionPct: body.commissionPct || undefined,
            bonusPerTask: body.bonusPerTask || undefined,
            accumulatedBonus: 0,
            streakDays: 0,
            weeklyScore: undefined,
            pendingReward: undefined,
            targets: body.targets || undefined,
            notificationPreferences: {
                emailNewTask: true,
                browserPush: true,
                morningBrief: true,
                soundEffects: false,
                marketing: true
            },
            twoFactorEnabled: false,
            // Only Super Admin can set isSuperAdmin = true
            isSuperAdmin: user.isSuperAdmin ? (body.isSuperAdmin || false) : false,
            tenantId: body.tenantId || undefined, // Associate user with tenant if provided
            billingInfo: undefined
        };
        
        const newUser = await createRecord('users', newUserData) as User;
        
        await logAuditEvent('user.create', 'user', {
            resourceId: newUser.id,
            details: { createdBy: user.id, email: body.email }
        });
        
        return NextResponse.json({ 
            success: true,
            user: newUser
        });
        
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message },
            { status: error.message.includes('Forbidden') ? 403 : 500 }
        );
    }
}


export const GET = shabbatGuard(GETHandler);

export const POST = shabbatGuard(POSTHandler);
