/**
 * Leave Requests API
 * 
 * Handles CRUD operations for employee leave requests (vacations, sick days, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '../../../lib/auth';
import { createClient } from '../../../lib/supabase';
import { getUsers, createRecord } from '../../../lib/db';
import { LeaveRequest, User } from '../../../types';
import { requireWorkspaceAccessByOrgSlugApi } from '@/lib/server/workspace';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
async function resolveOrganizationIdFromHeader(orgHeaderValue: string): Promise<string> {
    // We accept either a workspace id (UUID) or an orgSlug.
    const key = String(orgHeaderValue || '').trim();
    if (!key) {
        throw new Error('Missing organization context');
    }
    // Always validate against the current user context (zero trust).
    const workspace = await requireWorkspaceAccessByOrgSlugApi(key);
    return workspace.id;
}

async function GETHandler(request: NextRequest) {
    try {
        const user = await getAuthenticatedUser();

        let supabase: any;
        try {
            supabase = createClient();
        } catch (e: any) {
            console.error('[API] Supabase client init failed in /api/leave-requests GET:', e);
            return NextResponse.json(
                { error: e?.message || 'Database not configured' },
                { status: 500 }
            );
        }

        const orgHeader = request.headers.get('x-org-id');
        if (!orgHeader) {
            return NextResponse.json(
                { error: 'Missing organization context (x-org-id)' },
                { status: 400 }
            );
        }

        let organizationId: string;
        try {
            organizationId = await resolveOrganizationIdFromHeader(orgHeader);
        } catch (e: any) {
            console.error('[API] Invalid org context in /api/leave-requests GET:', e);
            return NextResponse.json(
                { error: 'Invalid organization context' },
                { status: 400 }
            );
        }

        const bypassTenantIsolationE2e =
            String(process.env.E2E_BYPASS_MODULE_ENTITLEMENTS || '').toLowerCase() === '1' ||
            String(process.env.E2E_BYPASS_MODULE_ENTITLEMENTS || '').toLowerCase() === 'true';

        const isDev = process.env.NODE_ENV === 'development';
        const isE2E = String(process.env.IS_E2E_TESTING || '').toLowerCase() === 'true';
        const allowUnscoped = bypassTenantIsolationE2e;
        if (allowUnscoped && !isDev && !isE2E) {
            console.error('[Security Risk] allowUnscoped attempted in Production');
            return new NextResponse('Unscoped access forbidden in production', { status: 403 });
        }

        // Get user from database by email
        if (!user.email) {
            return NextResponse.json(
                { error: 'User email not found' },
                { status: 400 }
            );
        }

        let dbUsers: User[] = [];
        try {
            dbUsers = await getUsers({
                email: user.email,
                tenantId: organizationId,
                allowUnscoped: Boolean((user as any)?.isSuperAdmin) || bypassTenantIsolationE2e,
            });
        } catch (dbError: any) {
            console.error('[API] Error fetching users from database:', dbError);
            dbUsers = [];
        }

        const dbUser = dbUsers.length > 0 ? dbUsers[0] : null;

        if (!dbUser) {
            // Return empty array instead of error - user might not be synced yet
            return NextResponse.json({ requests: [] }, { status: 200 });
        }

        const { searchParams } = new URL(request.url);
        const employeeId = searchParams.get('employee_id');
        const status = searchParams.get('status');
        const startDate = searchParams.get('start_date');
        const endDate = searchParams.get('end_date');

        let query = supabase
            .from('nexus_leave_requests')
            .select('*')
            .eq('organization_id', organizationId);

        // Filter by employee (if not admin, only show own requests)
        if (!dbUser.isSuperAdmin && dbUser.role !== 'מנכ״ל' && dbUser.role !== 'מנכ"ל' && dbUser.role !== 'אדמין') {
            query = query.eq('employee_id', dbUser.id);
        } else if (employeeId) {
            query = query.eq('employee_id', employeeId);
        }

        if (status) {
            query = query.eq('status', status);
        }
        if (startDate) {
            query = query.gte('start_date', startDate);
        }
        if (endDate) {
            query = query.lte('end_date', endDate);
        }

        // Order and limit for performance (limit to 500 most recent requests)
        query = query.order('created_at', { ascending: false }).limit(500);

        const { data: requests, error } = await query;

        if (error) {
            console.error('[API] Error fetching leave requests:', error);
            return NextResponse.json(
                { error: 'שגיאה בטעינת בקשות חופש' },
                { status: 500 }
            );
        }

        // Transform database records to LeaveRequest interface format
        const transformedRequests: LeaveRequest[] = (requests || []).map((req: any) => ({
            id: req.id,
            tenantId: req.organization_id,
            employeeId: req.employee_id,
            leaveType: req.leave_type,
            startDate: req.start_date,
            endDate: req.end_date,
            daysRequested: parseFloat(req.days_requested) || 0,
            reason: req.reason,
            status: req.status,
            requestedBy: req.requested_by,
            approvedBy: req.approved_by,
            approvedAt: req.approved_at,
            rejectionReason: req.rejection_reason,
            notificationSent: req.notification_sent || false,
            employeeNotified: req.employee_notified || false,
            metadata: (() => {
                try {
                    if (req.metadata) {
                        return typeof req.metadata === 'string' ? JSON.parse(req.metadata) : req.metadata;
                    }
                    return {};
                } catch (e) {
                    console.warn('[API] Failed to parse metadata:', e);
                    return {};
                }
            })(),
            createdAt: req.created_at,
            updatedAt: req.updated_at
        }));

        return NextResponse.json({ requests: transformedRequests }, { status: 200 });

    } catch (error: any) {
        const msg = String(error?.message || '');
        console.error('[API] Error in /api/leave-requests GET:', error);
        if (msg.includes('Tenant Isolation') || msg.includes('No tenant scoping column')) {
            return NextResponse.json({ requests: [] }, { status: 200 });
        }
        return NextResponse.json(
            { error: msg || 'שגיאה בטעינת בקשות חופש' },
            { status: msg.includes('Unauthorized') ? 401 : 500 }
        );
    }
}

async function POSTHandler(request: NextRequest) {
    try {
        const user = await getAuthenticatedUser();

        let supabase: any;
        try {
            supabase = createClient();
        } catch (e: any) {
            console.error('[API] Supabase client init failed in /api/leave-requests POST:', e);
            return NextResponse.json(
                { error: e?.message || 'Database not configured' },
                { status: 500 }
            );
        }

        const orgHeader = request.headers.get('x-org-id');
        if (!orgHeader) {
            return NextResponse.json(
                { error: 'Missing organization id' },
                { status: 400 }
            );
        }

        let organizationId: string;
        try {
            organizationId = await resolveOrganizationIdFromHeader(orgHeader);
        } catch (e: any) {
            console.error('[API] Invalid org context in /api/leave-requests POST:', e);
            return NextResponse.json(
                { error: 'Invalid organization context' },
                { status: 400 }
            );
        }

        // Get user from database by email
        if (!user.email) {
            return NextResponse.json(
                { error: 'User email not found' },
                { status: 400 }
            );
        }

        let dbUsers: User[] = [];
        try {
            dbUsers = await getUsers({ email: user.email, tenantId: organizationId });
        } catch {
            dbUsers = [];
        }
        let dbUser = dbUsers.length > 0 ? dbUsers[0] : null;

        // Auto-sync: If user not found, try to create them automatically
        if (!dbUser) {
            try {
                // Try to auto-sync the user (same logic as /api/users/sync)
                const role = user.role || 'עובד';
                const isSuperAdmin = user.isSuperAdmin || false;
                
                const newUserData: Omit<User, 'id'> = {
                    name: user.firstName && user.lastName
                        ? `${user.firstName} ${user.lastName}`.trim()
                        : user.firstName || user.lastName || 'User',
                    role: role,
                    department: undefined,
                    avatar: user.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.email)}&background=6366f1&color=fff`,
                    online: true,
                    capacity: 0,
                    email: user.email,
                    phone: undefined,
                    location: undefined,
                    bio: undefined,
                    paymentType: undefined,
                    hourlyRate: undefined,
                    monthlySalary: undefined,
                    commissionPct: undefined,
                    bonusPerTask: undefined,
                    accumulatedBonus: 0,
                    streakDays: 0,
                    weeklyScore: undefined,
                    pendingReward: undefined,
                    targets: undefined,
                    notificationPreferences: {
                        emailNewTask: true,
                        browserPush: true,
                        morningBrief: true,
                        soundEffects: false,
                        marketing: true
                    },
                    twoFactorEnabled: false,
                    isSuperAdmin: isSuperAdmin,
                    billingInfo: undefined
                };

                const newUser = await createRecord('users', newUserData, { organizationId }) as User;
                dbUser = newUser;
                console.log('[API] Auto-synced user to database', {
                    userId: user.id,
                    tenantId: organizationId,
                });
                
                // Re-fetch to ensure we have the latest user data (including tenantId if set)
                dbUsers = await getUsers({ email: user.email, tenantId: organizationId });
                dbUser = dbUsers.length > 0 ? dbUsers[0] : null;
                
                if (!dbUser) {
                    throw new Error('User created but not found after creation');
                }
            } catch (syncError: any) {
                console.error('[API] Auto-sync failed:', syncError);
            return NextResponse.json(
                    { error: 'User not found in database. Please sync your account first by calling POST /api/users/sync' },
                { status: 404 }
            );
            }
        }

        const body = await request.json();
        const {
            employeeId = dbUser.id, // Default to current user
            leaveType,
            startDate,
            endDate,
            daysRequested,
            reason,
            metadata = {}
        } = body;

        // Validation
        if (!leaveType || !startDate || !endDate || daysRequested === undefined) {
            return NextResponse.json(
                { error: 'סוג חופש, תאריכים ומספר ימים נדרשים' },
                { status: 400 }
            );
        }

        // Check if user can request for this employee (must be self or admin)
        if (employeeId !== dbUser.id) {
            const isAdmin = dbUser.isSuperAdmin || dbUser.role === 'מנכ״ל' || dbUser.role === 'מנכ"ל' || dbUser.role === 'אדמין';
            if (!isAdmin) {
                return NextResponse.json(
                    { error: 'אין הרשאה ליצור בקשה עבור עובד אחר' },
                    { status: 403 }
                );
            }
        }

        // Calculate days if not provided
        let calculatedDays = daysRequested;
        if (!calculatedDays) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            const diffTime = Math.abs(end.getTime() - start.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end
            calculatedDays = diffDays;
        }

        // Merge metadata - ensure isUrgent is preserved if provided
        const finalMetadata = {
            ...(typeof metadata === 'object' && metadata !== null ? metadata : {}),
            ...(metadata?.isUrgent !== undefined ? { isUrgent: metadata.isUrgent } : {})
        };

        // Create leave request
        const { data: leaveRequest, error } = await supabase
            .from('nexus_leave_requests')
            .insert({
                organization_id: organizationId,
                employee_id: employeeId,
                leave_type: leaveType,
                start_date: startDate,
                end_date: endDate,
                days_requested: calculatedDays,
                reason,
                status: 'pending',
                requested_by: dbUser.id,
                metadata: finalMetadata
            })
            .select()
            .single();

        if (error) {
            console.error('[API] Error creating leave request:', error);
            console.error('[API] Error details:', JSON.stringify(error, null, 2));
            return NextResponse.json(
                { error: error.message || 'שגיאה ביצירת בקשת חופש' },
                { status: 500 }
            );
        }

        if (!leaveRequest) {
            console.error('[API] Leave request created but not returned');
            return NextResponse.json(
                { error: 'בקשת החופש נוצרה אך לא ניתן לאחזר אותה' },
                { status: 500 }
            );
        }

        // Transform to LeaveRequest interface format
        const transformedRequest: LeaveRequest = {
            id: leaveRequest.id,
            tenantId: leaveRequest.organization_id,
            employeeId: leaveRequest.employee_id,
            leaveType: leaveRequest.leave_type,
            startDate: leaveRequest.start_date,
            endDate: leaveRequest.end_date,
            daysRequested: parseFloat(leaveRequest.days_requested) || 0,
            reason: leaveRequest.reason,
            status: leaveRequest.status,
            requestedBy: leaveRequest.requested_by,
            approvedBy: leaveRequest.approved_by,
            approvedAt: leaveRequest.approved_at,
            rejectionReason: leaveRequest.rejection_reason,
            notificationSent: leaveRequest.notification_sent || false,
            employeeNotified: leaveRequest.employee_notified || false,
            metadata: (() => {
                try {
                    if (leaveRequest.metadata) {
                        return typeof leaveRequest.metadata === 'string' ? JSON.parse(leaveRequest.metadata) : leaveRequest.metadata;
                    }
                    return {};
                } catch (e) {
                    console.warn('[API] Failed to parse metadata:', e);
                    return {};
                }
            })(),
            createdAt: leaveRequest.created_at,
            updatedAt: leaveRequest.updated_at
        };

        // Send notification to manager/department head
        try {
            // Get the employee who requested leave
            const allUsers = await getUsers({ tenantId: organizationId });
            const employee = allUsers.find(u => u.id === employeeId);
            
            if (employee) {
                // Find managers to notify
                let managersToNotify: string[] = [];
                
                // 1. Direct manager (if exists)
                if (employee.managerId) {
                    managersToNotify.push(employee.managerId);
                }
                
                // 2. Department manager (if employee has a department)
                if (employee.department) {
                    const allUsers = await getUsers({ tenantId: organizationId });
                    const deptManager = allUsers.find(u => 
                        u.managedDepartment === employee.department
                    );
                    if (deptManager && !managersToNotify.includes(deptManager.id)) {
                        managersToNotify.push(deptManager.id);
                    }
                }
                
                // 3. Super admins (if no specific manager found)
                // But exclude the employee themselves if they are a super admin/CEO
                if (managersToNotify.length === 0) {
                    const allUsers = await getUsers({ tenantId: organizationId });
                    const superAdmins = allUsers.filter(u => 
                        (u.isSuperAdmin || u.role === 'מנכ״ל' || u.role === 'מנכ"ל' || u.role === 'אדמין') &&
                        u.id !== employeeId // Don't notify the employee themselves
                    );
                    managersToNotify.push(...superAdmins.map(u => u.id));
                } else {
                    // Even if we have managers, filter out the employee themselves
                    managersToNotify = managersToNotify.filter(id => id !== employeeId);
                }
                
                // Get leave type label
                const leaveTypeLabels: Record<string, string> = {
                    'vacation': 'חופשה',
                    'sick': 'מחלה',
                    'personal': 'יום אישי',
                    'unpaid': 'חופשה ללא תשלום',
                    'other': 'אחר'
                };
                const leaveTypeLabel = leaveTypeLabels[leaveType] || leaveType;
                
                // Create notifications
                if (managersToNotify.length > 0) {
                    const isUrgent = finalMetadata.isUrgent || false;
                    const urgentLabel = isUrgent ? ' [דחוף!]' : '';
                    
                    const notifications = managersToNotify.map(managerId => ({
                        organization_id: organizationId,
                        recipient_id: managerId,
                        type: 'leave_request',
                        text: `בקשת חופש חדשה${urgentLabel}: ${employee.name} - ${leaveTypeLabel} (${startDate} עד ${endDate})`,
                        actor_id: employeeId,
                        actor_name: employee.name,
                        related_id: leaveRequest.id,
                        is_read: false,
                        metadata: {
                            leaveRequestId: leaveRequest.id,
                            employeeId: employeeId,
                            employeeName: employee.name,
                            leaveType: leaveType,
                            startDate: startDate,
                            endDate: endDate,
                            daysRequested: calculatedDays,
                            isUrgent: isUrgent,
                            requiresPushNotification: isUrgent // Flag for push notification
                        },
                        created_at: new Date().toISOString()
                    }));
                    
                    const { error: notifError } = await supabase
                        .from('misrad_notifications')
                        .insert(notifications);
                    
                    if (notifError) {
                        console.warn('[API] Could not create notifications:', notifError);
                        // Don't fail the request if notification fails
                    }
                }
            }
        } catch (notifError) {
            console.warn('[API] Error sending notifications for leave request:', notifError);
            // Don't fail the request if notification fails
        }

        return NextResponse.json(
            { request: transformedRequest, message: 'בקשת חופש נוצרה בהצלחה' },
            { status: 201 }
        );

    } catch (error: any) {
        console.error('[API] Error in /api/leave-requests POST:', error);
        return NextResponse.json(
            { error: error.message || 'שגיאה ביצירת בקשת חופש' },
            { status: error.message?.includes('Unauthorized') ? 401 : 500 }
        );
    }
}

export const GET = shabbatGuard(GETHandler);

export const POST = shabbatGuard(POSTHandler);
