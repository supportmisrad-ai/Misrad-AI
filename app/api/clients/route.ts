/**
 * Secure Clients API
 * 
 * Server-side API with proper authorization
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, hasPermission, canAccessResource, requirePermission as requirePermissionFromAuth } from '../../../lib/auth';
import { logAuditEvent, logSensitiveAccess } from '../../../lib/audit';
import { getClients, createRecord, updateRecord, getUsers } from '../../../lib/db';
import { Client } from '../../../types';
import { getClientOsClients as getClientOsClientsHandler } from '@/lib/server/clientOsClients';

export async function GET(request: NextRequest) {
    try {
        if (request.headers.get('x-client-os') === '1') {
            return getClientOsClientsHandler(request);
        }

        // 1. Authenticate user
        const user = await getAuthenticatedUser();
        
        // 2. Check permissions - only users with CRM access can see clients
        const canViewCrm = await hasPermission('view_crm');
        if (!canViewCrm) {
            return NextResponse.json({ error: 'Forbidden - CRM access required' }, { status: 403 });
        }
        
        // 3. Log access
        await logAuditEvent('data.read', 'client', {
            success: true
        });
        
        // 4. Get query parameters
        const searchParams = request.nextUrl.searchParams;
        const clientId = searchParams.get('id');
        const status = searchParams.get('status');
        const searchTerm = searchParams.get('search');
        
        // 5. Fetch clients from database
        let clients: any[] = [];
        try {
            clients = await getClients({
                clientId: clientId || undefined,
                searchTerm: searchTerm || undefined
            });
        } catch (dbError: any) {
            console.error('[API] Error fetching clients from database:', dbError);
            // Return empty array on database error (graceful degradation)
            clients = [];
        }
        
        // 6. Filter based on permissions
        if (clientId) {
            // Single client request
            const client = clients.find(c => c.id === clientId);
            if (!client) {
                return NextResponse.json({ error: 'Client not found' }, { status: 404 });
            }
            
            // Check if user can access this client
            const canAccess = await canAccessResource('client', clientId, 'read');
            if (!canAccess) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
            
            // Log sensitive data access (email, phone, etc.)
            await logSensitiveAccess('client', clientId, ['email', 'phone', 'contactPerson']);
            
            return NextResponse.json(client);
        }
        
        // 7. List clients - filter by status if requested
        if (status) {
            clients = clients.filter(c => c.status === status);
        }
        
        // All clients are returned (already filtered by CRM permission)
        return NextResponse.json({ clients });
        
    } catch (error: any) {
        await logAuditEvent('data.read', 'client', {
            success: false,
            error: error.message
        });
        
        if (error.message.includes('Unauthorized')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        if (error.message.includes('Forbidden')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        
        // Only users with CRM permission can create clients
        await requirePermissionFromAuth('view_crm');
        
        const body = await request.json();
        
        // Validate input
        if (!body.name || !body.companyName) {
            return NextResponse.json(
                { error: 'Name and company name are required' },
                { status: 400 }
            );
        }
        
        // Create client in database
        const clientData: Omit<Client, 'id'> = {
            name: body.name,
            companyName: body.companyName,
            avatar: body.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(body.companyName)}&background=random&color=fff`,
            package: body.package || 'Unknown',
            status: body.status || 'Onboarding',
            contactPerson: body.contactPerson || undefined,
            email: body.email || undefined,
            phone: body.phone || undefined,
            joinedAt: body.joinedAt || new Date().toISOString(),
            assetsFolderUrl: body.assetsFolderUrl || undefined,
            source: body.source || 'manual'
        };
        
        const newClient = await createRecord<Client>('clients', clientData);
        
        await logAuditEvent('data.write', 'client', {
            resourceId: newClient.id,
            details: { createdBy: user.id }
        });
        
        // Send notification to CRM managers and admins
        try {
            const { supabase } = await import('../../../lib/supabase');
            const supabaseClient = supabase;
            if (supabaseClient) {
                const allUsers = await getUsers();
                const crmManagers = allUsers.filter(u => {
                    const hasCrmAccess = u.role === 'מנכ״ל' || u.role === 'מנכ"ל' || u.role === 'אדמין' || 
                                        u.isSuperAdmin || u.role?.includes('מכירות') || u.role?.includes('CRM');
                    return hasCrmAccess;
                });
                
                if (crmManagers.length > 0) {
                    const creator = allUsers.find(u => u.id === user.id);
                    const creatorName = creator?.name || 'מערכת';
                    
                    const notifications = crmManagers.map(manager => ({
                        recipient_id: manager.id,
                        type: 'client_created',
                        text: `לקוח חדש נוסף: ${newClient.companyName}`,
                        actor_id: user.id,
                        actor_name: creatorName,
                        related_id: newClient.id,
                        is_read: false,
                        metadata: {
                            clientId: newClient.id,
                            clientName: newClient.companyName,
                            contactPerson: newClient.contactPerson,
                            package: newClient.package,
                            status: newClient.status
                        },
                        created_at: new Date().toISOString()
                    }));
                    
                    const { error: notifError } = await supabaseClient
                        .from('misrad_notifications')
                        .insert(notifications);
                    
                    if (notifError) {
                        console.warn('[API] Could not create client notifications:', notifError);
                    }
                }
            }
        } catch (notifError) {
            console.warn('[API] Error sending client notifications:', notifError);
            // Don't fail the request if notification fails
        }
        
        return NextResponse.json({ 
            success: true,
            client: newClient
        });
        
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message },
            { status: error.message.includes('Forbidden') ? 403 : 500 }
        );
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        const body = await request.json();
        const { clientId, updates } = body;
        
        if (!clientId) {
            return NextResponse.json(
                { error: 'Client ID is required' },
                { status: 400 }
            );
        }
        
        // Check if user can modify this client
        const canAccess = await canAccessResource('client', clientId, 'write');
        if (!canAccess) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        
        // Update client in database
        await updateRecord<Client>('clients', clientId, updates);
        
        await logAuditEvent('data.write', 'client', {
            resourceId: clientId,
            details: { updatedBy: user.id, updates }
        });
        
        return NextResponse.json({ success: true });
        
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message },
            { status: error.message.includes('Forbidden') ? 403 : 500 }
        );
    }
}


