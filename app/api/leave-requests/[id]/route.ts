/**
 * Leave Request by ID API
 * 
 * Handles update and delete operations for specific leave requests
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '../../../../lib/auth';
import { createClient } from '../../../../lib/supabase';
import { getUsers } from '../../../../lib/db';
import { LeaveRequest } from '../../../../types';

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getAuthenticatedUser();

        let supabase: any;
        try {
            supabase = createClient();
        } catch (e: any) {
            return NextResponse.json(
                { error: e?.message || 'Database not configured' },
                { status: 500 }
            );
        }

        const { id } = await params;

        if (!id) {
            return NextResponse.json(
                { error: 'Request ID is required' },
                { status: 400 }
            );
        }

        // Get existing request
        const { data: existingRequest, error: getError } = await supabase
            .from('nexus_leave_requests')
            .select('*')
            .eq('id', id)
            .single();

        if (getError || !existingRequest) {
            return NextResponse.json(
                { error: 'בקשת חופש לא נמצאה' },
                { status: 404 }
            );
        }

        // Get user from database
        if (!user.email) {
            return NextResponse.json(
                { error: 'User email not found' },
                { status: 400 }
            );
        }
        const dbUsers = await getUsers({ email: user.email });
        const dbUser = dbUsers.length > 0 ? dbUsers[0] : null;

        if (!dbUser) {
            return NextResponse.json(
                { error: 'User not found in database' },
                { status: 404 }
            );
        }

        // Check permissions
        const isEmployee = existingRequest.employee_id === dbUser.id;
        const isAdmin = dbUser.isSuperAdmin || dbUser.role === 'מנכ״ל' || dbUser.role === 'מנכ"ל' || dbUser.role === 'אדמין';

        const body = await request.json();
        const updateData: any = {};

        // Employees can only update their own pending requests (cancel or edit details)
        if (isEmployee && existingRequest.status === 'pending') {
            if (body.leaveType !== undefined) updateData.leave_type = body.leaveType;
            if (body.startDate !== undefined) updateData.start_date = body.startDate;
            if (body.endDate !== undefined) updateData.end_date = body.endDate;
            if (body.daysRequested !== undefined) updateData.days_requested = body.daysRequested;
            if (body.reason !== undefined) updateData.reason = body.reason;
            if (body.status === 'cancelled') {
                updateData.status = 'cancelled';
            }
            // Update metadata (e.g., isUrgent flag)
            if (body.metadata !== undefined) {
                const existingMetadata = existingRequest.metadata || {};
                updateData.metadata = {
                    ...existingMetadata,
                    ...body.metadata
                };
            }
        }

        // Admins/managers can approve/reject or request more info
        if (isAdmin) {
            if (body.status === 'approved' || body.status === 'rejected') {
                updateData.status = body.status;
                updateData.approved_by = dbUser.id;
                updateData.approved_at = new Date().toISOString();
                updateData.employee_notified = false; // Will be set to true after notification sent
                
                if (body.status === 'rejected' && body.rejectionReason) {
                    updateData.rejection_reason = body.rejectionReason;
                }
            }
            // Request more info - keep status as pending but add metadata flag
            if (body.requestMoreInfo === true) {
                const existingMetadata = existingRequest.metadata || {};
                updateData.metadata = {
                    ...existingMetadata,
                    needsMoreInfo: true,
                    requestedMoreInfoBy: dbUser.id,
                    requestedMoreInfoAt: new Date().toISOString(),
                    moreInfoRequest: body.moreInfoRequest || 'נא לספק סיבה מפורטת יותר לבקשת החופש'
                };
                // Don't change status - keep it as pending
            }
        }

        // Only update if there are changes
        if (Object.keys(updateData).length === 0) {
            return NextResponse.json(
                { error: 'אין שינויים לעדכון' },
                { status: 400 }
            );
        }

        const { data: updatedRequest, error } = await supabase
            .from('nexus_leave_requests')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('[API] Error updating leave request:', error);
            return NextResponse.json(
                { error: 'שגיאה בעדכון בקשת חופש' },
                { status: 500 }
            );
        }

        // Transform to LeaveRequest interface format
        const transformedRequest: LeaveRequest = {
            id: updatedRequest.id,
            tenantId: updatedRequest.tenant_id,
            employeeId: updatedRequest.employee_id,
            leaveType: updatedRequest.leave_type,
            startDate: updatedRequest.start_date,
            endDate: updatedRequest.end_date,
            daysRequested: parseFloat(updatedRequest.days_requested) || 0,
            reason: updatedRequest.reason,
            status: updatedRequest.status,
            requestedBy: updatedRequest.requested_by,
            approvedBy: updatedRequest.approved_by,
            approvedAt: updatedRequest.approved_at,
            rejectionReason: updatedRequest.rejection_reason,
            notificationSent: updatedRequest.notification_sent || false,
            employeeNotified: updatedRequest.employee_notified || false,
            metadata: (() => {
                try {
                    if (updatedRequest.metadata) {
                        return typeof updatedRequest.metadata === 'string' ? JSON.parse(updatedRequest.metadata) : updatedRequest.metadata;
                    }
                    return {};
                } catch (e) {
                    console.warn('[API] Failed to parse metadata:', e);
                    return {};
                }
            })(),
            createdAt: updatedRequest.created_at,
            updatedAt: updatedRequest.updated_at
        };

        // Send notifications
        if (supabase) {
            try {
                const allUsers = await getUsers();
                const employee = allUsers.find(u => u.id === existingRequest.employee_id);
                
                // 1. If employee cancelled or edited their own request, notify managers
                if (isEmployee && employee) {
                    // Check if employee cancelled the request
                    if (updateData.status === 'cancelled') {
                        // Find managers to notify (same logic as in POST)
                        const managersToNotify: string[] = [];
                        
                        if (employee.managerId) {
                            managersToNotify.push(employee.managerId);
                        }
                        
                        if (employee.department) {
                            const deptManager = allUsers.find(u => 
                                u.managedDepartment === employee.department && 
                                u.id !== employee.id
                            );
                            if (deptManager && !managersToNotify.includes(deptManager.id)) {
                                managersToNotify.push(deptManager.id);
                            }
                        }
                        
                        // If no specific manager, notify super admins
                        if (managersToNotify.length === 0) {
                            const superAdmins = allUsers.filter(u => u.isSuperAdmin);
                            managersToNotify.push(...superAdmins.map(u => u.id));
                        }
                        
                        if (managersToNotify.length > 0) {
                            const notifications = managersToNotify.map(managerId => ({
                                recipient_id: managerId,
                                type: 'leave_request_cancelled',
                                text: `${employee.name} ביטל את בקשת החופש שלו`,
                                actor_id: employee.id,
                                actor_name: employee.name,
                                related_id: id,
                                is_read: false,
                                metadata: {
                                    leaveRequestId: id,
                                    employeeId: employee.id,
                                    employeeName: employee.name,
                                    leaveType: existingRequest.leave_type,
                                },
                                created_at: new Date().toISOString()
                            }));

                            const { error: notifError } = await supabase
                                .from('misrad_notifications')
                                .insert(notifications);

                            if (notifError) {
                                console.warn('[API] Could not create cancellation notifications:', notifError);
                            }
                        }
                    }

                    // Check if employee edited details (dates, type, reason) - but not status change
                    else if (!updateData.status && (updateData.start_date || updateData.end_date || updateData.leave_type || updateData.reason)) {
                        // Find managers to notify
                        const managersToNotify: string[] = [];
                        
                        if (employee.managerId) {
                            managersToNotify.push(employee.managerId);
                        }
                        
                        if (employee.department) {
                            const deptManager = allUsers.find(u => 
                                u.managedDepartment === employee.department && 
                                u.id !== employee.id
                            );
                            if (deptManager && !managersToNotify.includes(deptManager.id)) {
                                managersToNotify.push(deptManager.id);
                            }
                        }
                        
                        if (managersToNotify.length === 0) {
                            const superAdmins = allUsers.filter(u => u.isSuperAdmin);
                            managersToNotify.push(...superAdmins.map(u => u.id));
                        }
                        
                        if (managersToNotify.length > 0) {
                            const notifications = managersToNotify.map(managerId => ({
                                recipient_id: managerId,
                                type: 'leave_request_updated',
                                text: `${employee.name} עדכן את בקשת החופש שלו`,
                                actor_id: employee.id,
                                actor_name: employee.name,
                                related_id: id,
                                is_read: false,
                                metadata: {
                                    leaveRequestId: id,
                                    employeeId: employee.id,
                                    employeeName: employee.name,
                                    changes: updateData
                                },
                                created_at: new Date().toISOString()
                            }));
                            
                            const { error: notifError } = await supabase
                                .from('misrad_notifications')
                                .insert(notifications);
                            
                            if (notifError) {
                                console.warn('[API] Could not create update notifications:', notifError);
                            }
                        }
                    }
                }
                
                // 2. If admin/manager requested more info, notify employee
                if (updateData.metadata?.needsMoreInfo && isAdmin) {
                    if (employee) {
                        const moreInfoRequest = updateData.metadata.moreInfoRequest || 'נא לספק סיבה מפורטת יותר';
                        
                        const notification = {
                            recipient_id: existingRequest.employee_id,
                            type: 'leave_request',
                            text: `המנהל מבקש מידע נוסף על בקשת החופש שלך: ${moreInfoRequest}`,
                            actor_id: dbUser.id,
                            actor_name: dbUser.name,
                            related_id: id,
                            is_read: false,
                            metadata: {
                                leaveRequestId: id,
                                action: 'request_more_info',
                                moreInfoRequest: moreInfoRequest
                            },
                            created_at: new Date().toISOString()
                        };
                        
                        const { error: notifError } = await supabase
                            .from('misrad_notifications')
                            .insert(notification);
                        
                        if (notifError) {
                            console.warn('[API] Could not create more info request notification:', notifError);
                        }
                    }
                }
                
                // 3. If admin/manager changed status, notify employee
                if (updateData.status && updateData.status !== existingRequest.status && isAdmin) {
                    if (employee) {
                        const statusLabels: Record<string, string> = {
                            'approved': 'אושרה',
                            'rejected': 'נדחתה',
                            'cancelled': 'בוטלה'
                        };
                        const statusLabel = statusLabels[updateData.status] || updateData.status;
                        
                        const notification = {
                            recipient_id: existingRequest.employee_id,
                            type: 'leave_request_status',
                            text: `בקשת החופש שלך ${statusLabel}`,
                            actor_id: dbUser.id,
                            actor_name: dbUser.name,
                            related_id: id,
                            is_read: false,
                            metadata: {
                                leaveRequestId: id,
                                status: updateData.status,
                                rejectionReason: updateData.rejection_reason
                            },
                            created_at: new Date().toISOString()
                        };
                        
                        const { error: notifError } = await supabase
                            .from('misrad_notifications')
                            .insert(notification);
                        
                        if (notifError) {
                            console.warn('[API] Could not create notification for employee:', notifError);
                        } else {
                            // Mark as notified
                            await supabase
                                .from('nexus_leave_requests')
                                .update({ employee_notified: true })
                                .eq('id', id);
                        }
                    }
                }
            } catch (notifError) {
                console.warn('[API] Error sending notifications:', notifError);
                // Don't fail the request if notification fails
            }
        }

        return NextResponse.json(
            { request: transformedRequest, message: 'בקשת חופש עודכנה בהצלחה' },
            { status: 200 }
        );

    } catch (error: any) {
        console.error('[API] Error in /api/leave-requests/[id] PATCH:', error);
        return NextResponse.json(
            { error: error.message || 'שגיאה בעדכון בקשת חופש' },
            { status: error.message?.includes('Unauthorized') ? 401 : 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getAuthenticatedUser();

        let supabase: any;
        try {
            supabase = createClient();
        } catch (e: any) {
            return NextResponse.json(
                { error: e?.message || 'Database not configured' },
                { status: 500 }
            );
        }

        const { id } = await params;

        if (!id) {
            return NextResponse.json(
                { error: 'Request ID is required' },
                { status: 400 }
            );
        }

        // Get existing request
        const { data: existingRequest, error: getError } = await supabase
            .from('nexus_leave_requests')
            .select('*')
            .eq('id', id)
            .single();

        if (getError || !existingRequest) {
            return NextResponse.json(
                { error: 'בקשת חופש לא נמצאה' },
                { status: 404 }
            );
        }

        // Get user from database
        if (!user.email) {
            return NextResponse.json(
                { error: 'User email not found' },
                { status: 400 }
            );
        }
        const dbUsers = await getUsers({ email: user.email });
        const dbUser = dbUsers.length > 0 ? dbUsers[0] : null;

        if (!dbUser) {
            return NextResponse.json(
                { error: 'User not found in database' },
                { status: 404 }
            );
        }

        // Check permissions: employee can delete own pending requests, admin can delete any
        const isEmployee = existingRequest.employee_id === dbUser.id;
        const isAdmin = dbUser.isSuperAdmin || dbUser.role === 'מנכ״ל' || dbUser.role === 'מנכ"ל' || dbUser.role === 'אדמין';

        if (!isEmployee && !isAdmin) {
            return NextResponse.json(
                { error: 'אין הרשאה למחוק בקשת חופש זו' },
                { status: 403 }
            );
        }

        // Only allow deletion of pending or cancelled requests
        if (existingRequest.status === 'approved' && !isAdmin) {
            return NextResponse.json(
                { error: 'לא ניתן למחוק בקשת חופש מאושרת' },
                { status: 400 }
            );
        }

        const { error } = await supabase
            .from('nexus_leave_requests')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('[API] Error deleting leave request:', error);
            return NextResponse.json(
                { error: 'שגיאה במחיקת בקשת חופש' },
                { status: 500 }
            );
        }

        // Send notification to managers if employee deleted their own request
        if (isEmployee && supabase) {
            try {
                const allUsers = await getUsers();
                const employee = allUsers.find(u => u.id === existingRequest.employee_id);
                
                if (employee) {
                    // Find managers to notify
                    const managersToNotify: string[] = [];
                    
                    if (employee.managerId) {
                        managersToNotify.push(employee.managerId);
                    }
                    
                    if (employee.department) {
                        const deptManager = allUsers.find(u => 
                            u.managedDepartment === employee.department && 
                            u.id !== employee.id
                        );
                        if (deptManager && !managersToNotify.includes(deptManager.id)) {
                            managersToNotify.push(deptManager.id);
                        }
                    }
                    
                    // If no specific manager, notify super admins
                    if (managersToNotify.length === 0) {
                        const superAdmins = allUsers.filter(u => u.isSuperAdmin);
                        managersToNotify.push(...superAdmins.map(u => u.id));
                    }
                    
                    if (managersToNotify.length > 0) {
                        const notifications = managersToNotify.map(managerId => ({
                            recipient_id: managerId,
                            type: 'leave_request_deleted',
                            text: `${employee.name} מחק את בקשת החופש שלו`,
                            actor_id: employee.id,
                            actor_name: employee.name,
                            related_id: id,
                            is_read: false,
                            metadata: {
                                leaveRequestId: id,
                                employeeId: employee.id,
                                employeeName: employee.name,
                                leaveType: existingRequest.leave_type,
                                startDate: existingRequest.start_date,
                                endDate: existingRequest.end_date,
                                status: existingRequest.status
                            },
                            created_at: new Date().toISOString()
                        }));
                        
                        const { error: notifError } = await supabase
                            .from('misrad_notifications')
                            .insert(notifications);
                        
                        if (notifError) {
                            console.warn('[API] Could not create deletion notifications:', notifError);
                        }
                    }
                }
            } catch (notifError) {
                console.warn('[API] Error sending deletion notifications:', notifError);
                // Don't fail the request if notification fails
            }
        }

        return NextResponse.json(
            { message: 'בקשת חופש נמחקה בהצלחה' },
            { status: 200 }
        );

    } catch (error: any) {
        console.error('[API] Error in /api/leave-requests/[id] DELETE:', error);
        return NextResponse.json(
            { error: error.message || 'שגיאה במחיקת בקשת חופש' },
            { status: error.message?.includes('Unauthorized') ? 401 : 500 }
        );
    }
}
