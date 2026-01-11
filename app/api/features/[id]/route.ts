/**
 * API Route: Feature Request by ID
 * PATCH /api/features/[id] - Update feature request (status, voting, admin notes)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '../../../../lib/auth';
import { supabase } from '../../../../lib/supabase';
import { FeatureRequest } from '../../../../types';
import { requireWorkspaceAccessByOrgSlugApi } from '@/lib/server/workspace';

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getAuthenticatedUser();

        const orgIdFromHeader = request.headers.get('x-org-id') || request.headers.get('x-orgid');
        if (!orgIdFromHeader) {
            return NextResponse.json({ error: 'Missing x-org-id header' }, { status: 400 });
        }
        const workspace = await requireWorkspaceAccessByOrgSlugApi(orgIdFromHeader);
        
        if (!supabase) {
            return NextResponse.json(
                { error: 'Database not configured' },
                { status: 500 }
            );
        }

        const { id: requestId } = await params;

        if (!requestId) {
            return NextResponse.json(
                { error: 'Request ID is required' },
                { status: 400 }
            );
        }

        // Get existing request
        const { data: existingRequest, error: getError } = await supabase
            .from('misrad_feature_requests')
            .select('*')
            .eq('id', requestId)
            .eq('tenant_id', workspace.id)
            .single();

        if (getError || !existingRequest) {
            return NextResponse.json(
                { error: 'בקשת פיצ\'ר לא נמצאה' },
                { status: 404 }
            );
        }

        // Check permissions
        const isAdmin = user.isSuperAdmin || user.role === 'מנכ״ל' || user.role === 'מנכ"ל' || user.role === 'אדמין';
        const isOwner = existingRequest.user_id === user.id;

        const body = await request.json();
        const { status, priority, assigned_to, admin_notes, rejection_reason, vote } = body;

        // Build update data
        const updateData: any = {};

        // Handle voting (any authenticated user can vote)
        if (vote !== undefined) {
            const currentVotes = Array.isArray(existingRequest.votes) ? existingRequest.votes : [];
            const userVoteIndex = currentVotes.indexOf(user.id);
            
            if (vote === true && userVoteIndex === -1) {
                // Add vote
                updateData.votes = [...currentVotes, user.id];
            } else if (vote === false && userVoteIndex !== -1) {
                // Remove vote
                updateData.votes = currentVotes.filter((id: string) => id !== user.id);
            }
        }

        // Only admins can change status, assign, or add notes
        if (isAdmin) {
            if (status) {
                const validStatuses = ['pending', 'under_review', 'planned', 'in_progress', 'completed', 'rejected'];
                if (validStatuses.includes(status)) {
                    updateData.status = status;
                    if (status === 'under_review' && !existingRequest.reviewed_by) {
                        updateData.reviewed_by = user.id;
                    }
                }
            }
            if (priority) {
                const validPriorities = ['low', 'medium', 'high', 'urgent'];
                if (validPriorities.includes(priority)) {
                    updateData.priority = priority;
                }
            }
            if (assigned_to !== undefined) {
                updateData.assigned_to = assigned_to || undefined;
            }
            if (admin_notes !== undefined) {
                updateData.admin_notes = admin_notes;
            }
            if (rejection_reason !== undefined) {
                updateData.rejection_reason = rejection_reason;
            }
        }

        // Users can only update their own pending requests (title/description)
        if (isOwner && existingRequest.status === 'pending') {
            if (body.title) updateData.title = body.title.trim();
            if (body.description) updateData.description = body.description.trim();
        }

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json(
                { error: 'אין שינויים לעדכן' },
                { status: 400 }
            );
        }

        // Update request
        const { data: updatedRequest, error: updateError } = await supabase
            .from('misrad_feature_requests')
            .update(updateData)
            .eq('id', requestId)
            .eq('tenant_id', workspace.id)
            .select()
            .single();

        if (updateError) {
            console.error('[API] Error updating feature request:', updateError);
            return NextResponse.json(
                { error: 'שגיאה בעדכון בקשת פיצ\'ר' },
                { status: 500 }
            );
        }

        // Transform response
        const transformedRequest: FeatureRequest = {
            id: updatedRequest.id,
            user_id: updatedRequest.user_id,
            tenant_id: updatedRequest.tenant_id,
            title: updatedRequest.title,
            description: updatedRequest.description,
            type: updatedRequest.type,
            status: updatedRequest.status,
            priority: updatedRequest.priority,
            votes: Array.isArray(updatedRequest.votes) ? updatedRequest.votes : [],
            creatorId: updatedRequest.user_id,
            createdAt: updatedRequest.created_at,
            updated_at: updatedRequest.updated_at,
            assigned_to: updatedRequest.assigned_to,
            reviewed_by: updatedRequest.reviewed_by,
            reviewed_at: updatedRequest.reviewed_at,
            completed_at: updatedRequest.completed_at,
            admin_notes: updatedRequest.admin_notes,
            rejection_reason: updatedRequest.rejection_reason,
            metadata: updatedRequest.metadata || {}
        };

        return NextResponse.json({
            success: true,
            request: transformedRequest,
            message: 'בקשת פיצ\'ר עודכנה בהצלחה'
        });

    } catch (error: any) {
        console.error('[API] Error in /api/features/[id] PATCH:', error);
        return NextResponse.json(
            { error: error.message || 'שגיאה בעדכון בקשת פיצ\'ר' },
            { status: error.message?.includes('Unauthorized') ? 401 : 500 }
        );
    }
}
