/**
 * API Route: Create Invoice via Green Invoice
 * POST /api/integrations/green-invoice/create
 * 
 * Creates an invoice using Green Invoice API
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { createInvoice } from '@/lib/integrations/green-invoice';
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

        const { workspaceId } = await getWorkspaceOrThrow(request);

        if (!clerkUser.email) {
            return NextResponse.json(
                { error: 'User email not found' },
                { status: 400 }
            );
        }

        const supabase = createClient();

        // 2. Find user in database
        const dbUserId = await selectDbUserId({ supabase, workspaceId: String(workspaceId), email: clerkUser.email });
        if (!dbUserId) {
            return NextResponse.json(
                { error: 'User not found in database. Please sync your account first.' },
                { status: 404 }
            );
        }

        // 2.5 Paywall: Trial invoice limit (total)
        // Rule: In trial, allow up to 2 invoices total. Block the 3rd.
        let isTrial = false;
        let integrationIdForUsage: string | null = null;
        let integrationMetadataForUsage: any = null;
        try {
            const { data: socialUser, error: socialUserError } = await supabase
                .from('social_users')
                .select('id')
                .eq('clerk_user_id', String(clerkUser.id))
                .maybeSingle();

            if (socialUserError?.code === '42703') {
                throw new Error('[SchemaMismatch] social_users is missing expected columns');
            }

            const socialUserId = (socialUser as any)?.id ? String((socialUser as any).id) : null;
            if (socialUserId && workspaceId) {
                const { data: tm, error: tmError } = await supabase
                    .from('social_team_members')
                    .select('subscription_status')
                    .eq('user_id', socialUserId)
                    .eq('organization_id', String(workspaceId))
                    .maybeSingle();

                if (tmError?.code === '42703') {
                    throw new Error('[SchemaMismatch] social_team_members is missing organization_id');
                }

                const subscriptionStatus = (tm as any)?.subscription_status ? String((tm as any).subscription_status) : 'trial';
                isTrial = subscriptionStatus === 'trial';

                if (isTrial) {
                    const { data: integration } = await supabase
                        .from('misrad_integrations')
                        .select('id, metadata')
                        .eq('organization_id', String(workspaceId))
                        .eq('user_id', String(dbUserId))
                        .eq('service_type', 'green_invoice')
                        .eq('is_active', true)
                        .maybeSingle();

                    integrationIdForUsage = (integration as any)?.id ? String((integration as any).id) : null;
                    integrationMetadataForUsage = (integration as any)?.metadata || {};
                    const totalTrialInvoices = Number((integrationMetadataForUsage as any)?.total_trial_invoices || 0);

                    if (totalTrialInvoices >= 2) {
                        return NextResponse.json(
                            {
                                error: 'אהבת? שדרג כדי להוציא חשבוניות ללא הגבלה',
                                code: 'UPGRADE_REQUIRED',
                                paywall: {
                                    title: 'שדרוג נדרש כדי להוציא חשבוניות',
                                    message: 'אהבת? שדרג כדי להוציא חשבוניות ללא הגבלה',
                                    recommendedPackageType: 'the_operator'
                                }
                            },
                            { status: 402 }
                        );
                    }
                }
            }
        } catch (e: any) {
            if (String(e?.message || '').includes('[SchemaMismatch]')) {
                throw e;
            }
            // Best-effort: do not block invoice creation if paywall check fails
        }

        // 3. Parse request body
        const body = await request.json();
        const {
            clientName,
            clientEmail,
            clientPhone,
            clientId, // Optional: Green Invoice client ID
            items, // Array of { description, quantity, price, vatRate? }
            currency,
            paymentMethod,
            dueDate,
            notes,
            design // Optional: Custom design options { templateId?, primaryColor?, secondaryColor?, logoUrl?, fontFamily?, headerText?, footerText? }
        } = body;

        // Validate required fields
        if (!clientName || !items || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json(
                { 
                    error: 'Missing required fields',
                    required: ['clientName', 'items']
                },
                { status: 400 }
            );
        }

        // Validate items
        for (const item of items) {
            if (!item.description || item.quantity === undefined || item.price === undefined) {
                return NextResponse.json(
                    { error: 'Each item must have description, quantity, and price' },
                    { status: 400 }
                );
            }
        }

        // 4. Create invoice via Green Invoice API
        const result = await createInvoice(dbUserId, {
            clientName,
            clientEmail,
            clientPhone,
            clientId,
            items,
            currency,
            paymentMethod,
            dueDate,
            notes,
            design // Pass design options if provided
        }, String(workspaceId));

        // 4.5 Paywall usage tracking: increment total trial invoices (no migration)
        if (isTrial && integrationIdForUsage) {
            try {
                const prevTotal = Number((integrationMetadataForUsage as any)?.total_trial_invoices || 0);
                const nextTotal = prevTotal + 1;

                await supabase
                    .from('misrad_integrations')
                    .update({
                        metadata: {
                            ...((integrationMetadataForUsage as any) || {}),
                            total_trial_invoices: nextTotal,
                        },
                        last_synced_at: new Date().toISOString(),
                    } as any)
                    .eq('id', String(integrationIdForUsage));
            } catch {
                // ignore
            }
        }

        return NextResponse.json({
            success: true,
            invoice: result
        }, { status: 201 });

    } catch (error: any) {
        console.error('[API] Error creating invoice:', error);
        if (error instanceof APIError) {
            return NextResponse.json({ error: error.message || 'Forbidden' }, { status: error.status });
        }
        return NextResponse.json(
            { error: error.message || 'Failed to create invoice' },
            { status: 500 }
        );
    }
}


export const POST = shabbatGuard(POSTHandler);
