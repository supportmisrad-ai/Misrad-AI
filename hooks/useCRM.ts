'use client';

import { useState, useEffect } from 'react';
import { Client, Lead, Asset, Invoice, Product, Tenant, LeadStatus } from '../types';
import { DEFAULT_PRODUCTS } from '../constants';
import { getWorkspaceOrgIdFromPathname } from '@/lib/os/nexus-routing';

export const useCRM = (
    currentUser: any,
    addNotification: (n: any) => void,
    addToast: (m: string, t?: any) => void,
    applyTemplate: (templateId: string, clientId?: string, clientName?: string) => void // NEW DEPENDENCY
) => {
    const [clients, setClients] = useState<Client[]>([]);
    const [leads, setLeads] = useState<Lead[]>([]);
    const [assets, setAssets] = useState<Asset[]>([]);
    const [products, setProducts] = useState<Product[]>(DEFAULT_PRODUCTS);
    const [tenants, setTenants] = useState<Tenant[]>([]);
    
    // Invoices
    const [invoices, setInvoices] = useState<Invoice[]>([]);

    // Trash Bins
    const [trashClients, setTrashClients] = useState<Client[]>([]);
    const [trashLeads, setTrashLeads] = useState<Lead[]>([]);
    const [trashAssets, setTrashAssets] = useState<Asset[]>([]);

    // External Integration State
    const [isGreenInvoiceConnected, setIsGreenInvoiceConnected] = useState(false);
    const [incomingCall, setIncomingCall] = useState<any>(null);

    // --- Client Logic ---
    const addClient = (client: Client) => {
        setClients(prev => [...prev, client]);
        addToast('לקוח חדש נוסף', 'success');
    };

    const updateClient = (id: string, updates: Partial<Client>) => {
        setClients(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
        addToast('פרטי לקוח עודכנו', 'success');
    };

    const deleteClient = (id: string) => {
        const client = clients.find(c => c.id === id);
        if (client) {
            setTrashClients(prev => [client, ...prev]);
            setClients(prev => prev.filter(c => c.id !== id));
            addToast('לקוח הועבר לסל המיחזור', 'info');
        }
    };

    const restoreClient = (id: string) => {
        const client = trashClients.find(c => c.id === id);
        if (client) {
            setClients(prev => [...prev, client]);
            setTrashClients(prev => prev.filter(c => c.id !== id));
            addToast('לקוח שוחזר בהצלחה', 'success');
        }
    };

    const permanentlyDeleteClient = (id: string) => {
        setTrashClients(prev => prev.filter(c => c.id !== id));
        addToast('לקוח נמחק לצמיתות', 'warning');
    };

    // --- Lead Logic ---
    const addLead = (lead: Lead) => {
        setLeads(prev => [...prev, lead]);
        addToast('ליד נוצר', 'success');
    };

    const updateLead = (id: string, updates: Partial<Lead>) => {
        setLeads(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
        addToast('הליד עודכן', 'success');
    };

    const deleteLead = (id: string) => {
        const lead = leads.find(l => l.id === id);
        if (lead) {
            setTrashLeads(prev => [lead, ...prev]);
            setLeads(prev => prev.filter(l => l.id !== id));
            addToast('ליד הועבר לסל המיחזור', 'info');
        }
    };

    const restoreLead = (id: string) => {
        const lead = trashLeads.find(l => l.id === id);
        if (lead) {
            setLeads(prev => [...prev, lead]);
            setTrashLeads(prev => prev.filter(l => l.id !== id));
            addToast('ליד שוחזר בהצלחה', 'success');
        }
    };

    const permanentlyDeleteLead = (id: string) => {
        setTrashLeads(prev => prev.filter(l => l.id !== id));
        addToast('ליד נמחק לצמיתות', 'warning');
    };

    const convertLeadToClient = (leadId: string) => {
        const lead = leads.find(l => l.id === leadId);
        if (lead) {
            const newClient: Client = {
                id: `C-${Date.now()}`,
                name: lead.name,
                companyName: lead.company || lead.name,
                avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(lead.name)}&background=random`,
                package: lead.interestedIn || 'General',
                status: 'Onboarding',
                contactPerson: lead.name,
                email: lead.email,
                phone: lead.phone || '',
                joinedAt: new Date().toISOString()
            };
            addClient(newClient);
            setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: LeadStatus.WON } : l));
            
            addNotification({
                recipientId: 'all',
                type: 'info',
                text: `🎉 עסקה נסגרה! ${newClient.companyName} הצטרף כלקוח חדש.`,
                actorName: currentUser.name,
                actorAvatar: currentUser.avatar
            });

            addToast('ליד הומר ללקוח בהצלחה!', 'success');
        }
    };

    // --- Asset Logic ---
    const addAsset = (asset: Asset) => {
        setAssets(prev => [...prev, asset]);
        addToast('נכס נוסף לכספת', 'success');
    };

    const updateAsset = (id: string, updates: Partial<Asset>) => {
        setAssets(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
        addToast('הנכס עודכן בהצלחה', 'success');
    };

    const deleteAsset = (id: string) => {
        const asset = assets.find(a => a.id === id);
        if (asset) {
            setTrashAssets(prev => [asset, ...prev]);
            setAssets(prev => prev.filter(a => a.id !== id));
            addToast('נכס הועבר לסל המיחזור', 'info');
        }
    };

    const restoreAsset = (id: string) => {
        const asset = trashAssets.find(a => a.id === id);
        if (asset) {
            setAssets(prev => [...prev, asset]);
            setTrashAssets(prev => prev.filter(a => a.id !== id));
            addToast('נכס שוחזר בהצלחה', 'success');
        }
    };

    const permanentlyDeleteAsset = (id: string) => {
        setTrashAssets(prev => prev.filter(a => a.id !== id));
        addToast('נכס נמחק לצמיתות', 'warning');
    };

    // --- Invoices ---
    const generateInvoice = async (clientId: string, amount: number, description: string) => {
        if (!isGreenInvoiceConnected) {
            addToast('נא לחבר את מורנינג בהגדרות תחילה', 'warning');
            return;
        }

        // Find client to get details
        const client = clients.find(c => c.id === clientId);
        if (!client) {
            addToast('לקוח לא נמצא', 'error');
            return;
        }

        try {
            const orgId = typeof window !== 'undefined' ? getWorkspaceOrgIdFromPathname(window.location.pathname) : null;
            const response = await fetch('/api/integrations/green-invoice/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(orgId ? { 'x-org-id': orgId } : {}),
                },
                body: JSON.stringify({
                    clientName: client.companyName || client.name,
                    clientEmail: client.email,
                    clientPhone: client.phone,
                    items: [{
                        description,
                        quantity: 1,
                        price: amount,
                        vatRate: 17 // Default VAT rate
                    }],
                    currency: 'ILS',
                    paymentMethod: 'bank_transfer',
                    notes: `לקוח: ${client.companyName || client.name}`
                })
            });

            if (!response.ok) {
                // Check if response is JSON before parsing
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    const error = await response.json();
                    throw new Error(error.error || 'Failed to create invoice');
                } else {
                    // Response is HTML (error page)
                    const text = await response.text();
                    throw new Error(`Failed to create invoice (${response.status}): ${text.substring(0, 100)}`);
                }
            }

            // Check if response is JSON before parsing
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Invalid response format from server');
            }
            
            const data = await response.json();
            const newInvoice: Invoice = {
                id: data.invoice.invoiceId,
                number: data.invoice.invoiceNumber,
                date: new Date().toISOString().split('T')[0],
                amount,
                currency: 'ILS',
                status: 'Pending',
                url: data.invoice.invoiceUrl,
                clientId,
                description
            };
            setInvoices(prev => [newInvoice, ...prev]);
            addToast('חשבונית הופקה ונשלחה ללקוח', 'success');
        } catch (error: any) {
            console.error('[CRM] Error generating invoice:', error);
            addToast(error.message || 'שגיאה ביצירת חשבונית', 'error');
        }
    };

    // --- Products & Tenants ---
    const addTenant = (tenant: Tenant) => {
        setTenants(prev => [...prev, tenant]);
        addToast('לקוח עסקי חדש נוצר', 'success');
    };

    const updateTenant = (id: string, updates: Partial<Tenant>) => {
        setTenants(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    };

    const deleteTenant = (id: string) => {
        setTenants(prev => prev.filter(t => t.id !== id));
        addToast('לקוח עסקי נמחק', 'info');
    };

    // NEW: Update tenant version
    const updateTenantVersion = (tenantId: string, version: string) => {
        updateTenant(tenantId, { version });
        addToast(`גרסת הלקוח עודכנה ל-${version}`, 'success');
    };

    // NEW: Add allowed email to tenant
    const addAllowedEmail = (tenantId: string, email: string) => {
        const tenant = tenants.find(t => t.id === tenantId);
        if (tenant) {
            const currentEmails = tenant.allowedEmails || [];
            if (!currentEmails.includes(email)) {
                updateTenant(tenantId, { allowedEmails: [...currentEmails, email] });
                addToast(`מייל ${email} נוסף לרשימת המיילים המאושרים`, 'success');
            } else {
                addToast('המייל כבר קיים ברשימה', 'info');
            }
        }
    };

    // NEW: Remove allowed email from tenant
    const removeAllowedEmail = (tenantId: string, email: string) => {
        const tenant = tenants.find(t => t.id === tenantId);
        if (tenant) {
            const currentEmails = tenant.allowedEmails || [];
            updateTenant(tenantId, { allowedEmails: currentEmails.filter(e => e !== email) });
            addToast(`מייל ${email} הוסר מרשימת המיילים המאושרים`, 'info');
        }
    };

    const deleteProduct = (id: string) => {
        setProducts(prev => prev.filter(p => p.id !== id));
        addToast('מוצר נמחק בהצלחה', 'info');
    };

    // --- Integrations ---
    const connectGoogleCalendar = async () => {
        try {
            // Redirect to OAuth authorization (real Google OAuth, not demo)
            window.location.href = '/api/integrations/google/authorize?service=calendar';
        } catch (error: any) {
            console.error('[CRM] Error connecting Google Calendar:', error);
            addToast('שגיאה בחיבור ל-Google Calendar', 'error');
        }
    };

    // Load Green Invoice connection status on mount
    useEffect(() => {
        let mounted = true;
        const checkGreenInvoiceStatus = async () => {
            try {
                const orgId = typeof window !== 'undefined' ? getWorkspaceOrgIdFromPathname(window.location.pathname) : null;
                const response = await fetch('/api/integrations/green-invoice/status', {
                    headers: orgId ? { 'x-org-id': orgId } : undefined
                });
                if (!mounted) return;
                
                // Check if response is JSON before parsing
                const contentType = response.headers.get('content-type');
                if (response.ok && contentType && contentType.includes('application/json')) {
                    const data = await response.json();
                    setIsGreenInvoiceConnected(data.connected || false);
                } else {
                    // Not JSON or not OK - assume not connected
                    if (mounted) {
                        setIsGreenInvoiceConnected(false);
                    }
                }
            } catch (error) {
                // Silently fail - integration is optional
                console.warn('[CRM] Error checking Green Invoice status:', error);
                if (mounted) {
                    setIsGreenInvoiceConnected(false);
                }
            }
        };
        checkGreenInvoiceStatus();
        return () => { mounted = false; };
    }, []);

    const connectGreenInvoice = async () => {
        try {
            // Show modal or prompt for API key
            const apiKey = prompt('הזן את מפתח ה-API של מורנינג:');
            if (!apiKey) {
                return;
            }

            const orgId = typeof window !== 'undefined' ? getWorkspaceOrgIdFromPathname(window.location.pathname) : null;
            const response = await fetch('/api/integrations/green-invoice/connect', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(orgId ? { 'x-org-id': orgId } : {}),
                },
                body: JSON.stringify({ apiKey })
            });

            if (!response.ok) {
                // Check if response is JSON before parsing
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    const error = await response.json();
                    throw new Error(error.error || 'Failed to connect Green Invoice');
                } else {
                    // Response is HTML (error page) - extract text or use status
                    const text = await response.text();
                    throw new Error(`Failed to connect מורנינג (${response.status}): ${text.substring(0, 100)}`);
                }
            }

            setIsGreenInvoiceConnected(true);
            addToast('חשבונית ירוקה חוברה בהצלחה', 'success');
        } catch (error: any) {
            console.error('[CRM] Error connecting Green Invoice:', error);
            addToast(error.message || 'שגיאה בחיבור למורנינג', 'error');
        }
    };

    // --- CRITICAL FIX: AUTO-ONBOARDING LOGIC ---
    const onboardClientFromWebhook = (data: any) => {
        const newClient: Client = {
            id: `C-${Date.now()}`,
            name: data.contact_person?.name || data.company_name,
            companyName: data.company_name,
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(data.company_name)}&background=random`,
            package: data.deal_details?.package_type || 'Unknown',
            status: 'Onboarding',
            contactPerson: data.contact_person?.name || 'Unknown',
            email: data.contact_person?.email || '',
            phone: data.contact_person?.phone || '',
            joinedAt: new Date().toISOString(),
            assetsFolderUrl: '#'
        };
        
        // 1. Add Client to Database
        setClients(prev => [...prev, newClient]);
        
        // 2. Notify Everyone
        addNotification({
            recipientId: 'all',
            type: 'system',
            text: `לקוח חדש נקלט מ-System: ${newClient.companyName}`,
            actorName: 'Webhook'
        });
        
        // 3. AUTO-START PLAYBOOK (Trigger Tasks)
        const packageType = (data.deal_details?.package_type || '').toLowerCase();
        let templateId = '';

        if (packageType.includes('premium') || packageType.includes('vip')) {
            templateId = 'tmp_vip_onboarding';
        } else if (packageType.includes('enterprise') || packageType.includes('saas')) {
            templateId = 'tmp_saas_onboarding';
        }

        if (templateId) {
            // Delay slightly to ensure client state update settles (mock simulation)
            setTimeout(() => {
                applyTemplate(templateId, newClient.id, newClient.companyName);
                addToast(`תהליך קליטה אוטומטי הופעל עבור ${newClient.companyName}`, 'success');
            }, 500);
        } else {
            addToast(`הלקוח ${newClient.companyName} נוסף (ללא תהליך אוטומטי)`, 'success');
        }
    };

    const simulateIncomingCall = () => {
        setIncomingCall({
            id: `call-${Date.now()}`,
            callerName: 'ישראל ישראלי',
            phoneNumber: '050-1234567',
            company: 'חברת דוגמה בע״מ',
            isClient: true
        });
    };

    const dismissCall = () => setIncomingCall(null);

    return {
        clients, leads, assets, products, invoices, tenants,
        trashClients, trashLeads, trashAssets,
        isGreenInvoiceConnected, incomingCall,
        addClient, updateClient, deleteClient, restoreClient, permanentlyDeleteClient,
        addLead, updateLead, deleteLead, restoreLead, permanentlyDeleteLead, convertLeadToClient,
        addAsset, updateAsset, deleteAsset, restoreAsset, permanentlyDeleteAsset,
        generateInvoice, addTenant, updateTenant, deleteTenant, deleteProduct,
        connectGoogleCalendar, connectGreenInvoice, onboardClientFromWebhook, simulateIncomingCall, dismissCall,
        setProducts,
        // NEW: Version and Email Management
        updateTenantVersion, addAllowedEmail, removeAllowedEmail
    };
};
