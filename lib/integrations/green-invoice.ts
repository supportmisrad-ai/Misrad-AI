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

import { supabase } from '../supabase';

// Green Invoice API base URL
const GREEN_INVOICE_API_URL = 'https://api.greeninvoice.co.il/api/v1';

/**
 * Get Green Invoice API key for user
 * 
 * @param userId - User ID
 * @returns API key or null if not configured
 */
export async function getGreenInvoiceApiKey(userId: string, organizationId: string): Promise<string | null> {
    if (!supabase) {
        console.error('[Green Invoice] Supabase not configured');
        return null;
    }

    const orgId = String(organizationId || '').trim();
    if (!orgId) {
        console.error('[Green Invoice] Missing organizationId (Tenant Isolation lockdown)');
        return null;
    }

    try {
        const { data: integration, error } = await supabase
            .from('misrad_integrations')
            .select('access_token, is_active')
            .eq('user_id', userId)
            .eq('organization_id', orgId)
            .eq('service_type', 'green_invoice')
            .eq('is_active', true)
            .single();

        if (error || !integration) {
            return null;
        }

        // In Green Invoice, access_token stores the API key
        return integration.access_token || null;
    } catch (error) {
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
        const payload: any = {
            type: 320, // Invoice type (320 = Invoice)
            client: invoiceData.clientId || {
                name: invoiceData.clientName,
                emails: invoiceData.clientEmail ? [invoiceData.clientEmail] : [],
                phones: invoiceData.clientPhone ? [invoiceData.clientPhone] : []
            },
            payment: {
                method: invoiceData.paymentMethod || 'bank_transfer',
                date: invoiceData.dueDate || new Date().toISOString().split('T')[0]
            },
            items: invoiceData.items.map(item => ({
                description: item.description,
                quantity: item.quantity,
                price: item.price,
                vatRate: item.vatRate || 17
            })),
            currency: invoiceData.currency || 'ILS',
            notes: invoiceData.notes || ''
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
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(errorData.error || `Green Invoice API error: ${response.status}`);
        }

        const result = await response.json();

        // Update last sync time
        if (supabase) {
            // Get existing metadata first
            const existingMetadata = await supabase
                .from('misrad_integrations')
                .select('metadata')
                .eq('user_id', userId)
                .eq('organization_id', String(organizationId || '').trim())
                .eq('service_type', 'green_invoice')
                .single();
            
            await supabase
                .from('misrad_integrations')
                .update({ 
                    last_synced_at: new Date().toISOString(),
                    metadata: {
                        ...(existingMetadata.data?.metadata || {}),
                        lastInvoiceId: result.id,
                        lastInvoiceNumber: result.number
                    }
                })
                .eq('user_id', userId)
                .eq('organization_id', String(organizationId || '').trim())
                .eq('service_type', 'green_invoice')
                .eq('is_active', true);
        }

        return {
            invoiceId: result.id,
            invoiceNumber: result.number,
            invoiceUrl: result.url || '',
            pdfUrl: result.pdfUrl
        };

    } catch (error: any) {
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
): Promise<any> {
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
    } catch (error: any) {
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
): Promise<any[]> {
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

        const result = await response.json();
        return result.data || [];
    } catch (error: any) {
        console.error('[Green Invoice] Error listing invoices:', error);
        throw error;
    }
}

