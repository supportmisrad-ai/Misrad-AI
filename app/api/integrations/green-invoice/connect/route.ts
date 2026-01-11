/**
 * API Route: Connect Green Invoice
 * POST /api/integrations/green-invoice/connect
 * 
 * Connects user's Green Invoice account by storing API key
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { getUsers } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { requireWorkspaceAccessByOrgSlugApi } from '@/lib/server/workspace';

export async function POST(request: NextRequest) {
    try {
        const orgIdFromHeader = request.headers.get('x-org-id') || request.headers.get('x-orgid');
        if (orgIdFromHeader) {
            await requireWorkspaceAccessByOrgSlugApi(orgIdFromHeader);
        }
        // 1. Authenticate user
        let clerkUser;
        try {
            clerkUser = await getAuthenticatedUser();
        } catch (authError: any) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        if (!clerkUser.email) {
            return NextResponse.json(
                { error: 'User email not found' },
                { status: 400 }
            );
        }

        // 2. Find user in database
        const dbUsers = await getUsers({ email: clerkUser.email });
        const user = dbUsers.length > 0 ? dbUsers[0] : null;

        if (!user) {
            return NextResponse.json(
                { error: 'User not found in database. Please sync your account first.' },
                { status: 404 }
            );
        }

        if (!supabase) {
            return NextResponse.json(
                { error: 'Database not configured' },
                { status: 500 }
            );
        }

        // 3. Parse request body
        const body = await request.json();
        const { apiKey } = body;

        if (!apiKey || typeof apiKey !== 'string') {
            return NextResponse.json(
                { error: 'API key is required' },
                { status: 400 }
            );
        }

        // 4. Check if integration already exists
        const { data: existingIntegration, error: checkError } = await supabase
            .from('misrad_integrations')
            .select('id')
            .eq('user_id', user.id)
            .eq('service_type', 'green_invoice')
            .maybeSingle();

        if (checkError && checkError.code !== 'PGRST116') {
            console.error('[API] Error checking existing integration:', checkError);
            throw new Error('Failed to check existing integration');
        }

        if (existingIntegration) {
            // Update existing integration
            const { error: updateError } = await supabase
                .from('misrad_integrations')
                .update({
                    access_token: apiKey,
                    is_active: true,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existingIntegration.id);

            if (updateError) {
                console.error('[API] Error updating integration:', updateError);
                throw new Error('Failed to update integration');
            }
        } else {
            // Create new integration - use Supabase directly since createRecord doesn't support integrations
            const { error: insertError } = await supabase
                .from('misrad_integrations')
                .insert({
                    user_id: user.id,
                    tenant_id: null, // Can be set if needed
                    service_type: 'green_invoice',
                    access_token: apiKey,
                    token_type: 'Bearer',
                    is_active: true,
                    metadata: {
                        connectedAt: new Date().toISOString()
                    },
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                });

            if (insertError) {
                console.error('[API] Error creating integration:', insertError);
                throw new Error(`Failed to create integration: ${insertError.message}`);
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Green Invoice account connected successfully'
        });

    } catch (error: any) {
        console.error('[API] Error connecting Green Invoice:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to connect Green Invoice' },
            { status: 500 }
        );
    }
}

