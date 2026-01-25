/**
 * Announcements API
 * 
 * Handles creating, fetching, and deleting system announcements
 * - All users: recipientType = 'all'
 * - Super Admins only: recipientType = 'super_admins'
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '../../../lib/auth';
import { createClient } from '../../../lib/supabase';
import { getUsers } from '../../../lib/db';
import { requireWorkspaceAccessByOrgSlugApi } from '@/lib/server/workspace';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
async function GETHandler(request: NextRequest) {
    try {
        const user = await getAuthenticatedUser();

        let supabase: any;
        try {
            supabase = createClient();
        } catch (e: any) {
            console.error('[API] Supabase client init failed in GET /api/announcements:', e);
            return NextResponse.json(
                { error: e?.message || 'Database not configured' },
                { status: 500 }
            );
        }

        const orgHeader = request.headers.get('x-org-id') || request.headers.get('x-orgid');
        if (!orgHeader) {
            return NextResponse.json({ error: 'Missing x-org-id header' }, { status: 400 });
        }

        const workspace = await requireWorkspaceAccessByOrgSlugApi(orgHeader);

        // Get user from database by email
        if (!user.email) {
            return NextResponse.json(
                { error: 'User email not found' },
                { status: 400 }
            );
        }

        const dbUsers = await getUsers({ email: user.email, tenantId: workspace.id });
        const dbUser = dbUsers.length > 0 ? dbUsers[0] : null;

        if (!dbUser) {
            return NextResponse.json({ announcements: [] }, { status: 200 });
        }

        // Determine which announcements to show
        const isSuperAdmin = dbUser.isSuperAdmin === true;
        
        // Fetch announcements for this user (scoped to workspace)
        const baseQuery = () => supabase
            .from('announcements')
            .select('*')
            .or(`recipient_type.eq.all${isSuperAdmin ? ',recipient_type.eq.super_admins' : ''}`)
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(50);

        const byOrg = await baseQuery().eq('organization_id', workspace.id);
        const announcements = (byOrg as any).data;
        let error = (byOrg as any).error;

        if (error?.code === '42703') {
            const byTenant = await baseQuery().eq('tenant_id', workspace.id);
            error = (byTenant as any).error;
            if (error?.code === '42703') {
                // Fail closed: announcements table exists but is not tenant-scoped.
                return NextResponse.json({ announcements: [] }, { status: 200 });
            }
            return NextResponse.json({ announcements: (byTenant as any).data || [] }, { status: 200 });
        }

        if (error) {
            // The project schema currently does not include an `announcements` table.
            // Fail soft to keep the SaaS console usable.
            const msg = String((error as any)?.message || '').toLowerCase();
            if (msg.includes('could not find the table') || msg.includes('schema cache')) {
                return NextResponse.json({ announcements: [] }, { status: 200 });
            }

            console.error('[API] Error fetching announcements:', error);
            return NextResponse.json(
                { error: 'שגיאה בטעינת הודעות' },
                { status: 500 }
            );
        }

        return NextResponse.json({ announcements: announcements || [] }, { status: 200 });

    } catch (error: any) {
        console.error('[API] Error in GET /api/announcements:', error);
        return NextResponse.json(
            { error: error.message || 'שגיאה בטעינת הודעות' },
            { status: 500 }
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
            console.error('[API] Supabase client init failed in POST /api/announcements:', e);
            return NextResponse.json(
                { error: e?.message || 'Database not configured' },
                { status: 500 }
            );
        }

        const orgHeader = request.headers.get('x-org-id') || request.headers.get('x-orgid');
        if (!orgHeader) {
            return NextResponse.json({ error: 'Missing x-org-id header' }, { status: 400 });
        }

        const workspace = await requireWorkspaceAccessByOrgSlugApi(orgHeader);

        // Get user from database first to check permissions
        if (!user.email) {
            return NextResponse.json(
                { error: 'User email not found' },
                { status: 400 }
            );
        }

        const dbUsers = await getUsers({ email: user.email, tenantId: workspace.id });
        const dbUser = dbUsers.length > 0 ? dbUsers[0] : null;

        if (!dbUser) {
            return NextResponse.json(
                { error: 'User not found in database' },
                { status: 404 }
            );
        }

        // Only Super Admins can create announcements
        if (!dbUser.isSuperAdmin) {
            return NextResponse.json(
                { error: 'Forbidden - Only Super Admins can create announcements' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { title, message, recipientType } = body;

        if (!title || !message || !recipientType) {
            return NextResponse.json(
                { error: 'Missing required fields: title, message, recipientType' },
                { status: 400 }
            );
        }

        if (!['all', 'super_admins'].includes(recipientType)) {
            return NextResponse.json(
                { error: 'Invalid recipientType. Must be "all" or "super_admins"' },
                { status: 400 }
            );
        }

        // Create announcement (scoped to workspace)
        const byOrg = await supabase
            .from('announcements')
            .insert({
                organization_id: workspace.id,
                title,
                message,
                recipient_type: recipientType,
                created_by: dbUser.id,
                is_active: true
            })
            .select()
            .single();

        let announcement = (byOrg as any).data;
        let error = (byOrg as any).error;

        if (error?.code === '42703') {
            const byTenant = await supabase
                .from('announcements')
                .insert({
                    tenant_id: workspace.id,
                    title,
                    message,
                    recipient_type: recipientType,
                    created_by: dbUser.id,
                    is_active: true
                })
                .select()
                .single();
            announcement = (byTenant as any).data;
            error = (byTenant as any).error;
        }

        if (error) {
            const msg = String((error as any)?.message || '').toLowerCase();
            if (msg.includes('could not find the table') || msg.includes('schema cache')) {
                return NextResponse.json(
                    { error: 'Announcements table is not configured in the database' },
                    { status: 501 }
                );
            }

            console.error('[API] Error creating announcement:', error);
            return NextResponse.json(
                { error: 'שגיאה ביצירת הודעה' },
                { status: 500 }
            );
        }

        // Create notifications for all eligible users
        let eligibleUsers: any[] = [];
        
        if (recipientType === 'all') {
            // Get all users in this workspace
            const allUsers = await getUsers({ tenantId: workspace.id });
            eligibleUsers = allUsers;
        } else if (recipientType === 'super_admins') {
            // Get only Super Admins in this workspace
            const allUsers = await getUsers({ tenantId: workspace.id });
            eligibleUsers = allUsers.filter((u: any) => u.isSuperAdmin === true);
        }

        // Create notifications for each eligible user
        if (eligibleUsers.length > 0) {
            const notifications = eligibleUsers.map((u: any) => ({
                organization_id: workspace.id,
                recipient_id: u.id,
                type: 'system',
                text: title,
                actor_name: dbUser.name || 'מערכת',
                related_id: announcement.id,
                is_read: false,
                metadata: {
                    announcementId: announcement.id,
                    message: message
                }
            }));

            // Insert notifications in batches (Supabase limit is 1000 per insert)
            const batchSize = 500;
            for (let i = 0; i < notifications.length; i += batchSize) {
                const batch = notifications.slice(i, i + batchSize);
                const { error: notifError } = await supabase
                    .from('misrad_notifications')
                    .insert(batch);

                if (notifError) {
                    console.error('[API] Error creating notifications:', notifError);
                    // Continue even if notifications fail
                }
            }
        }

        return NextResponse.json({ announcement }, { status: 201 });

    } catch (error: any) {
        console.error('[API] Error in POST /api/announcements:', error);
        return NextResponse.json(
            { error: error.message || 'שגיאה ביצירת הודעה' },
            { status: 500 }
        );
    }
}


export const GET = shabbatGuard(GETHandler);

export const POST = shabbatGuard(POSTHandler);
