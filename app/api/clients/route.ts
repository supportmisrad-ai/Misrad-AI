/**
 * Secure Clients API
 * 
 * Server-side API with proper authorization
 */

import { NextRequest } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getAuthenticatedUser, hasPermission, canAccessResource, requirePermission as requirePermissionFromAuth } from '../../../lib/auth';
import { logAuditEvent, logSensitiveAccess } from '../../../lib/audit';
import { Client } from '../../../types';
import { getClientOsClients as getClientOsClientsHandler } from '@/lib/server/clientOsClients';
import { createClient } from '@/lib/supabase';
import { APIError, getWorkspaceOrThrow } from '@/lib/server/api-workspace';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { safeWritePayload, type DbWritePayload } from '@/lib/tenant-isolation';
import { shabbatGuard } from '@/lib/api-shabbat-guard';

function asObject(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object') return null;
    if (Array.isArray(value)) return null;
    return value as Record<string, unknown>;
}

function getString(obj: Record<string, unknown>, key: string, fallback = ''): string {
    const v = obj[key];
    return typeof v === 'string' ? v : v == null ? fallback : String(v);
}

function getNullableString(obj: Record<string, unknown>, key: string): string | null {
    const v = obj[key];
    if (v == null) return null;
    return typeof v === 'string' ? v : String(v);
}

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    const obj = asObject(error);
    const msg = obj ? obj['message'] : undefined;
    return typeof msg === 'string' ? msg : '';
}

function isClientStatus(value: string): value is Client['status'] {
    return value === 'Active' || value === 'Onboarding' || value === 'Paused';
}

function coerceClientStatus(value: unknown): Client['status'] {
    const s = String(value ?? '').trim();
    return isClientStatus(s) ? s : 'Onboarding';
}

async function selectCrmManagerIdsInWorkspace(params: { supabase: SupabaseClient; workspaceId: string }): Promise<string[]> {
    const roles = ['מנכ״ל', 'מנכ"ל', 'מנכל', 'אדמין'];

    const [superAdminsRes, tenantAdminsRes, crmRes] = await Promise.all([
        params.supabase
            .from('nexus_users')
            .select('id')
            .eq('organization_id', params.workspaceId)
            .eq('is_super_admin', true),
        params.supabase
            .from('nexus_users')
            .select('id')
            .eq('organization_id', params.workspaceId)
            .in('role', roles),
        params.supabase
            .from('nexus_users')
            .select('id')
            .eq('organization_id', params.workspaceId)
            .or('role.ilike.%crm%,role.ilike.%מכירות%'),
    ]);

    const rows = [
        ...(Array.isArray(superAdminsRes.data) ? superAdminsRes.data : []),
        ...(Array.isArray(tenantAdminsRes.data) ? tenantAdminsRes.data : []),
        ...(Array.isArray(crmRes.data) ? crmRes.data : []),
    ];

    const ids = new Set<string>();
    for (const r of rows) {
        if (r?.id) ids.add(String(r.id));
    }
    return Array.from(ids);
}

