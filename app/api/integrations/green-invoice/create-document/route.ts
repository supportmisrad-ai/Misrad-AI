import { asObject, getErrorMessage } from '@/lib/shared/unknown';
/**
 * API Route: Create Document via Green Invoice
 * POST /api/integrations/green-invoice/create-document
 *
 * Creates any document type (quote, receipt, invoice-receipt, credit note, etc.)
 * using Green Invoice API.
 *
 * Body: { documentType: number, clientName, items[], ... }
 *
 * Document types:
 *   100 = הצעת מחיר (Quote)
 *   305 = חשבונית מס / קבלה (Invoice Receipt)
 *   320 = חשבונית (Invoice)
 *   400 = קבלה (Receipt)
 *   330 = חשבונית זיכוי (Credit Note)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import {
    createDocument,
    GreenInvoiceDocumentType,
    DOCUMENT_TYPE_LABELS,
    type GreenInvoiceDocumentTypeValue,
} from '@/lib/integrations/green-invoice';
import prisma from '@/lib/prisma';
import { APIError, getWorkspaceOrThrow } from '@/lib/server/api-workspace';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

const IS_PROD = process.env.NODE_ENV === 'production';

const VALID_DOCUMENT_TYPES = new Set(Object.values(GreenInvoiceDocumentType));

type GreenInvoicePaymentMethod = 'cash' | 'bank_transfer' | 'credit_card' | 'check';

type InvoiceItemInput = {
    description: string;
    quantity: number;
    price: number;
    vatRate?: number;
};

type InvoiceDesignInput = {
    templateId?: number;
    primaryColor?: string;
    secondaryColor?: string;
    logoUrl?: string;
    fontFamily?: string;
    headerText?: string;
    footerText?: string;
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
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { workspaceId } = await getWorkspaceOrThrow(request);

        if (!clerkUser.email) {
            return NextResponse.json({ error: 'User email not found' }, { status: 400 });
        }

        // 2. Find user in database
        const dbUserId = await selectDbUserId({ workspaceId: String(workspaceId), email: clerkUser.email });
        if (!dbUserId) {
            return NextResponse.json(
                { error: 'User not found in database. Please sync your account first.' },
                { status: 404 }
            );
        }

        // 2.1 GUARD: Verify Green Invoice integration is connected
        const activeIntegration = await prisma.misradIntegration.findFirst({
            where: {
                tenant_id: String(workspaceId),
                user_id: String(dbUserId),
                service_type: 'green_invoice',
                is_active: true,
            },
            select: { id: true, access_token: true },
        });
        if (!activeIntegration?.access_token) {
            return NextResponse.json(
                { error: 'אינטגרציה לחשבונית ירוקה לא מחוברת. יש לחבר את החשבון דרך הגדרות → אינטגרציות.', code: 'INTEGRATION_NOT_CONNECTED' },
                { status: 403 }
            );
        }

        // 3. Parse request body
        const body: unknown = await request.json();
        const bodyObj = asObject(body) ?? {};

        // Validate document type
        const documentTypeRaw = bodyObj.documentType;
        const documentType = Number(documentTypeRaw);
        if (!Number.isFinite(documentType) || !VALID_DOCUMENT_TYPES.has(documentType as GreenInvoiceDocumentTypeValue)) {
            return NextResponse.json(
                {
                    error: 'סוג מסמך לא תקין',
                    validTypes: Object.entries(DOCUMENT_TYPE_LABELS).map(([type, label]) => ({ type: Number(type), label })),
                },
                { status: 400 }
            );
        }

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
                    required: ['documentType', 'clientName', 'items']
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

            items.push({ description, quantity, price, vatRate });
        }

        // 4. Create document via Green Invoice API
        const result = await createDocument(
            dbUserId,
            documentType as GreenInvoiceDocumentTypeValue,
            {
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
            },
            String(workspaceId)
        );

        return NextResponse.json({
            success: true,
            document: result,
        }, { status: 201 });

    } catch (error: unknown) {
        if (IS_PROD) console.error('[API] Error creating document');
        else console.error('[API] Error creating document:', error);
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
        const safeMsg = 'Failed to create document';
        return NextResponse.json(
            { error: IS_PROD ? safeMsg : message || safeMsg },
            { status: 500 }
        );
    }
}

export const POST = shabbatGuard(POSTHandler);
