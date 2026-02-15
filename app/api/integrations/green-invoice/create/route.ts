import { asObject, getErrorMessage } from '@/lib/shared/unknown';
/**
 * API Route: Create Invoice via Green Invoice
 * POST /api/integrations/green-invoice/create
 * 
 * Creates an invoice using Green Invoice API
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { createInvoice } from '@/lib/integrations/green-invoice';
import prisma from '@/lib/prisma';
import { APIError, getWorkspaceOrThrow } from '@/lib/server/api-workspace';
import { Prisma } from '@prisma/client';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

const IS_PROD = process.env.NODE_ENV === 'production';

type InvoiceItemInput = {
    description: string;
    quantity: number;
    price: number;
    vatRate?: number;
};

type GreenInvoicePaymentMethod = 'cash' | 'bank_transfer' | 'credit_card' | 'check';

type InvoiceDesignInput = {
    templateId?: number;
    primaryColor?: string;
    secondaryColor?: string;
    logoUrl?: string;
    fontFamily?: string;
    headerText?: string;
    footerText?: string;
};

type InvoiceCreateInput = {
    clientName: string;
    clientEmail?: string;
    clientPhone?: string;
    clientId?: string;
    items: InvoiceItemInput[];
    currency?: string;
    paymentMethod?: GreenInvoicePaymentMethod;
    dueDate?: string;
    notes?: string;
    design?: InvoiceDesignInput;
};

async function selectDbUserId(params: { workspaceId: string; email: string }): Promise<string | null> {
    const email = String(params.email || '').trim().toLowerCase();
    if (!email) return null;

    const row = await prisma.nexusUser.findFirst({
        where: {
            email,
            organizationId: String(params.workspaceId),
        },
        select: { id: true },
    });

    return row?.id ? String(row.id) : null;
}

async function POSTHandler(request: NextRequest) {
    try {
        // 1. Authenticate user
        let clerkUser;
        try {
            clerkUser = await getAuthenticatedUser();
        } catch {
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

        // 2. Find user in database
        const dbUserId = await selectDbUserId({ workspaceId: String(workspaceId), email: clerkUser.email });
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
        let integrationMetadataForUsage: Record<string, unknown> = {};
        try {
            const socialUser = await prisma.organizationUser.findUnique({
                where: { clerk_user_id: String(clerkUser.id) },
                select: { id: true },
            });
            const socialUserId = socialUser?.id ? String(socialUser.id) : null;
            if (socialUserId && workspaceId) {
                const tm = await prisma.teamMember.findFirst({
                    where: {
                        user_id: String(socialUserId),
                        organization_id: String(workspaceId),
                    },
                    select: { subscription_status: true },
                });

                const subscriptionStatus = tm?.subscription_status ? String(tm.subscription_status) : 'trial';
                isTrial = subscriptionStatus === 'trial';

                if (isTrial) {
                    const integration = await prisma.scale_integrations.findFirst({
                        where: {
                            tenant_id: String(workspaceId),
                            user_id: String(dbUserId),
                            service_type: 'green_invoice',
                            is_active: true,
                        },
                        select: { id: true, metadata: true },
                    });

                    integrationIdForUsage = integration?.id ? String(integration.id) : null;
                    const metadata = integration?.metadata;
                    if (typeof metadata === 'string') {
                        try {
                            integrationMetadataForUsage = asObject(JSON.parse(metadata)) ?? {};
                        } catch {
                            integrationMetadataForUsage = {};
                        }
                    } else {
                        integrationMetadataForUsage = asObject(metadata) ?? {};
                    }
                    const totalTrialInvoices = Number(integrationMetadataForUsage.total_trial_invoices ?? 0);

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
        } catch (e: unknown) {
            if (getErrorMessage(e).includes('[SchemaMismatch]')) {
                throw e;
            }
            // Best-effort: do not block invoice creation if paywall check fails
        }

        // 3. Parse request body
        const body: unknown = await request.json();
        const bodyObj = asObject(body) ?? {};

        const clientName = String(bodyObj.clientName ?? '').trim();
        const clientEmailRaw = bodyObj.clientEmail;
        const clientEmail = typeof clientEmailRaw === 'string' ? clientEmailRaw : clientEmailRaw == null ? undefined : String(clientEmailRaw);
        const clientPhoneRaw = bodyObj.clientPhone;
        const clientPhone = typeof clientPhoneRaw === 'string' ? clientPhoneRaw : clientPhoneRaw == null ? undefined : String(clientPhoneRaw);
        const clientIdRaw = bodyObj.clientId;
        const clientId = typeof clientIdRaw === 'string' ? clientIdRaw : clientIdRaw == null ? undefined : String(clientIdRaw);

        const itemsRaw = bodyObj.items;
        const itemsArray = Array.isArray(itemsRaw) ? itemsRaw : [];

        const currencyRaw = bodyObj.currency;
        const currency = typeof currencyRaw === 'string' ? currencyRaw : currencyRaw == null ? undefined : String(currencyRaw);
        const paymentMethodRaw = bodyObj.paymentMethod;
        const paymentMethodCandidate =
            typeof paymentMethodRaw === 'string'
                ? paymentMethodRaw
                : paymentMethodRaw == null
                    ? undefined
                    : String(paymentMethodRaw);

        const paymentMethod: GreenInvoicePaymentMethod | undefined =
            paymentMethodCandidate === 'cash' ||
            paymentMethodCandidate === 'bank_transfer' ||
            paymentMethodCandidate === 'credit_card' ||
            paymentMethodCandidate === 'check'
                ? paymentMethodCandidate
                : undefined;
        const dueDateRaw = bodyObj.dueDate;
        const dueDate = typeof dueDateRaw === 'string' ? dueDateRaw : dueDateRaw == null ? undefined : String(dueDateRaw);
        const notesRaw = bodyObj.notes;
        const notes = typeof notesRaw === 'string' ? notesRaw : notesRaw == null ? undefined : String(notesRaw);

        const designObj = asObject(bodyObj.design);
        const design: InvoiceDesignInput | undefined = designObj
            ? {
                templateId: designObj.templateId === undefined ? undefined : Number(designObj.templateId),
                primaryColor: designObj.primaryColor === undefined ? undefined : String(designObj.primaryColor),
                secondaryColor: designObj.secondaryColor === undefined ? undefined : String(designObj.secondaryColor),
                logoUrl: designObj.logoUrl === undefined ? undefined : String(designObj.logoUrl),
                fontFamily: designObj.fontFamily === undefined ? undefined : String(designObj.fontFamily),
                headerText: designObj.headerText === undefined ? undefined : String(designObj.headerText),
                footerText: designObj.footerText === undefined ? undefined : String(designObj.footerText),
            }
            : undefined;

        // Validate required fields
        if (!clientName || !Array.isArray(itemsArray) || itemsArray.length === 0) {
            return NextResponse.json(
                { 
                    error: 'Missing required fields',
                    required: ['clientName', 'items']
                },
                { status: 400 }
            );
        }

        // Validate items
        const items: InvoiceItemInput[] = [];
        for (const item of itemsArray) {
            const itemObj = asObject(item);
            if (!itemObj) {
                return NextResponse.json(
                    { error: 'Each item must have description, quantity, and price' },
                    { status: 400 }
                );
            }

            const description = String(itemObj.description ?? '').trim();
            const quantityRaw = itemObj.quantity;
            const priceRaw = itemObj.price;

            if (!description || quantityRaw === undefined || priceRaw === undefined) {
                return NextResponse.json(
                    { error: 'Each item must have description, quantity, and price' },
                    { status: 400 }
                );
            }

            const quantity = Number(quantityRaw);
            const price = Number(priceRaw);

            const vatRateRaw = itemObj.vatRate;
            const vatRate = vatRateRaw === undefined ? undefined : Number(vatRateRaw);

            items.push({
                description,
                quantity,
                price,
                vatRate,
            });
        }

        // 4. Create invoice via Green Invoice API
        const invoiceInput: InvoiceCreateInput = {
            clientName,
            clientEmail,
            clientPhone,
            clientId,
            items,
            currency,
            paymentMethod,
            dueDate,
            notes,
            design,
        };

        const result = await createInvoice(dbUserId, invoiceInput, String(workspaceId));

        // 4.5 Paywall usage tracking: increment total trial invoices (no migration)
        if (isTrial && integrationIdForUsage) {
            try {
                const prevTotal = Number(integrationMetadataForUsage.total_trial_invoices ?? 0);
                const nextTotal = prevTotal + 1;

                await prisma.scale_integrations.update({
                    where: { id: String(integrationIdForUsage) },
                    data: {
                        metadata: {
                            ...(integrationMetadataForUsage || {}),
                            total_trial_invoices: nextTotal,
                        } as Prisma.InputJsonValue,
                        last_synced_at: new Date(),
                        updated_at: new Date(),
                    },
                });
            } catch {
                // ignore
            }
        }

        return NextResponse.json({
            success: true,
            invoice: result
        }, { status: 201 });

    } catch (error: unknown) {
        if (IS_PROD) console.error('[API] Error creating invoice');
        else console.error('[API] Error creating invoice:', error);
        if (error instanceof APIError) {
            const safeMsg =
                error.status === 400
                    ? 'Bad request'
                    : error.status === 401
                        ? 'Unauthorized'
                        : error.status === 404
                            ? 'Not found'
                            : error.status === 500
                                ? 'Internal server error'
                                : 'Forbidden';
            return NextResponse.json(
                { error: IS_PROD ? safeMsg : error.message || safeMsg },
                { status: error.status }
            );
        }
        const message = getErrorMessage(error);
        const safeMsg = 'Failed to create invoice';
        return NextResponse.json(
            { error: IS_PROD ? safeMsg : message || safeMsg },
            { status: 500 }
        );
    }
}


export const POST = shabbatGuard(POSTHandler);
