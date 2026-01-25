/**
 * API Route: Revoke Google Integration
 * 
 * POST /api/integrations/google/revoke
 * 
 * Revokes and removes Google integration
 * 
 * Body:
 *   - serviceType: 'google_calendar' | 'google_drive'
 *   - integrationId: Optional - specific integration ID to revoke
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { revokeToken } from '@/lib/integrations/google-oauth';
import { supabase } from '@/lib/supabase';
import { getUsers } from '@/lib/db';
import { requireWorkspaceAccessByOrgSlugApi } from '@/lib/server/workspace';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
async function POSTHandler(request: NextRequest) {
    try {
        const orgIdFromHeader = request.headers.get('x-org-id') || request.headers.get('x-orgid');
        if (!orgIdFromHeader) {
            return NextResponse.json({ error: 'Missing x-org-id header' }, { status: 400 });
        }
        const workspace = await requireWorkspaceAccessByOrgSlugApi(orgIdFromHeader);
        const clerkUser = await getAuthenticatedUser();
        
        // Convert Clerk ID to Supabase UUID
        const dbUsers = await getUsers({ email: clerkUser.email, tenantId: workspace.id });
        const dbUser = dbUsers.length > 0 ? dbUsers[0] : null;
        
        if (!dbUser) {
            return NextResponse.json(
                { error: 'User not found in database. Please sync your account first.' },
                { status: 404 }
            );
        }
        
        const body = await request.json();
        const { serviceType, integrationId } = body;

        if (!serviceType || !['google_calendar', 'google_drive'].includes(serviceType)) {
            return NextResponse.json(
                { error: 'Invalid service type' },
                { status: 400 }
            );
        }

        if (!supabase) {
            throw new Error('Supabase not configured');
        }

        const sb = supabase;

        // Find integration(s) to revoke
        let query = sb
            .from('misrad_integrations')
            .select('*')
            .eq('user_id', dbUser.id) // Use Supabase UUID, not Clerk ID
            .eq('service_type', serviceType)
            .eq('is_active', true);

        if (integrationId) {
            query = query.eq('id', integrationId);
        }

        const { data: integrations, error: fetchError } = await query;

        if (fetchError) {
            console.error('[API] Error fetching integrations:', fetchError);
            throw new Error('Failed to fetch integrations');
        }

        if (!integrations || integrations.length === 0) {
            return NextResponse.json(
                { error: 'Integration not found' },
                { status: 404 }
            );
        }

        // Revoke tokens and delete integrations
        const revokePromises = integrations.map(async (integration: any) => {
            try {
                // Revoke token with Google
                if (integration.access_token) {
                    await revokeToken(integration.access_token);
                }
            } catch (error) {
                // Continue even if revocation fails (token might already be revoked)
                console.warn('[API] Error revoking token:', {
                    message: (error as any)?.message,
                    name: (error as any)?.name
                });
            }

            // Delete from database
            return sb
                .from('misrad_integrations')
                .delete()
                .eq('id', integration.id);
        });

        await Promise.all(revokePromises);

        return NextResponse.json({
            success: true,
            message: `${serviceType === 'google_calendar' ? 'Calendar' : 'Drive'} integration revoked successfully`
        });

    } catch (error: any) {
        console.error('[API] Error revoking Google integration:', {
            message: error?.message,
            name: error?.name
        });
        return NextResponse.json(
            { error: error.message || 'Failed to revoke integration' },
            { status: 500 }
        );
    }
}


export const POST = shabbatGuard(POSTHandler);
