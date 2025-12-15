
import { useState } from 'react';
import { Client, Lead, Asset, Invoice, Product, Tenant, DriveFile, LeadStatus } from '../types';
import { CLIENTS, LEADS, ASSETS, DEFAULT_PRODUCTS, TENANTS } from '../constants';

export const useCRM = (
    currentUser: any,
    addNotification: (n: any) => void,
    addToast: (m: string, t?: any) => void,
    applyTemplate: (templateId: string, clientId?: string, clientName?: string) => void // NEW DEPENDENCY
) => {
    const [clients, setClients] = useState<Client[]>(CLIENTS);
    const [leads, setLeads] = useState<Lead[]>(LEADS);
    const [assets, setAssets] = useState<Asset[]>(ASSETS);
    const [products, setProducts] = useState<Product[]>(DEFAULT_PRODUCTS);
    const [tenants, setTenants] = useState<Tenant[]>(TENANTS);
    
    // Invoices
    const [invoices, setInvoices] = useState<Invoice[]>([
        { id: 'INV-1001', number: '1001', date: '2023-10-01', amount: 390, currency: 'ILS', status: 'Paid', url: '#', userId: '1', description: 'Nexus Pro - חודשי' },
        { id: 'INV-1002', number: '1002', date: '2023-11-01', amount: 390, currency: 'ILS', status: 'Paid', url: '#', userId: '1', description: 'Nexus Pro - חודשי' },
        { id: 'INV-2001', number: '2001', date: '2023-10-15', amount: 15000, currency: 'ILS', status: 'Paid', url: '#', clientId: 'C-1', description: 'ליווי עסקי Premium' },
    ]);

    // Trash Bins
    const [trashClients, setTrashClients] = useState<Client[]>([]);
    const [trashLeads, setTrashLeads] = useState<Lead[]>([]);
    const [trashAssets, setTrashAssets] = useState<Asset[]>([]);

    // External Integration State
    const [isDriveConnected, setIsDriveConnected] = useState(false);
    const [isConnectingDrive, setIsConnectingDrive] = useState(false);
    const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
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
        addToast('ליד חדש נוצר', 'success');
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
    const generateInvoice = (clientId: string, amount: number, description: string) => {
        if (!isGreenInvoiceConnected) {
            addToast('נא לחבר את חשבונית ירוקה בהגדרות תחילה', 'warning');
            return;
        }
        const newInvoice: Invoice = {
            id: `INV-${Date.now()}`,
            number: Math.floor(Math.random() * 10000).toString(),
            date: new Date().toISOString().split('T')[0],
            amount,
            currency: 'ILS',
            status: 'Pending',
            url: '#',
            clientId,
            description
        };
        setInvoices(prev => [newInvoice, ...prev]);
        addToast('חשבונית הופקה ונשלחה ללקוח (דמו)', 'success');
    };

    // --- Products & Tenants ---
    const addTenant = (tenant: Tenant) => {
        setTenants(prev => [...prev, tenant]);
        addToast('לקוח עסקי חדש נוצר', 'success');
    };

    const updateTenant = (id: string, updates: Partial<Tenant>) => {
        setTenants(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    };

    const deleteProduct = (id: string) => {
        setProducts(prev => prev.filter(p => p.id !== id));
        addToast('מוצר נמחק בהצלחה', 'info');
    };

    // --- Integrations ---
    const connectGoogleDrive = () => {
        setIsConnectingDrive(true);
        setTimeout(() => {
            setIsConnectingDrive(false);
            setIsDriveConnected(true);
            setDriveFiles([
                { id: 'df-1', name: 'מצגת משקיעים 2024', mimeType: 'presentation', url: '#', modifiedAt: '2023-10-25', owner: 'me' },
                { id: 'df-2', name: 'דוח כספי Q3', mimeType: 'spreadsheet', url: '#', modifiedAt: '2023-10-20', owner: 'me' },
                { id: 'df-3', name: 'לוגו החברה - וקטורי', mimeType: 'image', url: '#', modifiedAt: '2023-09-15', owner: 'me' },
                { id: 'df-4', name: 'חוזה עבודה סטנדרטי', mimeType: 'document', url: '#', modifiedAt: '2023-08-01', owner: 'me' },
            ]);
            addToast('Google Drive מחובר בהצלחה', 'success');
        }, 1500);
    };

    const connectGreenInvoice = () => {
        setIsGreenInvoiceConnected(true);
        addToast('חשבונית ירוקה חוברה בהצלחה', 'success');
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
            text: `לקוח חדש נקלט מ-Sales OS: ${newClient.companyName}`,
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
        clients, leads, assets, products, invoices, tenants, driveFiles,
        trashClients, trashLeads, trashAssets,
        isDriveConnected, isConnectingDrive, isGreenInvoiceConnected, incomingCall,
        addClient, updateClient, deleteClient, restoreClient, permanentlyDeleteClient,
        addLead, updateLead, deleteLead, restoreLead, permanentlyDeleteLead, convertLeadToClient,
        addAsset, updateAsset, deleteAsset, restoreAsset, permanentlyDeleteAsset,
        generateInvoice, addTenant, updateTenant, deleteProduct,
        connectGoogleDrive, connectGreenInvoice, onboardClientFromWebhook, simulateIncomingCall, dismissCall,
        setProducts
    };
};
