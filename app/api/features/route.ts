import { asObject, getErrorMessage } from '@/lib/shared/unknown';
/**
 * API Route: Feature Requests
 * GET /api/features - Get feature requests
 * POST /api/features - Create new feature request
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '../../../lib/auth';
import { FeatureRequest, FeatureRequestStatus, FeatureRequestType, Priority } from '../../../types';
import { isTenantAdminRole } from '@/lib/constants/roles';
import { APIError, getWorkspaceOrThrow } from '@/lib/server/api-workspace';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

const IS_PROD = process.env.NODE_ENV === 'production';

type UnknownRecord = Record<string, unknown>;

const VALID_TYPES: readonly FeatureRequestType[] = ['feature', 'bug', 'improvement', 'integration'] as const;
const VALID_STATUSES: readonly FeatureRequestStatus[] = ['pending', 'under_review', 'planned', 'in_progress', 'completed', 'rejected'] as const;

function toFeatureType(value: unknown): FeatureRequestType {
    const v = String(value ?? '').trim();
    return (VALID_TYPES as readonly string[]).includes(v) ? (v as FeatureRequestType) : 'feature';
}

function toFeatureStatus(value: unknown): FeatureRequestStatus {
    const v = String(value ?? '').trim();
    return (VALID_STATUSES as readonly string[]).includes(v) ? (v as FeatureRequestStatus) : 'pending';
}

function toPriority(value: unknown): Priority {
    const v = String(value ?? '').trim().toLowerCase();
    if (v === 'low' || v === String(Priority.LOW).toLowerCase()) return Priority.LOW;
    if (v === 'high' || v === String(Priority.HIGH).toLowerCase()) return Priority.HIGH;
    if (v === 'urgent' || v === String(Priority.URGENT).toLowerCase()) return Priority.URGENT;
    return Priority.MEDIUM;
}

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

function normalizeFeatureRequestRow(row: unknown): FeatureRequest {
    const r = asObject(row) ?? {};
    return {
        id: String(r.id),
        user_id: String(r.user_id),
        tenant_id: r.tenant_id ? String(r.tenant_id) : undefined,
        title: String(r.title || ''),
        description: String(r.description || ''),
        type: toFeatureType(r.type),
        status: toFeatureStatus(r.status),
        priority: toPriority(r.priority),
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

async function GETHandler(request: NextRequest) {

    try {
        const user = await getAuthenticatedUser();

        const { workspaceId } = await getWorkspaceOrThrow(request);
        
        const searchParams = request.nextUrl.searchParams;
        const requestId = searchParams.get('id');
        const status = searchParams.get('status');
        const type = searchParams.get('type');
        const userId = searchParams.get('userId');

        // Check if user is admin
        const isAdmin = user.isSuperAdmin || isTenantAdminRole(user.role);

        const where: Prisma.scale_feature_requestsWhereInput = {
            tenant_id: String(workspaceId),
        };

        if (requestId) {
            where.id = String(requestId);
        }
        if (status) {
            where.status = String(status);
        }
        if (type) {
            where.type = String(type);
        }
        if (isAdmin && userId) {
            where.user_id = String(userId);
        }

        const rows = await prisma.scale_feature_requests.findMany({
            where,
            orderBy: { created_at: 'desc' },
        });

        const transformedRequests: FeatureRequest[] = (rows || []).map(normalizeFeatureRequestRow);

        if (requestId) {
            return NextResponse.json(transformedRequests[0] || null);
        }

        return NextResponse.json({ requests: transformedRequests });

    } catch (error: unknown) {
        if (IS_PROD) console.error('[API] Error in /api/features GET');
        else console.error('[API] Error in /api/features GET:', error);
        if (error instanceof APIError) {
            return NextResponse.json({ error: error.message || 'Forbidden' }, { status: error.status });
        }
        const message = getErrorMessage(error);
        return NextResponse.json(
            { error: message || 'שגיאה בטעינת בקשות פיצ\'רים' },
            { status: message.includes('Unauthorized') ? 401 : 500 }
        );
    }
}

async function POSTHandler(request: NextRequest) {
    try {
        const user = await getAuthenticatedUser();

        const { workspaceId } = await getWorkspaceOrThrow(request);
        
        const body = await request.json();
        const { title, description, type, priority } = body;

        // Validate required fields
        if (!title || !description || !type) {
            return NextResponse.json(
                { error: 'נא למלא את כל השדות החובה: כותרת, תיאור וסוג' },
                { status: 400 }
            );
        }

        // Validate type
        const validTypes = ['feature', 'bug', 'improvement', 'integration'];
        if (!validTypes.includes(type)) {
            return NextResponse.json(
                { error: 'סוג בקשה לא תקין' },
                { status: 400 }
            );
        }

        const featureRequest = await prisma.scale_feature_requests.create({
            data: {
                user_id: String(user.id),
                tenant_id: String(workspaceId),
                title: String(title).trim(),
                description: String(description).trim(),
                type: String(type),
                priority: String(priority || 'medium'),
                status: 'pending',
                votes: [],
                metadata: {},
            },
        });

        const transformedRequest: FeatureRequest = normalizeFeatureRequestRow(featureRequest);

        return NextResponse.json({
            success: true,
            request: transformedRequest,
            message: 'בקשת פיצ\'ר נוצרה בהצלחה'
        }, { status: 201 });

    } catch (error: unknown) {
        if (IS_PROD) console.error('[API] Error in /api/features POST');
        else console.error('[API] Error in /api/features POST:', error);
        if (error instanceof APIError) {
            return NextResponse.json({ error: error.message || 'Forbidden' }, { status: error.status });
        }
        const message = getErrorMessage(error);
        return NextResponse.json(
            { error: message || 'שגיאה ביצירת בקשת פיצ\'ר' },
            { status: message.includes('Unauthorized') ? 401 : 500 }
        );
    }
}

export const GET = shabbatGuard(GETHandler);

export const POST = shabbatGuard(POSTHandler);
