/**
 * API Route: Connect Green Invoice
 * POST /api/integrations/green-invoice/connect
 * 
 * Connects user's Green Invoice account by storing API key
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
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

        const supabase = createClient();

        // 2. Find user in database
        const dbUserId = await selectDbUserId({ supabase, workspaceId: workspace.id, email: clerkUser.email });

        if (!dbUserId) {
            return NextResponse.json(
                { error: 'User not found in database. Please sync your account first.' },
                { status: 404 }
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
            .eq('user_id', dbUserId)
            .eq('organization_id', workspace.id)
            .eq('service_type', 'green_invoice')
            .maybeSingle();

        if (checkError && checkError.code !== 'PGRST116') {
            console.error('[API] Error checking existing integration:', checkError);
            if (checkError.code === '42703') {
                return NextResponse.json({ error: '[SchemaMismatch] misrad_integrations is missing organization_id' }, { status: 500 });
            }
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
                .eq('id', existingIntegration.id)
                .eq('organization_id', workspace.id);

            if (updateError) {
                console.error('[API] Error updating integration:', updateError);
                if (updateError.code === '42703') {
                    return NextResponse.json({ error: '[SchemaMismatch] misrad_integrations is missing organization_id' }, { status: 500 });
                }
                throw new Error('Failed to update integration');
            }
        } else {
            // Create new integration - use Supabase directly since createRecord doesn't support integrations
            const { error: insertError } = await supabase
                .from('misrad_integrations')
                .insert({
                    user_id: dbUserId,
                    organization_id: workspace.id,
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
                if (insertError.code === '42703') {
                    return NextResponse.json({ error: '[SchemaMismatch] misrad_integrations is missing organization_id' }, { status: 500 });
                }
                throw new Error(`Failed to create integration: ${insertError.message}`);
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Green Invoice account connected successfully'
        });

    } catch (error: any) {
        console.error('[API] Error connecting Green Invoice:', error);
        if (error instanceof APIError) {
            return NextResponse.json({ error: error.message || 'Forbidden' }, { status: error.status });
        }
        return NextResponse.json(
            { error: error.message || 'Failed to connect Green Invoice' },
            { status: 500 }
        );
    }
}


export const POST = shabbatGuard(POSTHandler);
