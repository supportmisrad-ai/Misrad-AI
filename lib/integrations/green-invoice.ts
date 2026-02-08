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
        const integration = await prisma.scale_integrations.findFirst({
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
export async function createInvoice(
    userId: string,
    invoiceData: {
        clientName: string;
        clientEmail?: string;
        clientPhone?: string;
        clientId?: string; // Green Invoice client ID (if exists)
        items: Array<{
            description: string;
            quantity: number;
            price: number;
            vatRate?: number; // Default: 17%
        }>;
        currency?: string; // Default: 'ILS'
        paymentMethod?: 'cash' | 'bank_transfer' | 'credit_card' | 'check';
        dueDate?: string; // ISO date string
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
    }
    ,
    organizationId: string
): Promise<{
    invoiceId: string;
    invoiceNumber: string;
    invoiceUrl: string;
    pdfUrl?: string;
} | null> {
    const apiKey = await getGreenInvoiceApiKey(userId, organizationId);
    
    if (!apiKey) {
        throw new Error('Green Invoice API key not configured. Please connect your account first.');
    }

    try {
        // Prepare invoice payload for Green Invoice API
        const payload: GreenInvoiceDocumentCreatePayload = {
            type: 320, // Invoice type (320 = Invoice)
            client: invoiceData.clientId
                ? String(invoiceData.clientId)
                : {
                    name: String(invoiceData.clientName),
                    emails: invoiceData.clientEmail ? [String(invoiceData.clientEmail)] : [],
                    phones: invoiceData.clientPhone ? [String(invoiceData.clientPhone)] : [],
                },
            payment: {
                method: String(invoiceData.paymentMethod || 'bank_transfer'),
                date: String(invoiceData.dueDate || new Date().toISOString().split('T')[0]),
            },
            items: invoiceData.items.map((item): GreenInvoiceDocumentItemPayload => ({
                description: String(item.description),
                quantity: Number(item.quantity),
                price: Number(item.price),
                vatRate: Number(item.vatRate ?? 17) || 17,
            })),
            currency: String(invoiceData.currency || 'ILS'),
            notes: String(invoiceData.notes || ''),
        };

        // Add custom design options if provided
        if (invoiceData.design) {
            if (invoiceData.design.templateId) {
                payload.templateId = invoiceData.design.templateId;
            }
            if (invoiceData.design.primaryColor) {
                payload.primaryColor = invoiceData.design.primaryColor;
            }
            if (invoiceData.design.secondaryColor) {
                payload.secondaryColor = invoiceData.design.secondaryColor;
            }
            if (invoiceData.design.logoUrl) {
                payload.logoUrl = invoiceData.design.logoUrl;
            }
            if (invoiceData.design.fontFamily) {
                payload.fontFamily = invoiceData.design.fontFamily;
            }
            if (invoiceData.design.headerText) {
                payload.headerText = invoiceData.design.headerText;
            }
            if (invoiceData.design.footerText) {
                payload.footerText = invoiceData.design.footerText;
            }
        }

        // Call Green Invoice API
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
            captureIntegrationException(parsed.error, { action: 'createInvoice', stage: 'parse_response' });
            throw new Error('Green Invoice API returned unexpected response');
        }
        const result: GreenInvoiceDocumentResponse = parsed.data;

        // Update last sync time
        const orgId = String(organizationId || '').trim();
        if (orgId) {
            const existing = await prisma.scale_integrations.findFirst({
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
                await prisma.scale_integrations.update({
                    where: { id: String(existing.id) },
                    data: {
                        last_synced_at: new Date(),
                        metadata: {
                            ...prevMeta,
                            lastInvoiceId: String(result.id),
                            lastInvoiceNumber: String(result.number),
                        },
                        updated_at: new Date(),
                    },
                });
            }
        }

        return {
            invoiceId: String(result.id),
            invoiceNumber: String(result.number),
            invoiceUrl: result.url ? String(result.url) : '',
            pdfUrl: result.pdfUrl ? String(result.pdfUrl) : undefined
        };

    } catch (error: unknown) {
        captureIntegrationException(error, { action: 'createInvoice', userId: String(userId), organizationId: String(organizationId) });
        console.error('[Green Invoice] Error creating invoice:', error);
        throw error;
    }
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

