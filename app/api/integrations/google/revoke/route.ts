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
import { createClient } from '@/lib/supabase';
import { APIError, getWorkspaceOrThrow } from '@/lib/server/api-workspace';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

async function selectDbUserId(params: { supabase: any; workspaceId: string; email: string }): Promise<string | null> {
    const email = String(params.email || '').trim().toLowerCase();
    if (!email) return null;

    const byOrg = await params.supabase
        .from('nexus_users')
        .select('id')
        .eq('email', email)
        .eq('organization_id', params.workspaceId)
        .limit(1)
        .maybeSingle();

    if ((byOrg as any)?.error?.code === '42703') {
        throw new Error('[SchemaMismatch] nexus_users is missing organization_id');
    }

    return byOrg.data?.id ? String(byOrg.data.id) : null;
}
async function POSTHandler(request: NextRequest) {
    try {
        const { workspace } = await getWorkspaceOrThrow(request);
        const clerkUser = await getAuthenticatedUser();

        const sb = createClient();
        
        const dbUserId = await selectDbUserId({ supabase: sb, workspaceId: workspace.id, email: clerkUser.email });
        
        if (!dbUserId) {
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

        // Find integration(s) to revoke
        let query = sb
            .from('misrad_integrations')
            .select('*')
            .eq('user_id', dbUserId) // Use Supabase UUID, not Clerk ID
            .eq('organization_id', workspace.id)
            .eq('service_type', serviceType)
            .eq('is_active', true);

        if (integrationId) {
            query = query.eq('id', integrationId);
        }

        const { data: integrations, error: fetchError } = await query;

        if (fetchError) {
            console.error('[API] Error fetching integrations:', fetchError);
            if (fetchError.code === '42703') {
                return NextResponse.json({ error: '[SchemaMismatch] misrad_integrations is missing organization_id' }, { status: 500 });
            }
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
                .eq('id', integration.id)
                .eq('organization_id', workspace.id);
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
        if (error instanceof APIError) {
            return NextResponse.json({ error: error.message || 'Forbidden' }, { status: error.status });
        }
        return NextResponse.json(
            { error: error.message || 'Failed to revoke integration' },
            { status: 500 }
        );
    }
}


export const POST = shabbatGuard(POSTHandler);
