/**
 * API Route: Create Invoice via Green Invoice
 * POST /api/integrations/green-invoice/create
 * 
 * Creates an invoice using Green Invoice API
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { getUsers } from '@/lib/db';
import { createInvoice } from '@/lib/integrations/green-invoice';
import { requireWorkspaceAccessByOrgSlugApi } from '@/lib/server/workspace';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
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

        const orgIdFromHeader = request.headers.get('x-org-id') || request.headers.get('x-orgid');
        let workspaceId: string | null = null;
        if (orgIdFromHeader) {
            const workspace = await requireWorkspaceAccessByOrgSlugApi(orgIdFromHeader);
            workspaceId = workspace.id;
        } else {
            // Strict mode: no unscoped integration actions
            return NextResponse.json(
                { error: 'Missing x-org-id header' },
                { status: 400 }
            );
        }

        if (!clerkUser.email) {
            return NextResponse.json(
                { error: 'User email not found' },
                { status: 400 }
            );
        }

        // 2. Find user in database
        const dbUsers = await getUsers({ email: clerkUser.email, tenantId: workspaceId ?? undefined });
        const user = dbUsers.length > 0 ? dbUsers[0] : null;

        if (!user) {
            return NextResponse.json(
                { error: 'User not found in database. Please sync your account first.' },
                { status: 404 }
            );
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
        const result = await createInvoice(user.id, {
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
        });

        return NextResponse.json({
            success: true,
            invoice: result
        }, { status: 201 });

    } catch (error: any) {
        console.error('[API] Error creating invoice:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to create invoice' },
            { status: 500 }
        );
    }
}


export const POST = shabbatGuard(POSTHandler);
