import { asObject, getErrorMessage } from '@/lib/shared/unknown';
/**
 * API Route: Feature Request by ID
 * PATCH /api/features/[id] - Update feature request (status, voting, admin notes)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '../../../../lib/auth';
import { FeatureRequest, FeatureRequestStatus, FeatureRequestType, Priority } from '../../../../types';
import { isTenantAdminRole } from '@/lib/constants/roles';
import { APIError, getWorkspaceOrThrow } from '@/lib/server/api-workspace';
import prisma from '@/lib/prisma';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

type UnknownRecord = Record<string, unknown>;

const IS_PROD = process.env.NODE_ENV === 'production';

function toIsoString(input: unknown): string | undefined {
    if (!input) return undefined;
    if (input instanceof Date) return input.toISOString();
    if (typeof input === 'string') return input;
    return undefined;
}

function normalizeMetadata(input: unknown): Record<string, unknown> | undefined {
    const obj = asObject(input);
    return obj ?? undefined;
}

function normalizeVotes(input: unknown): string[] {
    if (Array.isArray(input)) return input.map((x) => String(x)).filter(Boolean);
    return [];
}

const FEATURE_REQUEST_TYPES: readonly FeatureRequestType[] = ['feature', 'bug', 'improvement', 'integration'] as const;
const FEATURE_REQUEST_STATUSES: readonly FeatureRequestStatus[] = ['pending', 'under_review', 'planned', 'in_progress', 'completed', 'rejected'] as const;

function normalizeType(input: unknown): FeatureRequestType {
    const v = String(input ?? '').trim();
    return (FEATURE_REQUEST_TYPES as readonly string[]).includes(v) ? (v as FeatureRequestType) : 'feature';
}

function normalizeStatus(input: unknown): FeatureRequestStatus {
    const v = String(input ?? '').trim();
    return (FEATURE_REQUEST_STATUSES as readonly string[]).includes(v) ? (v as FeatureRequestStatus) : 'pending';
}

function normalizePriority(input: unknown): Priority {
    const v = String(input ?? '').trim().toLowerCase();
    if (v === 'low' || v === String(Priority.LOW).toLowerCase()) return Priority.LOW;
    if (v === 'high' || v === String(Priority.HIGH).toLowerCase()) return Priority.HIGH;
    if (v === 'urgent' || v === String(Priority.URGENT).toLowerCase()) return Priority.URGENT;
    return Priority.MEDIUM;
}

function normalizeFeatureRequestRow(row: unknown): FeatureRequest {
    const r = asObject(row) ?? {};
    return {
        id: String(r.id),
        user_id: String(r.user_id),
        tenant_id: r.tenant_id ? String(r.tenant_id) : undefined,
        title: String(r.title || ''),
        description: String(r.description || ''),
        type: normalizeType(r.type),
        status: normalizeStatus(r.status),
        priority: normalizePriority(r.priority),
        votes: normalizeVotes(r.votes),
        creatorId: String(r.user_id),
        createdAt: toIsoString(r.created_at) || new Date().toISOString(),
        updated_at: toIsoString(r.updated_at),
        assigned_to: r.assigned_to ? String(r.assigned_to) : undefined,
        reviewed_by: r.reviewed_by ? String(r.reviewed_by) : undefined,
        reviewed_at: toIsoString(r.reviewed_at),
        completed_at: toIsoString(r.completed_at),
        admin_notes: r.admin_notes ? String(r.admin_notes) : undefined,
        rejection_reason: r.rejection_reason ? String(r.rejection_reason) : undefined,
        metadata: normalizeMetadata(r.metadata) ?? {},
    };
}

async function PATCHHandler(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await getAuthenticatedUser();

        const { workspace } = await getWorkspaceOrThrow(request);
        
        const { id: requestId } = params;

        if (!requestId) {
            return NextResponse.json(
                { error: 'Request ID is required' },
                { status: 400 }
            );
        }

        // Get existing request
        const existingRequest = await prisma.scale_feature_requests.findUnique({
            where: { id: String(requestId) },
        });

        const existingObj = asObject(existingRequest) ?? {};
        if (!existingRequest || String(existingObj.tenant_id || '') !== String(workspace.id)) {
            return NextResponse.json(
                { error: 'בקשת פיצ\'ר לא נמצאה' },
                { status: 404 }
            );
        }

        // Check permissions
        const isAdmin = user.isSuperAdmin || isTenantAdminRole(user.role);
        const isOwner = existingRequest.user_id === user.id;

        const body = await request.json();
        const { status, priority, assigned_to, admin_notes, rejection_reason, vote } = body;

        // Build update data
        const updateData: Record<string, unknown> = {};

        // Handle voting (any authenticated user can vote)
        if (vote !== undefined) {
            const currentVotes = normalizeVotes(existingObj.votes);
            const userVoteIndex = currentVotes.indexOf(String(user.id));
            
            if (vote === true && userVoteIndex === -1) {
                // Add vote
                updateData.votes = [...currentVotes, String(user.id)];
            } else if (vote === false && userVoteIndex !== -1) {
                // Remove vote
                updateData.votes = currentVotes.filter((id) => id !== String(user.id));
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

        let updatedRequest: Awaited<ReturnType<typeof prisma.scale_feature_requests.update>> | null = null;
        try {
            updatedRequest = await prisma.scale_feature_requests.update({
                where: { id: String(requestId) },
                data: {
                    ...updateData,
                    updated_at: new Date(),
                },
            });
        } catch (e: unknown) {
            if (IS_PROD) console.error('[API] Error updating feature request');
            else console.error('[API] Error updating feature request:', e);
            return NextResponse.json(
                { error: 'שגיאה בעדכון בקשת פיצ\'ר' },
                { status: 500 }
            );
        }

        if (!updatedRequest) {
            return NextResponse.json(
                { error: 'שגיאה בעדכון בקשת פיצ\'ר' },
                { status: 500 }
            );
        }

        const transformedRequest: FeatureRequest = normalizeFeatureRequestRow(updatedRequest);

        return NextResponse.json({
            success: true,
            request: transformedRequest,
            message: 'בקשת פיצ\'ר עודכנה בהצלחה'
        });

    } catch (error: unknown) {
        if (IS_PROD) console.error('[API] Error in /api/features/[id] PATCH');
        else console.error('[API] Error in /api/features/[id] PATCH:', error);
        if (error instanceof APIError) {
            return NextResponse.json({ error: error.message || 'Forbidden' }, { status: error.status });
        }
        const message = getErrorMessage(error);
        return NextResponse.json(
            { error: message || 'שגיאה בעדכון בקשת פיצ\'ר' },
            { status: message.includes('Unauthorized') ? 401 : 500 }
        );
    }
}

export const PATCH = shabbatGuard(PATCHHandler);
