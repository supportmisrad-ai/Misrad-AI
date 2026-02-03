/**
 * Secure Clients API
 * 
 * Server-side API with proper authorization
 */

import { NextRequest } from 'next/server';
import { getAuthenticatedUser, hasPermission, canAccessResource, requirePermission as requirePermissionFromAuth } from '../../../lib/auth';
import { logAuditEvent, logSensitiveAccess } from '../../../lib/audit';
import { Client } from '../../../types';
import { getClientOsClients as getClientOsClientsHandler } from '@/lib/server/clientOsClients';
import prisma, { executeRawOrgScoped } from '@/lib/prisma';
import { APIError, getWorkspaceOrThrow } from '@/lib/server/api-workspace';
import { apiError, apiSuccess } from '@/lib/server/api-response';
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

async function selectCrmManagerIdsInWorkspace(params: { workspaceId: string }): Promise<string[]> {
    const roles = ['מנכ״ל', 'מנכ"ל', 'מנכל', 'אדמין'];

    const [superAdmins, tenantAdmins, crmUsers] = await Promise.all([
        prisma.nexusUser.findMany({
            where: { organizationId: params.workspaceId, isSuperAdmin: true },
            select: { id: true },
        }),
        prisma.nexusUser.findMany({
            where: { organizationId: params.workspaceId, role: { in: roles } },
            select: { id: true },
        }),
        prisma.nexusUser.findMany({
            where: {
                organizationId: params.workspaceId,
                OR: [
                    { role: { contains: 'crm', mode: 'insensitive' } },
                    { role: { contains: 'מכירות', mode: 'insensitive' } },
                ],
            },
            select: { id: true },
        }),
    ]);

    const ids = new Set<string>();
    for (const r of [...superAdmins, ...tenantAdmins, ...crmUsers]) {
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

        // 5. Fetch clients from database (scoped)
        let clients: Client[] = [];
        try {
            const where: any = { organizationId: workspace.id };
            if (clientId) {
                where.id = String(clientId);
            }
            if (searchTerm) {
                const term = String(searchTerm).trim();
                if (term) {
                    where.OR = [
                        { name: { contains: term, mode: 'insensitive' } },
                        { companyName: { contains: term, mode: 'insensitive' } },
                        { email: { contains: term, mode: 'insensitive' } },
                    ];
                }
            }

            if (clientId) {
                const row = await prisma.nexusClient.findFirst({ where });
                clients = row ? [mapClientRow(row)] : [];
            } else {
                const rows = await prisma.nexusClient.findMany({ where, take: 500, orderBy: { createdAt: 'desc' } });
                clients = (Array.isArray(rows) ? rows : []).map(mapClientRow);
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

        const joinedAtDate = (() => {
            try {
                const d = new Date(String(clientData.joinedAt || ''));
                if (!Number.isFinite(d.getTime())) return new Date();
                return d;
            } catch {
                return new Date();
            }
        })();

        const created = await prisma.nexusClient.create({
            data: {
                organizationId: workspace.id,
                name: clientData.name,
                companyName: clientData.companyName,
                avatar: clientData.avatar || null,
                package: clientData.package || null,
                status: clientData.status,
                contactPerson: clientData.contactPerson,
                email: clientData.email,
                phone: clientData.phone,
                joinedAt: joinedAtDate,
                assetsFolderUrl: clientData.assetsFolderUrl || null,
                source: clientData.source || null,
            } as any,
        });

        const newClient = mapClientRow(created);
        
        await logAuditEvent('data.write', 'client', {
            resourceId: newClient.id,
            details: { createdBy: user.id }
        });
        
        // Send notification to CRM managers and admins (best-effort)
        try {
            const actorName = typeof user?.firstName === 'string' && user.firstName.trim() ? String(user.firstName).trim() : 'מערכת';

            const crmManagerIds = await selectCrmManagerIdsInWorkspace({ workspaceId: workspace.id });

            if (crmManagerIds.length > 0) {
                const nowIso = new Date().toISOString();
                for (const managerId of crmManagerIds) {
                    const text = `לקוח חדש נוסף: ${newClient.companyName}`;

                    try {
                        await executeRawOrgScoped(prisma, {
                            organizationId: String(workspace.id),
                            reason: 'api_clients_create_notification_full',
                            query: `
                                insert into misrad_notifications
                                  (organization_id, recipient_id, type, text, actor_name, related_id, is_read, created_at, updated_at)
                                values
                                  ($1::uuid, $2::uuid, $3::text, $4::text, $5::text, $6::uuid, false, $7::timestamptz, $7::timestamptz)
                            `,
                            values: [
                                String(workspace.id),
                                String(managerId),
                                'client_created',
                                String(text),
                                String(actorName),
                                String(newClient.id),
                                nowIso,
                            ],
                        });
                    } catch {
                        try {
                            await executeRawOrgScoped(prisma, {
                                organizationId: String(workspace.id),
                                reason: 'api_clients_create_notification_min',
                                query: `
                                    insert into misrad_notifications
                                      (organization_id, recipient_id, type, text, is_read, created_at, updated_at)
                                    values
                                      ($1::uuid, $2::uuid, $3::text, $4::text, false, $5::timestamptz, $5::timestamptz)
                                `,
                                values: [
                                    String(workspace.id),
                                    String(managerId),
                                    'client_created',
                                    String(text),
                                    nowIso,
                                ],
                            });
                        } catch (e: unknown) {
                            const msg = getErrorMessage(e);
                            if (String(msg || '').includes('[SchemaMismatch]')) {
                                throw e instanceof Error ? e : new Error(msg);
                            }
                            console.warn('[API] Could not create client notification (ignored):', msg);
                        }
                    }
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

        const patch: Record<string, unknown> = {};
        if (updatesObj['name'] !== undefined) patch.name = updatesObj['name'];
        if (updatesObj['companyName'] !== undefined) patch.companyName = updatesObj['companyName'];
        if (updatesObj['avatar'] !== undefined) patch.avatar = updatesObj['avatar'];
        if (updatesObj['package'] !== undefined) patch.package = updatesObj['package'];
        if (updatesObj['status'] !== undefined) patch.status = updatesObj['status'];
        if (updatesObj['contactPerson'] !== undefined) patch.contactPerson = updatesObj['contactPerson'];
        if (updatesObj['email'] !== undefined) patch.email = updatesObj['email'];
        if (updatesObj['phone'] !== undefined) patch.phone = updatesObj['phone'];
        if (updatesObj['joinedAt'] !== undefined) {
            try {
                const d = new Date(String(updatesObj['joinedAt']));
                if (Number.isFinite(d.getTime())) patch.joinedAt = d;
            } catch {
                // ignore
            }
        }
        if (updatesObj['assetsFolderUrl'] !== undefined) patch.assetsFolderUrl = updatesObj['assetsFolderUrl'];
        if (updatesObj['source'] !== undefined) patch.source = updatesObj['source'];

        const res = await prisma.nexusClient.updateMany({
            where: { id: clientId, organizationId: workspace.id },
            data: patch as any,
        });
        if (!res || typeof (res as any).count !== 'number' || (res as any).count < 1) {
            return apiError('Failed to update client', { status: 500 });
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
