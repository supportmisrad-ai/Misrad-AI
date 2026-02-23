import { asObject, getErrorMessage } from '@/lib/shared/unknown';
/**
 * Green Invoice (מורנינג) Integration
 * 
 * Handles invoice creation and management via Green Invoice API
 * 
 * API Documentation: https://www.greeninvoice.co.il/help-center/api/
 * 
 * Requirements:
 * - API Key from Green Invoice account (Best plan or higher)
 * - API Key must be stored securely in integrations table
 */

import prisma from '@/lib/prisma';
import * as Sentry from '@sentry/nextjs';
import { z } from 'zod';

// Green Invoice API base URL
const GREEN_INVOICE_API_URL = 'https://api.greeninvoice.co.il/api/v1';

function captureIntegrationException(error: unknown, context: Record<string, unknown>) {
    Sentry.withScope((scope) => {
        scope.setTag('layer', 'integration');
        scope.setTag('integration', 'green_invoice');
        for (const [k, v] of Object.entries(context)) {
            scope.setExtra(k, v);
        }
        Sentry.captureException(error);
    });
}


const GreenInvoiceApiErrorSchema = z
    .object({
        error: z.string().optional(),
        message: z.string().optional(),
    })
    .passthrough();

const GreenInvoiceDocumentResponseSchema = z
    .object({
        id: z.union([z.string(), z.number()]),
        number: z.union([z.string(), z.number()]),
        url: z.string().optional().nullable(),
        pdfUrl: z.string().optional().nullable(),
    })
    .passthrough();

type GreenInvoiceDocumentResponse = z.infer<typeof GreenInvoiceDocumentResponseSchema>;

const GreenInvoiceDocumentsListResponseSchema = z
    .object({
        data: z.array(z.unknown()).optional(),
    })
    .passthrough();

type GreenInvoiceDocumentsListResponse = z.infer<typeof GreenInvoiceDocumentsListResponseSchema>;

/**
 * Green Invoice Document Types
 * https://www.greeninvoice.co.il/help-center/api/
 */
export const GreenInvoiceDocumentType = {
    /** הצעת מחיר */
    QUOTE: 100,
    /** הזמנת עבודה */
    WORK_ORDER: 200,
    /** תעודת משלוח */
    DELIVERY_NOTE: 210,
    /** חשבונית (ללא קבלה) */
    INVOICE: 320,
    /** חשבונית מס / קבלה */
    INVOICE_RECEIPT: 305,
    /** קבלה */
    RECEIPT: 400,
    /** חשבונית זיכוי */
    CREDIT_NOTE: 330,
} as const;

export type GreenInvoiceDocumentTypeValue = (typeof GreenInvoiceDocumentType)[keyof typeof GreenInvoiceDocumentType];

export const DOCUMENT_TYPE_LABELS: Record<number, string> = {
    [GreenInvoiceDocumentType.QUOTE]: 'הצעת מחיר',
    [GreenInvoiceDocumentType.WORK_ORDER]: 'הזמנת עבודה',
    [GreenInvoiceDocumentType.DELIVERY_NOTE]: 'תעודת משלוח',
    [GreenInvoiceDocumentType.INVOICE]: 'חשבונית',
    [GreenInvoiceDocumentType.INVOICE_RECEIPT]: 'חשבונית מס / קבלה',
    [GreenInvoiceDocumentType.RECEIPT]: 'קבלה',
    [GreenInvoiceDocumentType.CREDIT_NOTE]: 'חשבונית זיכוי',
};

type GreenInvoiceClientPayload = {
    name: string;
    emails: string[];
    phones: string[];
};

type GreenInvoiceDocumentItemPayload = {
    description: string;
    quantity: number;
    price: number;
    vatRate: number;
};

type GreenInvoiceDocumentCreatePayload = {
    type: number;
    client: string | GreenInvoiceClientPayload;
    payment: {
        method: string;
        date: string;
    };
    items: GreenInvoiceDocumentItemPayload[];
    currency: string;
    notes: string;
    templateId?: number;
    primaryColor?: string;
    secondaryColor?: string;
    logoUrl?: string;
    fontFamily?: string;
    headerText?: string;
    footerText?: string;
};

/**
 * Get Green Invoice API key for user
 * 
 * @param userId - User ID
 * @returns API key or null if not configured
 */
export async function getGreenInvoiceApiKey(userId: string, organizationId: string): Promise<string | null> {
    const orgId = String(organizationId || '').trim();
    if (!orgId) {
        console.error('[Green Invoice] Missing organizationId (Tenant Isolation lockdown)');
        return null;
    }

    try {
        const integration = await prisma.misradIntegration.findFirst({
            where: {
                user_id: String(userId),
                tenant_id: String(orgId),
                service_type: 'green_invoice',
                is_active: true,
            },
            select: { access_token: true },
        });

        if (!integration) {
            return null;
        }

        // In Green Invoice, access_token stores the API key
        return integration.access_token ? String(integration.access_token) : null;
    } catch (error: unknown) {
        captureIntegrationException(error, { action: 'getGreenInvoiceApiKey', userId: String(userId), organizationId: orgId });
        console.error('[Green Invoice] Error getting API key:', error);
        return null;
    }
}