function mapClientRow(row: unknown): Client {
    const obj = asObject(row);
    return {
        id: obj ? getString(obj, 'id') : '',
        name: obj ? getString(obj, 'name') : '',
        companyName: obj ? getString(obj, 'company_name', getString(obj, 'companyName')) : '',
        avatar: obj ? getString(obj, 'avatar') : '',
        package: obj ? getString(obj, 'package', 'Unknown') : 'Unknown',
        status: coerceClientStatus(obj ? obj['status'] : undefined),
        contactPerson: obj ? getString(obj, 'contact_person') : '',
        email: obj ? getString(obj, 'email') : '',
        phone: obj ? getString(obj, 'phone') : '',
        joinedAt: obj ? getString(obj, 'joined_at') : '',
        assetsFolderUrl: obj ? (getNullableString(obj, 'assets_folder_url') ?? undefined) : undefined,
        source: obj ? (getNullableString(obj, 'source') ?? undefined) : undefined,
    } as Client;
}
async function GETHandler(request: NextRequest) {
    try {
        if (request.headers.get('x-client-os') === '1') {
            return getClientOsClientsHandler(request);
        }

        const { workspace } = await getWorkspaceOrThrow(request);

        // 1. Authenticate user
        await getAuthenticatedUser();
        
        // 2. Check permissions - only users with CRM access can see clients
        const canViewCrm = await hasPermission('view_crm');
        if (!canViewCrm) {
            return apiError('Forbidden - CRM access required', { status: 403 });
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
        
        const supabase = createClient();

        // 5. Fetch clients from database (scoped)
        let clients: Client[] = [];
        try {
            let query = supabase
                .from('nexus_clients')
                .select('*')
                .eq('organization_id', workspace.id);

            if (clientId) {
                query = query.eq('id', clientId).limit(1);
            }

            if (searchTerm) {
                const term = String(searchTerm).toLowerCase();
                query = query.or(`name.ilike.%${term}%,company_name.ilike.%${term}%,email.ilike.%${term}%`);
            }

            const { data, error } = clientId ? await query.maybeSingle() : await query.limit(500);
            if (error) {
                console.error('[API] Error fetching clients from Supabase:', error);
                return apiError('Failed to fetch clients', { status: 500 });
            }

            if (clientId) {
                clients = data ? [mapClientRow(data)] : [];
            } else {
                clients = (Array.isArray(data) ? data : []).map(mapClientRow);
            }
        } catch (dbError: unknown) {
            console.error('[API] Error fetching clients from database:', dbError);
            return apiError('Failed to fetch clients', { status: 500 });
        }
        
        // 6. Filter based on permissions
        if (clientId) {
            // Single client request
            const client = clients.find(c => c.id === clientId);
            if (!client) {
                return apiError('Client not found', { status: 404 });
            }
            
            // Check if user can access this client
            const canAccess = await canAccessResource('client', clientId, 'read', { organizationId: workspace.id });
            if (!canAccess) {
                return apiError('Forbidden', { status: 403 });
            }
            
            // Log sensitive data access (email, phone, etc.)
            await logSensitiveAccess('client', clientId, ['email', 'phone', 'contactPerson']);
            
            return apiSuccess(client);
        }
        
        // 7. List clients - filter by status if requested
        if (status) {
            clients = clients.filter(c => c.status === status);
        }
        
        // All clients are returned (already filtered by CRM permission)
        return apiSuccess({ clients });
        
    } catch (error: unknown) {
        const msg = getErrorMessage(error);
        await logAuditEvent('data.read', 'client', {
            success: false,
            error: msg
        });

        if (error instanceof APIError) {
            return apiError(error, { status: error.status, message: error.message || 'Forbidden' });
        }
        
        if (msg.includes('Unauthorized')) {
            return apiError('Unauthorized', { status: 401 });
        }
        
        if (msg.includes('Forbidden')) {
            return apiError('Forbidden', { status: 403 });
        }
        
        return apiError('Internal server error', { status: 500 });
    }
}

async function POSTHandler(request: NextRequest) {
    try {
        const { workspace } = await getWorkspaceOrThrow(request);

        const user = await getAuthenticatedUser();
        
        // Only users with CRM permission can create clients
        await requirePermissionFromAuth('view_crm');
        
        const body = (await request.json()) as unknown;
        const bodyObj = asObject(body) ?? {};
        
        // Validate input
        const name = getString(bodyObj, 'name');
        const companyName = getString(bodyObj, 'companyName');
        if (!name || !companyName) {
            return apiError('Name and company name are required', { status: 400 });
        }
        
        const supabase = createClient();
        const nowIso = new Date().toISOString();

        // Create client in database
        const clientData: Omit<Client, 'id'> = {
            name,
            companyName,
            avatar: getString(bodyObj, 'avatar') || `https://ui-avatars.com/api/?name=${encodeURIComponent(companyName)}&background=random&color=fff`,
            package: getString(bodyObj, 'package') || 'Unknown',
            status: coerceClientStatus(bodyObj['status']),
            contactPerson: getString(bodyObj, 'contactPerson'),
            email: getString(bodyObj, 'email'),
            phone: getString(bodyObj, 'phone'),
            joinedAt: getString(bodyObj, 'joinedAt') || new Date().toISOString(),
            assetsFolderUrl: getString(bodyObj, 'assetsFolderUrl') || undefined,
            source: getString(bodyObj, 'source') || 'manual'
        };

        const insertPayload: Record<string, unknown> = {
            name: clientData.name,
            company_name: clientData.companyName,
            avatar: clientData.avatar,
            package: clientData.package ?? null,
            status: clientData.status ?? null,
            contact_person: clientData.contactPerson ?? null,
            email: clientData.email ?? null,
            phone: clientData.phone ?? null,
            joined_at: clientData.joinedAt ?? nowIso,
            assets_folder_url: clientData.assetsFolderUrl ?? null,
            source: clientData.source ?? 'manual',
            organization_id: workspace.id,
            created_at: nowIso,
            updated_at: nowIso,
        };

        const insertRes = await supabase.from('nexus_clients').insert(insertPayload).select('*').single();
        if (insertRes.error || !insertRes.data) {
            return apiError(insertRes.error?.message || 'Failed to create client', { status: 500 });
        }

        const newClient = mapClientRow(insertRes.data);
        
        await logAuditEvent('data.write', 'client', {
            resourceId: newClient.id,
            details: { createdBy: user.id }
        });
        
        // Send notification to CRM managers and admins (best-effort)
        try {
            const actorName = typeof user?.firstName === 'string' && user.firstName.trim() ? String(user.firstName).trim() : 'מערכת';

            const crmManagerIds = await selectCrmManagerIdsInWorkspace({ supabase, workspaceId: workspace.id });

            if (crmManagerIds.length > 0) {
                const notifications: DbWritePayload[] = crmManagerIds.map((managerId: string) => ({
                    organization_id: workspace.id,
                    recipient_id: String(managerId),
                    type: 'client_created',
                    text: `לקוח חדש נוסף: ${newClient.companyName}`,
                    actor_id: user.id,
                    actor_name: actorName,
                    related_id: newClient.id,
                    is_read: false,
                    metadata: {
                        clientId: newClient.id,
                        clientName: newClient.companyName,
                        contactPerson: newClient.contactPerson,
                        package: newClient.package,
                        status: newClient.status,
                    },
                    created_at: new Date().toISOString(),
                }));

                const safeNotifications = notifications.map((n: DbWritePayload) =>
                    safeWritePayload({
                        context: 'api.clients.POST',
                        table: 'misrad_notifications',
                        mode: 'insert',
                        organizationId: workspace.id,
                        payload: n,
                    })
                );

                const { error: notifError } = await supabase
                    .from('misrad_notifications')
                    .insert(safeNotifications as unknown as Record<string, unknown>[]);
                if (notifError) {
                    if (notifError.code !== '42P01' && !String(notifError.message || '').includes('does not exist')) {
                        throw new Error(`[SchemaMismatch] misrad_notifications insert failed: ${notifError.message}`);
                    }
                    console.warn('[API] Could not create client notifications:', notifError);
                }
            }
        } catch (notifError: unknown) {
            if (getErrorMessage(notifError).includes('[SchemaMismatch]')) {
                throw notifError;
            }
            console.warn('[API] Error sending client notifications:', notifError);
        }
        
        return apiSuccess({ client: newClient });
        
    } catch (error: unknown) {
        if (error instanceof APIError) {
            return apiError(error, { status: error.status, message: error.message || 'Forbidden' });
        }
        const msg = getErrorMessage(error);
        return apiError(error, { status: msg.includes('Forbidden') ? 403 : 500 });
    }
}

async function PATCHHandler(request: NextRequest) {
    try {
        const { workspace } = await getWorkspaceOrThrow(request);

        const user = await getAuthenticatedUser();
        const body = (await request.json()) as unknown;
        const bodyObj = asObject(body) ?? {};
        const clientId = getString(bodyObj, 'clientId');
        const updatesObj = asObject(bodyObj['updates']) ?? {};
        
        if (!clientId) {
            return apiError('Client ID is required', { status: 400 });
        }
        
        // Check if user can modify this client
        const canAccess = await canAccessResource('client', clientId, 'write', { organizationId: workspace.id });
        if (!canAccess) {
            return apiError('Forbidden', { status: 403 });
        }
        
        const supabase = createClient();

        const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (updatesObj['name'] !== undefined) patch.name = updatesObj['name'];
        if (updatesObj['companyName'] !== undefined) patch.company_name = updatesObj['companyName'];
        if (updatesObj['avatar'] !== undefined) patch.avatar = updatesObj['avatar'];
        if (updatesObj['package'] !== undefined) patch.package = updatesObj['package'];
        if (updatesObj['status'] !== undefined) patch.status = updatesObj['status'];
        if (updatesObj['contactPerson'] !== undefined) patch.contact_person = updatesObj['contactPerson'];
        if (updatesObj['email'] !== undefined) patch.email = updatesObj['email'];
        if (updatesObj['phone'] !== undefined) patch.phone = updatesObj['phone'];
        if (updatesObj['joinedAt'] !== undefined) patch.joined_at = updatesObj['joinedAt'];
        if (updatesObj['assetsFolderUrl'] !== undefined) patch.assets_folder_url = updatesObj['assetsFolderUrl'];
        if (updatesObj['source'] !== undefined) patch.source = updatesObj['source'];

        const { error: updateError } = await supabase
            .from('nexus_clients')
            .update(patch)
            .eq('id', clientId)
            .eq('organization_id', workspace.id);

        if (updateError) {
            return apiError(updateError.message || 'Failed to update client', { status: 500 });
        }
        
        await logAuditEvent('data.write', 'client', {
            resourceId: clientId,
            details: { updatedBy: user.id, updates: updatesObj }
        });
        
        return apiSuccess({ ok: true });
        
    } catch (error: unknown) {
        const msg = getErrorMessage(error);
        return apiError(error, { status: msg.includes('Forbidden') ? 403 : 500 });
    }
}



export const GET = shabbatGuard(GETHandler);

export const POST = shabbatGuard(POSTHandler);

export const PATCH = shabbatGuard(PATCHHandler);
