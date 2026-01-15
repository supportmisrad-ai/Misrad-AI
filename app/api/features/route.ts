/**
 * API Route: Feature Requests
 * GET /api/features - Get feature requests
 * POST /api/features - Create new feature request
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '../../../lib/auth';
import { supabase } from '../../../lib/supabase';
import { FeatureRequest } from '../../../types';
import { requireWorkspaceAccessByOrgSlugApi } from '@/lib/server/workspace';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
async function GETHandler(request: NextRequest) {
    try {
        const user = await getAuthenticatedUser();

        const orgIdFromHeader = request.headers.get('x-org-id') || request.headers.get('x-orgid');
        let workspaceId: string | null = null;
        if (orgIdFromHeader) {
            const workspace = await requireWorkspaceAccessByOrgSlugApi(orgIdFromHeader);
            workspaceId = workspace.id;
        } else {
            // Strict mode: no unscoped feature requests
            return NextResponse.json({ error: 'Missing x-org-id header' }, { status: 400 });
        }
        
        if (!supabase) {
            return NextResponse.json(
                { error: 'Database not configured' },
                { status: 500 }
            );
        }

        const searchParams = request.nextUrl.searchParams;
        const requestId = searchParams.get('id');
        const status = searchParams.get('status');
        const type = searchParams.get('type');
        const userId = searchParams.get('userId');

        // Check if user is admin
        const isAdmin = user.isSuperAdmin || user.role === 'מנכ״ל' || user.role === 'מנכ"ל' || user.role === 'אדמין';

        let query = supabase
            .from('misrad_feature_requests')
            .select('*')
            .order('created_at', { ascending: false });

        query = query.eq('tenant_id', workspaceId);

        // Filter by request ID
        if (requestId) {
            query = query.eq('id', requestId).limit(1);
        }

        // Filter by status
        if (status) {
            query = query.eq('status', status);
        }

        // Filter by type
        if (type) {
            query = query.eq('type', type);
        }

        // Admin can filter by user
        if (isAdmin && userId) {
            query = query.eq('user_id', userId);
        }

        const { data: requests, error } = await query;

        if (error) {
            console.error('[API] Error fetching feature requests:', error);
            return NextResponse.json(
                { error: 'שגיאה בטעינת בקשות פיצ\'רים' },
                { status: 500 }
            );
        }

        // Transform to match TypeScript interface
        const transformedRequests: FeatureRequest[] = (requests || []).map((req: any) => ({
            id: req.id,
            user_id: req.user_id,
            tenant_id: req.tenant_id,
            title: req.title,
            description: req.description,
            type: req.type,
            status: req.status,
            priority: req.priority,
            votes: Array.isArray(req.votes) ? req.votes : [],
            creatorId: req.user_id, // Legacy field
            createdAt: req.created_at,
            updated_at: req.updated_at,
            assigned_to: req.assigned_to,
            reviewed_by: req.reviewed_by,
            reviewed_at: req.reviewed_at,
            completed_at: req.completed_at,
            admin_notes: req.admin_notes,
            rejection_reason: req.rejection_reason,
            metadata: req.metadata || {}
        }));

        if (requestId) {
            return NextResponse.json(transformedRequests[0] || null);
        }

        return NextResponse.json({ requests: transformedRequests });

    } catch (error: any) {
        console.error('[API] Error in /api/features GET:', error);
        return NextResponse.json(
            { error: error.message || 'שגיאה בטעינת בקשות פיצ\'רים' },
            { status: error.message?.includes('Unauthorized') ? 401 : 500 }
        );
    }
}

async function POSTHandler(request: NextRequest) {
    try {
        const user = await getAuthenticatedUser();

        const orgIdFromHeader = request.headers.get('x-org-id') || request.headers.get('x-orgid');
        let workspaceId: string | null = null;
        if (orgIdFromHeader) {
            const workspace = await requireWorkspaceAccessByOrgSlugApi(orgIdFromHeader);
            workspaceId = workspace.id;
        } else {
            // Strict mode: no unscoped feature requests
            return NextResponse.json({ error: 'Missing x-org-id header' }, { status: 400 });
        }
        
        if (!supabase) {
            return NextResponse.json(
                { error: 'Database not configured' },
                { status: 500 }
            );
        }

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

        // Create feature request
        const requestData = {
            user_id: user.id,
            tenant_id: workspaceId,
            title: title.trim(),
            description: description.trim(),
            type: type,
            priority: priority || 'medium',
            status: 'pending',
            votes: [],
            metadata: {}
        };

        const { data: featureRequest, error: createError } = await supabase
            .from('misrad_feature_requests')
            .insert(requestData)
            .select()
            .single();

        if (createError) {
            console.error('[API] Error creating feature request:', createError);
            return NextResponse.json(
                { error: 'שגיאה ביצירת בקשת פיצ\'ר' },
                { status: 500 }
            );
        }

        // Transform response
        const transformedRequest: FeatureRequest = {
            id: featureRequest.id,
            user_id: featureRequest.user_id,
            tenant_id: featureRequest.tenant_id,
            title: featureRequest.title,
            description: featureRequest.description,
            type: featureRequest.type,
            status: featureRequest.status,
            priority: featureRequest.priority,
            votes: Array.isArray(featureRequest.votes) ? featureRequest.votes : [],
            creatorId: featureRequest.user_id,
            createdAt: featureRequest.created_at,
            updated_at: featureRequest.updated_at,
            assigned_to: featureRequest.assigned_to,
            reviewed_by: featureRequest.reviewed_by,
            reviewed_at: featureRequest.reviewed_at,
            completed_at: featureRequest.completed_at,
            admin_notes: featureRequest.admin_notes,
            rejection_reason: featureRequest.rejection_reason,
            metadata: featureRequest.metadata || {}
        };

        return NextResponse.json({
            success: true,
            request: transformedRequest,
            message: 'בקשת פיצ\'ר נוצרה בהצלחה'
        }, { status: 201 });

    } catch (error: any) {
        console.error('[API] Error in /api/features POST:', error);
        return NextResponse.json(
            { error: error.message || 'שגיאה ביצירת בקשת פיצ\'ר' },
            { status: error.message?.includes('Unauthorized') ? 401 : 500 }
        );
    }
}

export const GET = shabbatGuard(GETHandler);

export const POST = shabbatGuard(POSTHandler);