/**
 * Create invoice via Green Invoice API
 * 
 * @param userId - User ID
 * @param invoiceData - Invoice data
 * @returns Created invoice ID and URL
 */
export type DocumentInput = {
    clientName: string;
    clientEmail?: string;
    clientPhone?: string;
    clientId?: string;
    items: Array<{
        description: string;
        quantity: number;
        price: number;
        vatRate?: number;
    }>;
    currency?: string;
    paymentMethod?: 'cash' | 'bank_transfer' | 'credit_card' | 'check';
    dueDate?: string;
    notes?: string;
    design?: {
        templateId?: number;
        primaryColor?: string;
        secondaryColor?: string;
        logoUrl?: string;
        fontFamily?: string;
        headerText?: string;
        footerText?: string;
    };
};

export type DocumentResult = {
    documentId: string;
    documentNumber: string;
    documentUrl: string;
    pdfUrl?: string;
    documentType: number;
    documentTypeLabel: string;
};

/**
 * Generic document creation via Green Invoice API.
 * All specific functions (createInvoice, createQuote, createReceipt, etc.) delegate here.
 */
export async function createDocument(
    userId: string,
    documentType: GreenInvoiceDocumentTypeValue,
    data: DocumentInput,
    organizationId: string
): Promise<DocumentResult | null> {
    const apiKey = await getGreenInvoiceApiKey(userId, organizationId);

    if (!apiKey) {
        throw new Error('Green Invoice API key not configured. Please connect your account first.');
    }

    try {
        const payload: GreenInvoiceDocumentCreatePayload = {
            type: documentType,
            client: data.clientId
                ? String(data.clientId)
                : {
                    name: String(data.clientName),
                    emails: data.clientEmail ? [String(data.clientEmail)] : [],
                    phones: data.clientPhone ? [String(data.clientPhone)] : [],
                },
            payment: {
                method: String(data.paymentMethod || 'bank_transfer'),
                date: String(data.dueDate || new Date().toISOString().split('T')[0]),
            },
            items: data.items.map((item): GreenInvoiceDocumentItemPayload => ({
                description: String(item.description),
                quantity: Number(item.quantity),
                price: Number(item.price),
                vatRate: Number(item.vatRate ?? 17) || 17,
            })),
            currency: String(data.currency || 'ILS'),
            notes: String(data.notes || ''),
        };

        if (data.design) {
            if (data.design.templateId) payload.templateId = data.design.templateId;
            if (data.design.primaryColor) payload.primaryColor = data.design.primaryColor;
            if (data.design.secondaryColor) payload.secondaryColor = data.design.secondaryColor;
            if (data.design.logoUrl) payload.logoUrl = data.design.logoUrl;
            if (data.design.fontFamily) payload.fontFamily = data.design.fontFamily;
            if (data.design.headerText) payload.headerText = data.design.headerText;
            if (data.design.footerText) payload.footerText = data.design.footerText;
        }

        const response = await fetch(`${GREEN_INVOICE_API_URL}/documents`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorJson: unknown = await response.json().catch(() => ({ error: 'Unknown error' }));
            const parsedErr = GreenInvoiceApiErrorSchema.safeParse(errorJson);
            const msg = parsedErr.success
                ? (parsedErr.data.error || parsedErr.data.message || `Green Invoice API error: ${response.status}`)
                : `Green Invoice API error: ${response.status}`;
            throw new Error(String(msg));
        }

        const resultJson: unknown = await response.json();
        const parsed = GreenInvoiceDocumentResponseSchema.safeParse(resultJson);
        if (!parsed.success) {
            captureIntegrationException(parsed.error, { action: 'createDocument', stage: 'parse_response', documentType });
            throw new Error('Green Invoice API returned unexpected response');
        }
        const result: GreenInvoiceDocumentResponse = parsed.data;

        // Update last sync time
        const orgId = String(organizationId || '').trim();
        if (orgId) {
            const existing = await prisma.misradIntegration.findFirst({
                where: {
                    user_id: String(userId),
                    tenant_id: String(orgId),
                    service_type: 'green_invoice',
                    is_active: true,
                },
                select: { id: true, metadata: true },
            });

            const prevMeta = asObject(existing?.metadata) ?? {};
            if (existing?.id) {
                await prisma.misradIntegration.update({
                    where: { id: String(existing.id) },
                    data: {
                        last_synced_at: new Date(),
                        metadata: {
                            ...prevMeta,
                            lastDocumentId: String(result.id),
                            lastDocumentNumber: String(result.number),
                            lastDocumentType: documentType,
                        },
                        updated_at: new Date(),
                    },
                });
            }
        }

        return {
            documentId: String(result.id),
            documentNumber: String(result.number),
            documentUrl: result.url ? String(result.url) : '',
            pdfUrl: result.pdfUrl ? String(result.pdfUrl) : undefined,
            documentType,
            documentTypeLabel: DOCUMENT_TYPE_LABELS[documentType] || 'מסמך',
        };
    } catch (error: unknown) {
        captureIntegrationException(error, { action: 'createDocument', userId: String(userId), organizationId: String(organizationId), documentType });
        console.error(`[Green Invoice] Error creating document (type ${documentType}):`, error);
        throw error;
    }
}

/**
 * Create invoice (חשבונית) — type 320
 * Backward-compatible wrapper around createDocument
 */
export async function createInvoice(
    userId: string,
    invoiceData: DocumentInput,
    organizationId: string
): Promise<{
    invoiceId: string;
    invoiceNumber: string;
    invoiceUrl: string;
    pdfUrl?: string;
} | null> {
    const result = await createDocument(userId, GreenInvoiceDocumentType.INVOICE, invoiceData, organizationId);
    if (!result) return null;
    return {
        invoiceId: result.documentId,
        invoiceNumber: result.documentNumber,
        invoiceUrl: result.documentUrl,
        pdfUrl: result.pdfUrl,
    };
}

/**
 * Create quote / price proposal (הצעת מחיר) — type 100
 */
export async function createQuote(
    userId: string,
    quoteData: DocumentInput,
    organizationId: string
): Promise<DocumentResult | null> {
    return createDocument(userId, GreenInvoiceDocumentType.QUOTE, quoteData, organizationId);
}

/**
 * Create receipt (קבלה) — type 400
 */
export async function createReceipt(
    userId: string,
    receiptData: DocumentInput,
    organizationId: string
): Promise<DocumentResult | null> {
    return createDocument(userId, GreenInvoiceDocumentType.RECEIPT, receiptData, organizationId);
}

/**
 * Create invoice + receipt combo (חשבונית מס / קבלה) — type 305
 */
export async function createInvoiceReceipt(
    userId: string,
    data: DocumentInput,
    organizationId: string
): Promise<DocumentResult | null> {
    return createDocument(userId, GreenInvoiceDocumentType.INVOICE_RECEIPT, data, organizationId);
}

/**
 * Get invoice by ID
 * 
 * @param userId - User ID
 * @param invoiceId - Green Invoice invoice ID
 * @returns Invoice data
 */
export async function getInvoice(
    userId: string,
    invoiceId: string,
    organizationId: string
): Promise<unknown> {
    const apiKey = await getGreenInvoiceApiKey(userId, organizationId);
    
    if (!apiKey) {
        throw new Error('Green Invoice API key not configured');
    }

    try {
        const response = await fetch(`${GREEN_INVOICE_API_URL}/documents/${invoiceId}`, {
            headers: {
                'Authorization': `Bearer ${apiKey}`
            }
        });

        if (!response.ok) {
            throw new Error(`Green Invoice API error: ${response.status}`);
        }

        return await response.json();
    } catch (error: unknown) {
        captureIntegrationException(error, { action: 'getInvoice', userId: String(userId), invoiceId: String(invoiceId), organizationId: String(organizationId) });
        console.error('[Green Invoice] Error getting invoice:', error);
        throw error;
    }
}

/**
 * List invoices
 * 
 * @param userId - User ID
 * @param filters - Optional filters (date range, status, etc.)
 * @returns Array of invoices
 */
export async function listInvoices(
    userId: string,
    organizationId: string,
    filters?: {
        fromDate?: string;
        toDate?: string;
        status?: 'draft' | 'sent' | 'paid' | 'cancelled';
        limit?: number;
    }
): Promise<unknown[]> {
    const apiKey = await getGreenInvoiceApiKey(userId, organizationId);
    
    if (!apiKey) {
        throw new Error('Green Invoice API key not configured');
    }

    try {
        const params = new URLSearchParams();
        if (filters?.fromDate) params.append('fromDate', String(filters.fromDate));
        if (filters?.toDate) params.append('toDate', String(filters.toDate));
        if (filters?.status) params.append('status', String(filters.status));
        if (filters?.limit) params.append('limit', String(filters.limit));

        const response = await fetch(`${GREEN_INVOICE_API_URL}/documents?${params.toString()}`, {
            headers: {
                'Authorization': `Bearer ${apiKey}`
            }
        });

        if (!response.ok) {
            throw new Error(`Green Invoice API error: ${response.status}`);
        }

        const resultJson: unknown = await response.json();
        const parsed = GreenInvoiceDocumentsListResponseSchema.safeParse(resultJson);
        if (!parsed.success) {
            captureIntegrationException(parsed.error, { action: 'listInvoices', stage: 'parse_response' });
            return [];
        }
        const result: GreenInvoiceDocumentsListResponse = parsed.data;
        return Array.isArray(result.data) ? result.data : [];
    } catch (error: unknown) {
        captureIntegrationException(error, { action: 'listInvoices', userId: String(userId), organizationId: String(organizationId) });
        console.error('[Green Invoice] Error listing invoices:', error);
        throw error;
    }
}

