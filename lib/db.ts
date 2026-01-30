/**
 * Database Connection & Utilities
 * 
 * Centralized database access layer using Supabase
 */

import { User, Task, Client, TimeEntry, Tenant, RoleDefinition, PermissionId } from '../types';
import * as Sentry from '@sentry/nextjs';
import type { SupabaseClient } from '@supabase/supabase-js';

// Dynamic import for Supabase to avoid client-side bundling issues
let supabase!: SupabaseClient;
let isSupabaseConfigured = false;

type UnknownRecord = Record<string, unknown>;

function asObject(value: unknown): UnknownRecord | null {
    if (value && typeof value === 'object' && !Array.isArray(value)) return value as UnknownRecord;
    return null;
}

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    const obj = asObject(error);
    const msg = obj?.message;
    return typeof msg === 'string' ? msg : 'Unknown error';
}

function getErrorCode(error: unknown): string | null {
    const obj = asObject(error);
    const code = obj?.code;
    return typeof code === 'string' ? code : null;
}

function parseOptionalFloat(value: unknown): number | undefined {
    if (value === null || value === undefined) return undefined;
    const n = parseFloat(String(value));
    return Number.isFinite(n) ? n : undefined;
}

export type GlobalUserLookup = {
    id: string;
    email: string;
    organizationId: string | null;
};

function assertDbAvailable(context: string): void {
    if (typeof window !== 'undefined') {
        throw new Error(`[DB] ${context}: lib/db.ts must not be executed in the browser runtime`);
    }

    if (!isSupabaseConfigured) {
        throw new Error(
            `[DB] ${context}: Supabase not configured. Please set NEXT_PUBLIC_SUPABASE_URL and ` +
                `(SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY).`
        );
    }

    if (!supabase) {
        throw new Error(`[DB] ${context}: Supabase client is not available`);
    }
}

export async function findUserGlobalByEmail(email: string): Promise<GlobalUserLookup | null> {
    await initDatabase();
    assertDbAvailable('findUserGlobalByEmail');

    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
        return null;
    }

    const supabaseModule = require('./supabase');
    const svc = supabaseModule.createServiceRoleClient({
        allowUnscoped: true,
        reason: 'auth_find_user_global_by_email',
    });

    const res = await svc
        .from('nexus_users')
        .select('id,email,organization_id')
        .eq('email', normalizedEmail)
        .order('updated_at', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(2);

    const error = res.error;
    const data = res.data;


    if (error) {
        throw new Error(getErrorMessage(error));
    }

    const rows = Array.isArray(data) ? (data as unknown[]) : [];
    if (rows.length > 1) {
        console.warn('[DB] findUserGlobalByEmail: duplicate rows for email', {
            email: normalizedEmail,
            ids: rows
                .map((r) => {
                    const obj = asObject(r);
                    return obj?.id ? String(obj.id) : null;
                })
                .filter(Boolean),
        });
    }

    const row = rows[0];
    const rowObj = asObject(row);
    if (!rowObj?.id) return null;

    return {
        id: String(rowObj.id),
        email: String(rowObj.email || normalizedEmail),
        organizationId: rowObj.organization_id ? String(rowObj.organization_id) : null,
    };
}

function assertUnscopedAccessAllowed(context: string): void {
    const allow = process.env.DB_ALLOW_UNSCOPED === 'true';
    if (!allow) {
        const err = new Error(
            `[DB] ${context}: Unscoped DB access is blocked (Tenant Isolation lockdown). ` +
                `Set DB_ALLOW_UNSCOPED=true only for controlled admin/backfill operations.`
        ) as Error & { __tenantIsolationReported?: boolean };
        reportTenantIsolationIfNeeded(context, err);
        throw err;
    }

    console.error(
        `[DB][TenantIsolation] UNscoped DB access allowed via DB_ALLOW_UNSCOPED=true: ${context}`
    );
}

function requireScopeIdOrThrow(
    context: string,
    params?: { organizationId?: string; tenantId?: string }
): string {
    if (params?.tenantId && !params?.organizationId) {
        const err = new Error(
            `[DB] ${context}: tenantId is legacy. Use organizationId (Tenant Isolation lockdown)`
        ) as Error & { __tenantIsolationReported?: boolean };
        reportTenantIsolationIfNeeded(context, err);
        throw err;
    }

    const scopeId = params?.organizationId;
    if (!scopeId) {
        const err = new Error(
            `[DB] ${context}: Missing organizationId/tenantId (Tenant Isolation lockdown)`
        ) as Error & { __tenantIsolationReported?: boolean };
        reportTenantIsolationIfNeeded(context, err);
        throw err;
    }
    return String(scopeId);
}

function reportTenantIsolationIfNeeded(context: string, error: unknown): void {
    try {
        const msg =
            error instanceof Error
                ? String(error.message || '')
                : typeof error === 'string'
                  ? error
                  : '';

        const isTenantIsolation =
            msg.includes('Tenant Isolation lockdown') ||
            msg.includes('[TenantIsolation]') ||
            msg.includes('TenantIsolation');

        if (!isTenantIsolation) return;

        const errObj = (error instanceof Error ? error : new Error(String(msg))) as Error & {
            __tenantIsolationReported?: boolean;
        };
        if (errObj.__tenantIsolationReported === true) return;
        errObj.__tenantIsolationReported = true;

        Sentry.withScope((scope) => {
            scope.setTag('TenantIsolation', 'true');
            scope.setTag('tenant_isolation_source', 'lib/db.ts');
            scope.setExtra('context', context);
            scope.setExtra('message', msg);
            Sentry.captureException(errObj);
        });
    } catch {
        // ignore
    }
}

// Initialize Supabase only on server-side
if (typeof window === 'undefined') {
  try {
    const supabaseModule = require('./supabase');
    supabase = supabaseModule.createClient();
    isSupabaseConfigured =
      typeof supabaseModule.isSupabaseConfigured === 'function'
        ? Boolean(supabaseModule.isSupabaseConfigured())
        : Boolean(supabaseModule.isSupabaseConfigured);
  } catch (error: unknown) {
    // Supabase not available, will use mock data
    console.log('[DB] Supabase module not available, using mock data');
  }
}

// Fail fast: all data comes from Supabase. If Supabase is not configured,
// database functions throw explicit errors.

// Map logical table names to actual database table names
const TABLE_NAME_MAP: Record<string, string> = {
    'users': 'nexus_users',
    'tasks': 'nexus_tasks',
    'clients': 'nexus_clients',
    'time_entries': 'nexus_time_entries',
    'tenants': 'nexus_tenants'
};

/**
 * Initialize database connection
 */
let dbInitPromise: Promise<void> | null = null;

export async function initDatabase(): Promise<void> {
    // Prevent multiple simultaneous initializations
    if (dbInitPromise) {
        return dbInitPromise;
    }
    
    dbInitPromise = (async () => {
        assertDbAvailable('initDatabase');

        // Tenant Isolation: Do NOT run any unscoped queries here.
        // initDatabase() should be a cheap availability check only.
        console.log('[DB] Database initialized (Supabase)');
    })();
    
    return dbInitPromise;
}

/**
 * Get users from database
 */
export async function getUsers(filters?: {
    userId?: string;
    userIds?: string[];
    department?: string;
    role?: string;
    email?: string;
    organizationId?: string;
    tenantId?: string;
    allowUnscoped?: boolean;
    page?: number;
    pageSize?: number;
}): Promise<User[]> {
    await initDatabase();
    assertDbAvailable('getUsers');
    
    try {
        if (filters?.allowUnscoped) {
            throw new Error('[DB] getUsers: allowUnscoped is disabled (Tenant Isolation lockdown)');
        }

        if (filters?.tenantId && !filters?.organizationId) {
            throw new Error('[DB] getUsers: tenantId is legacy. Use organizationId (Tenant Isolation lockdown)');
        }

        if (!filters?.organizationId) {
            throw new Error('[DB] getUsers: Missing organizationId (Tenant Isolation lockdown)');
        }

        const mapUserRow = (row: unknown): User => {
            const parseJson = (jsonStr: string | null | undefined) => {
                if (!jsonStr) return undefined;
                try {
                    return typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
                } catch (e: unknown) {
                    console.warn('[DB] Failed to parse JSON:', e);
                    return undefined;
                }
            };

            const r: UnknownRecord = asObject(row) ?? {};

            // Support both legacy nexus_users and tenant-scoped social_users rows.
            const id = String(r.id ?? '');
            const name = String(r.name ?? r.full_name ?? r.fullName ?? r.email ?? '');
            const avatar = String(r.avatar ?? r.avatar_url ?? r.avatarUrl ?? '');
            const tenantId = r.organization_id ?? null;

            return {
                id,
                name,
                role: String(r.role ?? 'עובד'),
                department: r.department ?? undefined,
                avatar,
                online: Boolean(r.online ?? true),
                capacity: Number(r.capacity ?? 0),
                email: r.email ?? undefined,
                phone: r.phone ?? undefined,
                location: r.location ?? undefined,
                bio: r.bio ?? undefined,
                paymentType: r.payment_type,
                hourlyRate: parseOptionalFloat(r.hourly_rate),
                monthlySalary: parseOptionalFloat(r.monthly_salary),
                commissionPct: r.commission_pct,
                bonusPerTask: parseOptionalFloat(r.bonus_per_task),
                accumulatedBonus: parseOptionalFloat(r.accumulated_bonus) ?? 0,
                streakDays: Number(r.streak_days ?? 0) || 0,
                weeklyScore: parseOptionalFloat(r.weekly_score),
                notificationPreferences: parseJson(typeof r.notification_preferences === 'string' ? r.notification_preferences : undefined),
                uiPreferences: parseJson(typeof r.ui_preferences === 'string' ? r.ui_preferences : undefined),
                targets: parseJson(typeof r.targets === 'string' ? r.targets : undefined),
                pendingReward: parseJson(typeof r.pending_reward === 'string' ? r.pending_reward : undefined),
                billingInfo: parseJson(typeof r.billing_info === 'string' ? r.billing_info : undefined),
                twoFactorEnabled: Boolean(r.two_factor_enabled ?? false),
                isSuperAdmin: Boolean(r.is_super_admin ?? false),
                managerId: (r.manager_id ? String(r.manager_id) : undefined),
                managedDepartment: (r.managed_department ? String(r.managed_department) : undefined),
                tenantId: tenantId ? String(tenantId) : undefined,
            } as User;
        };

        const buildBaseQuery = () => {
            let query = supabase.from('nexus_users').select('*');

            if (filters?.userId) {
                query = query.eq('id', filters.userId);
            }
            if (filters?.userIds?.length) {
                query = query.in('id', filters.userIds);
            }
            if (filters?.email) {
                query = query.eq('email', filters.email).limit(1); // Exact match, limit to 1 for performance
            }
            if (filters?.department) {
                query = query.eq('department', filters.department);
            }
            if (filters?.role) {
                query = query.eq('role', filters.role);
            }

            if (typeof filters?.pageSize === 'number' && Number.isFinite(filters.pageSize)) {
                const pageSize = Math.min(200, Math.max(1, Math.floor(filters.pageSize)));
                const page = Math.max(1, Math.floor(typeof filters?.page === 'number' && Number.isFinite(filters.page) ? filters.page : 1));
                const offset = (page - 1) * pageSize;
                const endInclusive = offset + pageSize;
                query = query.range(offset, endInclusive);
            }

            return query;
        };

        const scoped = await buildBaseQuery().eq('organization_id', filters.organizationId);
        if (getErrorCode(scoped.error) === '42703') {
            throw new Error('[DB] getUsers: Missing organization_id column (Tenant Isolation lockdown)');
        }

        const { data, error } = scoped;
        
        if (error) {
            console.error('[DB] Error fetching users:', error);
            throw new Error(error.message || 'Failed to fetch users');
        }
        
        // Transform database records to User interface
        return (data || []).map((row: unknown) => mapUserRow(row));
    } catch (error) {
        reportTenantIsolationIfNeeded('getUsers', error);
        console.error('[DB] Error in getUsers:', error);
        throw error;
    }
}

/**
 * Get tasks from database
 */
export async function getTasks(filters?: {
    taskId?: string;
    assigneeId?: string;
    status?: string;
    priority?: string;
    clientId?: string;
    organizationId?: string;
    tenantId?: string;
}): Promise<Task[]> {
    await initDatabase();
    assertDbAvailable('getTasks');
    
    try {
        if (filters?.tenantId && !filters?.organizationId) {
            throw new Error('[DB] getTasks: tenantId is legacy. Use organizationId (Tenant Isolation lockdown)');
        }
        const scopeId = filters?.organizationId;
        if (!scopeId) {
            throw new Error('[DB] getTasks: Missing organizationId (Tenant Isolation lockdown)');
        }

        const buildBaseQuery = () => {
            let query = supabase.from('nexus_tasks').select('*');

            if (filters?.taskId) {
                query = query.eq('id', filters.taskId);
            }
            if (filters?.status) {
                query = query.eq('status', filters.status);
            }
            if (filters?.priority) {
                query = query.eq('priority', filters.priority);
            }
            if (filters?.clientId) {
                query = query.eq('client_id', filters.clientId);
            }
            if (filters?.assigneeId) {
                query = query.or(`assignee_ids.cs.{${filters.assigneeId}},assignee_id.eq.${filters.assigneeId}`);
            }

            return query;
        };

        const scoped = await buildBaseQuery().eq('organization_id', scopeId);
        if (getErrorCode(scoped.error) === '42703') {
            throw new Error('[DB] getTasks: Missing organization_id column (Tenant Isolation lockdown)');
        }

        const { data, error } = scoped;
        
        if (error) {
            console.error('[DB] Error fetching tasks:', error);
            console.error('[DB] Error details:', JSON.stringify(error, null, 2));
            throw new Error(error.message || 'Failed to fetch tasks');
        }
        
        // Transform database records to Task interface
        return (data || []).map((row: unknown) => {
            const r: UnknownRecord = asObject(row) ?? {};
            return {
                id: r.id,
                title: r.title,
                description: (r.description ? String(r.description) : ''),
                status: r.status,
                priority: r.priority,
                assigneeIds: Array.isArray(r.assignee_ids) ? r.assignee_ids : [],
                assigneeId: r.assignee_id,
                creatorId: r.creator_id,
                tags: Array.isArray(r.tags) ? r.tags : [],
                createdAt: r.created_at,
                dueDate: r.due_date,
                dueTime:
                    r.due_time
                        ? (typeof r.due_time === 'string' ? String(r.due_time).substring(0, 5) : (r.due_time as unknown))
                        : undefined,
                timeSpent: Number(r.time_spent ?? 0) || 0,
                estimatedTime: r.estimated_time,
                approvalStatus: r.approval_status,
                isTimerRunning: Boolean(r.is_timer_running ?? false),
                messages: (() => {
                    try {
                        if (!r.messages) return [];
                        return typeof r.messages === 'string' ? JSON.parse(r.messages) : r.messages;
                    } catch (e: unknown) {
                        console.warn('[DB] Failed to parse messages:', e);
                        return [];
                    }
                })(),
                clientId: r.client_id,
                isPrivate: r.is_private,
                audioUrl: r.audio_url,
                snoozeCount: Number(r.snooze_count ?? 0) || 0,
                isFocus: Boolean(r.is_focus ?? false),
                completionDetails: (() => {
                    try {
                        if (!r.completion_details) return undefined;
                        return typeof r.completion_details === 'string'
                            ? JSON.parse(r.completion_details)
                            : r.completion_details;
                    } catch (e: unknown) {
                        console.warn('[DB] Failed to parse completion_details:', e);
                        return undefined;
                    }
                })(),
                department: r.department,
            } as Task;
        });
    } catch (error) {
        reportTenantIsolationIfNeeded('getTasks', error);
        console.error('[DB] Error in getTasks:', error);
        throw error;
    }
}

export async function getTimeEntries(filters?: {
    entryId?: string;
    userId?: string;
    dateFrom?: string;
    dateTo?: string;
    organizationId?: string;
    tenantId?: string;
    page?: number;
    pageSize?: number;
}): Promise<TimeEntry[]> {
    await initDatabase();
    assertDbAvailable('getTimeEntries');
    
    try {
        if (filters?.tenantId && !filters?.organizationId) {
            throw new Error('[DB] getTimeEntries: tenantId is legacy. Use organizationId (Tenant Isolation lockdown)');
        }
        const scopeId = filters?.organizationId;
        if (!scopeId) {
            throw new Error('[DB] getTimeEntries: Missing organizationId (Tenant Isolation lockdown)');
        }

        const buildBaseQuery = () => {
            let query = supabase.from('nexus_time_entries').select('*');

            if (filters?.entryId) {
                query = query.eq('id', filters.entryId);
            }
            if (filters?.userId) {
                query = query.eq('user_id', filters.userId);
            }
            if (filters?.dateFrom) {
                query = query.gte('date', filters.dateFrom);
            }
            if (filters?.dateTo) {
                query = query.lte('date', filters.dateTo);
            }

            if (typeof filters?.pageSize === 'number' && Number.isFinite(filters.pageSize)) {
                const pageSize = Math.min(200, Math.max(1, Math.floor(filters.pageSize)));
                const page = Math.max(1, Math.floor(typeof filters?.page === 'number' && Number.isFinite(filters.page) ? filters.page : 1));
                const offset = (page - 1) * pageSize;
                const endInclusive = offset + pageSize;
                query = query.range(offset, endInclusive);
            }

            return query;
        };

        const scoped = await buildBaseQuery().eq('organization_id', scopeId);
        if (getErrorCode(scoped.error) === '42703') {
            throw new Error('[DB] getTimeEntries: Missing organization_id column (Tenant Isolation lockdown)');
        }

        const { data, error } = scoped;
        
        if (error) {
            console.error('[DB] Error fetching time entries:', error);
            throw new Error(error.message || 'Failed to fetch time entries');
        }
        
        return (data || []).map((row: unknown) => {
            const r: UnknownRecord = asObject(row) ?? {};
            return {
                id: r.id,
                userId: r.user_id,
                startTime: r.start_time,
                endTime: r.end_time,
                date: r.date,
                durationMinutes: r.duration_minutes,
                voidReason: r.void_reason,
                voidedBy: r.voided_by,
                voidedAt: r.voided_at,
            } as TimeEntry;
        });
    } catch (error) {
        reportTenantIsolationIfNeeded('getTimeEntries', error);
        console.error('[DB] Error in getTimeEntries:', error);
        throw error;
    }
}

/**
 * Get clients from database
 */
export async function getClients(filters?: {
    clientId?: string;
    searchTerm?: string;
    organizationId?: string;
    tenantId?: string;
}): Promise<Client[]> {
    await initDatabase();
    assertDbAvailable('getClients');
    
    try {
        if (filters?.tenantId && !filters?.organizationId) {
            throw new Error('[DB] getClients: tenantId is legacy. Use organizationId (Tenant Isolation lockdown)');
        }
        const scopeId = filters?.organizationId;
        if (!scopeId) {
            throw new Error('[DB] getClients: Missing organizationId (Tenant Isolation lockdown)');
        }

        const buildBaseQuery = () => {
            let query = supabase.from('nexus_clients').select('*');

            if (filters?.clientId) {
                query = query.eq('id', filters.clientId);
            }
            if (filters?.searchTerm) {
                const term = filters.searchTerm.toLowerCase();
                query = query.or(`name.ilike.%${term}%,company_name.ilike.%${term}%,email.ilike.%${term}%`);
            }

            return query;
        };

        const scoped = await buildBaseQuery().eq('organization_id', scopeId);
        if (getErrorCode(scoped.error) === '42703') {
            throw new Error('[DB] getClients: Missing organization_id column (Tenant Isolation lockdown)');
        }

        const { data, error } = scoped;
        
        if (error) {
            console.error('[DB] Error fetching clients:', error);
            throw new Error(error.message || 'Failed to fetch clients');
        }
        
        // Transform database records to Client interface
        return (data || []).map((row: unknown) => {
            const r: UnknownRecord = asObject(row) ?? {};
            return {
                id: r.id,
                name: r.name,
                companyName: r.company_name,
                avatar: r.avatar,
                package: r.package,
                status: r.status,
                contactPerson: r.contact_person,
                email: r.email,
                phone: r.phone,
                joinedAt: r.joined_at,
                assetsFolderUrl: r.assets_folder_url,
                source: r.source,
            } as Client;
        });
    } catch (error) {
        reportTenantIsolationIfNeeded('getClients', error);
        console.error('[DB] Error in getClients:', error);
        throw error;
    }
}

/**
 * Get tenants from database
 */
export async function getTenants(filters?: {
    tenantId?: string;
    status?: string;
    ownerEmail?: string;
    subdomain?: string;
    allowUnscoped?: boolean;
}): Promise<Tenant[]> {
    await initDatabase();
    assertDbAvailable('getTenants');

    try {
        if (!filters?.tenantId) {
            if (!filters?.allowUnscoped) {
                throw new Error('[DB] getTenants: Missing tenantId (Tenant Isolation lockdown)');
            }
            assertUnscopedAccessAllowed('getTenants');
        }

        let query = supabase.from('nexus_tenants').select('*');

        if (filters?.tenantId) {
            query = query.eq('id', filters.tenantId);
        }
        if (filters?.status) {
            query = query.eq('status', filters.status);
        }
        if (filters?.ownerEmail) {
            query = query.eq('owner_email', filters.ownerEmail);
        }
        if (filters?.subdomain) {
            query = query.eq('subdomain', filters.subdomain);
        }

        const { data, error } = await query;

        if (error) {
            console.error('[DB] Error fetching tenants:', error);
            throw new Error(error.message || 'Failed to fetch tenants');
        }

        return (data || []).map((row: unknown) => {
            const r: UnknownRecord = asObject(row) ?? {};
            return {
                id: r.id,
                name: r.name,
                ownerEmail: r.owner_email,
                subdomain: r.subdomain,
                plan: r.plan,
                status: r.status,
                joinedAt: r.joined_at,
                mrr: Number(r.mrr ?? 0) || 0,
                usersCount: Number(r.users_count ?? 0) || 0,
                logo: r.logo,
                modules: Array.isArray(r.modules) ? r.modules : [],
                region: r.region,
                version: r.version,
                allowedEmails: Array.isArray(r.allowed_emails) ? r.allowed_emails : [],
                requireApproval: Boolean(r.require_approval ?? false),
            } as Tenant;
        });
    } catch (error) {
        reportTenantIsolationIfNeeded('getTenants', error);
        console.error('[DB] Error in getTenants:', error);
        throw error;
    }
}

/**
 * Create a new record
 */
export async function createRecord<T extends { id: string }>(
    table: 'users' | 'tasks' | 'clients' | 'time_entries' | 'tenants',
    data: Omit<T, 'id'>,
    options?: {
        organizationId?: string;
        tenantId?: string;
        allowUnscoped?: boolean;
    }
): Promise<T> {
    await initDatabase();
    assertDbAvailable('createRecord');
    
    try {
        // Map table names to actual database table names
        const dbTableName = TABLE_NAME_MAP[table] || table;
        
        // Transform data to database format (snake_case)
        let dbData: Record<string, unknown> = {};
        
        if (table === 'users') {
            const userData = data as unknown as Omit<User, 'id'>;
            dbData = {
                name: userData.name,
                role: userData.role,
                department: userData.department,
                avatar: userData.avatar,
                online: userData.online,
                capacity: userData.capacity,
                email: userData.email,
                phone: userData.phone,
                location: userData.location,
                bio: userData.bio,
                payment_type: userData.paymentType,
                hourly_rate: userData.hourlyRate,
                monthly_salary: userData.monthlySalary,
                commission_pct: userData.commissionPct,
                bonus_per_task: userData.bonusPerTask,
                accumulated_bonus: userData.accumulatedBonus,
                streak_days: userData.streakDays,
                weekly_score: userData.weeklyScore,
                pending_reward: userData.pendingReward ? JSON.stringify(userData.pendingReward) : null,
                targets: userData.targets ? JSON.stringify(userData.targets) : null,
                notification_preferences: userData.notificationPreferences ? JSON.stringify(userData.notificationPreferences) : null,
                two_factor_enabled: userData.twoFactorEnabled,
                is_super_admin: userData.isSuperAdmin,
                billing_info: userData.billingInfo ? JSON.stringify(userData.billingInfo) : null,
            };
        } else if (table === 'tasks') {
            const taskData = data as unknown as Omit<Task, 'id'>;
            // Generate UUID for id field (PostgreSQL should do this automatically, but we ensure it)
            const { randomUUID } = require('crypto');
            const now = new Date().toISOString();
            dbData = {
                id: randomUUID(), // Explicitly generate UUID to ensure it's not null
                title: taskData.title,
                description: taskData.description,
                status: taskData.status,
                priority: taskData.priority,
                assignee_ids: taskData.assigneeIds || [],
                assignee_id: taskData.assigneeId,
                creator_id: taskData.creatorId,
                tags: taskData.tags || [],
                created_at: taskData.createdAt || now,
                updated_at: now, // Explicitly set updated_at to ensure it's not null
                due_date: taskData.dueDate,
                due_time: taskData.dueTime,
                time_spent: taskData.timeSpent || 0,
                estimated_time: taskData.estimatedTime,
                approval_status: taskData.approvalStatus,
                is_timer_running: taskData.isTimerRunning || false,
                messages: JSON.stringify(taskData.messages || []),
                client_id: taskData.clientId,
                is_private: taskData.isPrivate,
                audio_url: taskData.audioUrl,
                snooze_count: taskData.snoozeCount || 0,
                is_focus: taskData.isFocus || false,
                completion_details: taskData.completionDetails ? JSON.stringify(taskData.completionDetails) : null,
                department: taskData.department,
            };
        } else if (table === 'clients') {
            const clientData = data as unknown as Omit<Client, 'id'>;
            dbData = {
                name: clientData.name,
                company_name: clientData.companyName,
                avatar: clientData.avatar,
                package: clientData.package,
                status: clientData.status,
                contact_person: clientData.contactPerson,
                email: clientData.email,
                phone: clientData.phone,
                joined_at: clientData.joinedAt,
                assets_folder_url: clientData.assetsFolderUrl,
                source: clientData.source,
            };
        } else if (table === 'time_entries') {
            const entryData = data as unknown as Omit<TimeEntry, 'id'>;
            dbData = {
                user_id: entryData.userId,
                start_time: entryData.startTime,
                end_time: entryData.endTime,
                date: entryData.date,
                duration_minutes: entryData.durationMinutes,
                void_reason: entryData.voidReason,
                voided_by: entryData.voidedBy,
                voided_at: entryData.voidedAt,
            };
        } else if (table === 'tenants') {
            const tenantData = data as unknown as Omit<Tenant, 'id'>;
            dbData = {
                name: tenantData.name,
                owner_email: tenantData.ownerEmail,
                subdomain: tenantData.subdomain,
                plan: tenantData.plan,
                status: tenantData.status,
                joined_at: tenantData.joinedAt,
                mrr: tenantData.mrr || 0,
                users_count: tenantData.usersCount || 0,
                logo: tenantData.logo,
                modules: tenantData.modules || [],
                region: tenantData.region,
                version: tenantData.version,
                allowed_emails: tenantData.allowedEmails || [],
                require_approval: tenantData.requireApproval || false,
            };
        }
        
        const requiresOrg = table === 'users' || table === 'tasks' || table === 'clients' || table === 'time_entries';
        const scopeId = requiresOrg
            ? requireScopeIdOrThrow(`createRecord(${table})`, {
                  organizationId: options?.organizationId,
                  tenantId: options?.tenantId,
              })
            : null;

        if (!requiresOrg) {
            // Tenant Isolation: tenants table is global. Require explicit, gated unscoped access.
            if (!options?.allowUnscoped) {
                throw new Error(`[DB] createRecord(${table}): Unscoped access requires allowUnscoped (Tenant Isolation lockdown)`);
            }
            assertUnscopedAccessAllowed(`createRecord(${table})`);
        }

        const organizationId = scopeId;

        let insertedData: unknown;
        let error: unknown;

        if (requiresOrg && organizationId) {
            const byOrg = await supabase
                .from(dbTableName)
                .insert({ ...dbData, organization_id: organizationId })
                .select()
                .single();
            insertedData = byOrg.data;
            error = byOrg.error;

            if (getErrorCode(error) === '42703') {
                throw new Error(`[DB] createRecord(${table}): Missing organization_id column (Tenant Isolation lockdown)`);
            }
        } else {
            const res = await supabase
                .from(dbTableName)
                .insert(dbData)
                .select()
                .single();
            insertedData = res.data;
            error = res.error;
        }
        
        if (error) {
            console.error(`[DB] Error creating ${table}:`, error);
            throw new Error(getErrorMessage(error));
        }

        const insertedObj: UnknownRecord = asObject(insertedData) ?? {};
        
        // Transform back to interface format
        if (table === 'users') {
            return {
                ...insertedObj,
                notificationPreferences: insertedObj.notification_preferences ? JSON.parse(String(insertedObj.notification_preferences)) : undefined,
                uiPreferences: insertedObj.ui_preferences ? JSON.parse(String(insertedObj.ui_preferences)) : undefined,
                targets: insertedObj.targets ? JSON.parse(String(insertedObj.targets)) : undefined,
                pendingReward: insertedObj.pending_reward ? JSON.parse(String(insertedObj.pending_reward)) : undefined,
                billingInfo: insertedObj.billing_info ? JSON.parse(String(insertedObj.billing_info)) : undefined,
            } as unknown as T;
        } else if (table === 'tasks') {
            return {
                id: insertedObj.id, // Ensure ID is included
                ...insertedObj,
                assigneeIds: Array.isArray(insertedObj.assignee_ids) ? insertedObj.assignee_ids : [],
                assigneeId: insertedObj.assignee_id,
                creatorId: insertedObj.creator_id,
                tags: Array.isArray(insertedObj.tags) ? insertedObj.tags : [],
                createdAt: insertedObj.created_at,
                dueDate: insertedObj.due_date,
                dueTime: insertedObj.due_time,
                timeSpent: Number(insertedObj.time_spent ?? 0) || 0,
                estimatedTime: insertedObj.estimated_time,
                approvalStatus: insertedObj.approval_status,
                isTimerRunning: Boolean(insertedObj.is_timer_running ?? false),
                messages: (() => {
                    try {
                        if (!insertedObj.messages) return [];
                        return typeof insertedObj.messages === 'string' ? JSON.parse(insertedObj.messages) : insertedObj.messages;
                    } catch {
                        return [];
                    }
                })(),
                clientId: insertedObj.client_id,
                isPrivate: insertedObj.is_private,
                audioUrl: insertedObj.audio_url,
                snoozeCount: Number(insertedObj.snooze_count ?? 0) || 0,
                isFocus: Boolean(insertedObj.is_focus ?? false),
                completionDetails: (() => {
                    try {
                        if (!insertedObj.completion_details) return undefined;
                        return typeof insertedObj.completion_details === 'string'
                            ? JSON.parse(insertedObj.completion_details)
                            : insertedObj.completion_details;
                    } catch {
                        return undefined;
                    }
                })(),
                department: insertedObj.department,
            } as unknown as T;
        } else if (table === 'clients') {
            return {
                ...insertedObj,
                companyName: insertedObj.company_name,
                contactPerson: insertedObj.contact_person,
                joinedAt: insertedObj.joined_at,
                assetsFolderUrl: insertedObj.assets_folder_url,
            } as unknown as T;
        } else if (table === 'time_entries') {
            return {
                ...insertedObj,
                userId: insertedObj.user_id,
                startTime: insertedObj.start_time,
                endTime: insertedObj.end_time,
                durationMinutes: insertedObj.duration_minutes,
                voidReason: insertedObj.void_reason,
                voidedBy: insertedObj.voided_by,
                voidedAt: insertedObj.voided_at,
            } as unknown as T;
        } else if (table === 'tenants') {
            return {
                ...insertedObj,
                ownerEmail: insertedObj.owner_email,
                joinedAt: insertedObj.joined_at,
                usersCount: Number(insertedObj.users_count ?? 0) || 0,
                allowedEmails: Array.isArray(insertedObj.allowed_emails) ? insertedObj.allowed_emails : [],
                requireApproval: Boolean(insertedObj.require_approval ?? false),
            } as unknown as T;
        }
        
        return insertedObj as unknown as T;
    } catch (error) {
        reportTenantIsolationIfNeeded('createRecord', error);
        console.error(`[DB] Error in createRecord for ${table}:`, error);
        throw error;
    }
}

/**
 * Update a record
 */
export async function updateRecord<T extends { id: string }>(
    table: 'users' | 'tasks' | 'clients' | 'time_entries' | 'tenants',
    id: string,
    updates: Partial<T>,
    options?: {
        organizationId?: string;
        tenantId?: string;
        allowUnscoped?: boolean;
    }
): Promise<T> {
    await initDatabase();
    assertDbAvailable('updateRecord');
    
    try {
        // Transform updates to database format
        let dbUpdates: Record<string, unknown> = {};
        
        if (table === 'users') {
            const userUpdates = updates as Partial<User>;
            if (userUpdates.notificationPreferences !== undefined) {
                dbUpdates.notification_preferences = JSON.stringify(userUpdates.notificationPreferences);
            }
            if (userUpdates.uiPreferences !== undefined) {
                dbUpdates.ui_preferences = JSON.stringify(userUpdates.uiPreferences);
            }
            if (userUpdates.targets !== undefined) {
                dbUpdates.targets = JSON.stringify(userUpdates.targets);
            }
            if (userUpdates.pendingReward !== undefined) {
                dbUpdates.pending_reward = userUpdates.pendingReward ? JSON.stringify(userUpdates.pendingReward) : null;
            }
            if (userUpdates.billingInfo !== undefined) {
                dbUpdates.billing_info = userUpdates.billingInfo ? JSON.stringify(userUpdates.billingInfo) : null;
            }
            // Map other fields
            Object.keys(userUpdates).forEach(key => {
                if (!['notificationPreferences', 'uiPreferences', 'targets', 'pendingReward', 'billingInfo'].includes(key)) {
                    const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
                    dbUpdates[dbKey] = (userUpdates as unknown as Record<string, unknown>)[key];
                }
            });
        } else if (table === 'tasks') {
            const taskUpdates = updates as Partial<Task>;
            if (taskUpdates.assigneeIds !== undefined) dbUpdates.assignee_ids = taskUpdates.assigneeIds;
            if (taskUpdates.messages !== undefined) dbUpdates.messages = JSON.stringify(taskUpdates.messages);
            if (taskUpdates.completionDetails !== undefined) {
                dbUpdates.completion_details = taskUpdates.completionDetails ? JSON.stringify(taskUpdates.completionDetails) : null;
            }
            // Map other fields
            Object.keys(taskUpdates).forEach(key => {
                if (!['assigneeIds', 'messages', 'completionDetails'].includes(key)) {
                    const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
                    dbUpdates[dbKey] = (taskUpdates as unknown as Record<string, unknown>)[key];
                }
            });
        } else if (table === 'clients') {
            const clientUpdates = updates as Partial<Client>;
            if (clientUpdates.companyName !== undefined) dbUpdates.company_name = clientUpdates.companyName;
            if (clientUpdates.contactPerson !== undefined) dbUpdates.contact_person = clientUpdates.contactPerson;
            if (clientUpdates.joinedAt !== undefined) dbUpdates.joined_at = clientUpdates.joinedAt;
            if (clientUpdates.assetsFolderUrl !== undefined) dbUpdates.assets_folder_url = clientUpdates.assetsFolderUrl;
            // Map other fields
            Object.keys(clientUpdates).forEach(key => {
                if (!['companyName', 'contactPerson', 'joinedAt', 'assetsFolderUrl'].includes(key)) {
                    dbUpdates[key] = (clientUpdates as unknown as Record<string, unknown>)[key];
                }
            });
        } else if (table === 'time_entries') {
            const entryUpdates = updates as Partial<TimeEntry>;
            if (entryUpdates.userId !== undefined) dbUpdates.user_id = entryUpdates.userId;
            if (entryUpdates.startTime !== undefined) dbUpdates.start_time = entryUpdates.startTime;
            if (entryUpdates.endTime !== undefined) dbUpdates.end_time = entryUpdates.endTime;
            if (entryUpdates.durationMinutes !== undefined) dbUpdates.duration_minutes = entryUpdates.durationMinutes;
            if (entryUpdates.voidReason !== undefined) dbUpdates.void_reason = entryUpdates.voidReason;
            if (entryUpdates.voidedBy !== undefined) dbUpdates.voided_by = entryUpdates.voidedBy;
            if (entryUpdates.voidedAt !== undefined) dbUpdates.voided_at = entryUpdates.voidedAt;
            if (entryUpdates.date !== undefined) dbUpdates.date = entryUpdates.date;
        } else if (table === 'tenants') {
            const tenantUpdates = updates as Partial<Tenant>;
            if (tenantUpdates.name !== undefined) dbUpdates.name = tenantUpdates.name;
            if (tenantUpdates.ownerEmail !== undefined) dbUpdates.owner_email = tenantUpdates.ownerEmail;
            if (tenantUpdates.subdomain !== undefined) dbUpdates.subdomain = tenantUpdates.subdomain;
            if (tenantUpdates.plan !== undefined) dbUpdates.plan = tenantUpdates.plan;
            if (tenantUpdates.region !== undefined) dbUpdates.region = tenantUpdates.region;
            if (tenantUpdates.status !== undefined) dbUpdates.status = tenantUpdates.status;
            if (tenantUpdates.mrr !== undefined) dbUpdates.mrr = tenantUpdates.mrr;
            if (tenantUpdates.usersCount !== undefined) dbUpdates.users_count = tenantUpdates.usersCount;
            if (tenantUpdates.logo !== undefined) dbUpdates.logo = tenantUpdates.logo;
            if (tenantUpdates.modules !== undefined) dbUpdates.modules = tenantUpdates.modules;
            if (tenantUpdates.version !== undefined) dbUpdates.version = tenantUpdates.version;
            if (tenantUpdates.allowedEmails !== undefined) dbUpdates.allowed_emails = tenantUpdates.allowedEmails;
            if (tenantUpdates.requireApproval !== undefined) dbUpdates.require_approval = tenantUpdates.requireApproval;
        }
        
        // Map table names to actual database table names
        const dbTableName = TABLE_NAME_MAP[table] || table;

        const baseQuery = supabase
            .from(dbTableName)
            .update(dbUpdates)
            .eq('id', id);

        let updatedData: unknown;
        let error: unknown;

        const requiresOrg = table === 'users' || table === 'tasks' || table === 'clients' || table === 'time_entries';

        if (requiresOrg) {
            const scopeId = requireScopeIdOrThrow(`updateRecord(${table})`, {
                organizationId: options?.organizationId,
                tenantId: options?.tenantId,
            });

            const byOrg = await baseQuery.eq('organization_id', scopeId).select().single();
            updatedData = byOrg.data;
            error = byOrg.error;

            if (getErrorCode(error) === '42703') {
                throw new Error(`[DB] updateRecord(${table}): Missing organization_id column (Tenant Isolation lockdown)`);
            }
        } else {
            if (!options?.allowUnscoped) {
                throw new Error(`[DB] updateRecord(${table}): Unscoped access requires allowUnscoped (Tenant Isolation lockdown)`);
            }
            assertUnscopedAccessAllowed(`updateRecord(${table})`);
            const res = await baseQuery.select().single();
            updatedData = res.data;
            error = res.error;
        }
        
        if (error) {
            console.error(`[DB] Error updating ${table}:`, error);
            throw new Error(getErrorMessage(error));
        }

        const updatedObj: UnknownRecord = asObject(updatedData) ?? {};
        
        // Transform back to interface format
        if (table === 'tenants') {
            return {
                ...updatedObj,
                ownerEmail: updatedObj.owner_email,
                joinedAt: updatedObj.joined_at,
                usersCount: Number(updatedObj.users_count ?? 0) || 0,
                allowedEmails: Array.isArray(updatedObj.allowed_emails) ? updatedObj.allowed_emails : [],
                requireApproval: Boolean(updatedObj.require_approval ?? false),
            } as unknown as T;
        }
        
        // Transform back (similar to createRecord)
        return updatedObj as unknown as T;
    } catch (error) {
        reportTenantIsolationIfNeeded('updateRecord', error);
        console.error(`[DB] Error in updateRecord for ${table}:`, error);
        throw error;
    }
}

/**
 * Delete a record
 */
export async function deleteRecord(
    table: 'users' | 'tasks' | 'clients' | 'time_entries' | 'tenants',
    id: string,
    options?: {
        organizationId?: string;
        tenantId?: string;
        allowUnscoped?: boolean;
    }
): Promise<void> {
    await initDatabase();
    assertDbAvailable('deleteRecord');
    
    try {
        // Map table names to actual database table names
        const dbTableName = TABLE_NAME_MAP[table] || table;
        
        const baseQuery = supabase
            .from(dbTableName)
            .delete()
            .eq('id', id);

        let error: unknown;

        const requiresOrg = table === 'users' || table === 'tasks' || table === 'clients' || table === 'time_entries';
        if (requiresOrg) {
            const scopeId = requireScopeIdOrThrow(`deleteRecord(${table})`, {
                organizationId: options?.organizationId,
                tenantId: options?.tenantId,
            });

            const byOrg = await baseQuery.eq('organization_id', scopeId);
            error = byOrg.error;

            if (getErrorCode(error) === '42703') {
                throw new Error(`[DB] deleteRecord(${table}): Missing organization_id column (Tenant Isolation lockdown)`);
            }
        } else {
            if (!options?.allowUnscoped) {
                throw new Error(`[DB] deleteRecord(${table}): Unscoped access requires allowUnscoped (Tenant Isolation lockdown)`);
            }
            assertUnscopedAccessAllowed(`deleteRecord(${table})`);
            const res = await baseQuery;
            error = res.error;
        }
        
        if (error) {
            console.error(`[DB] Error deleting ${table}:`, error);
            throw new Error(getErrorMessage(error));
        }
        
        console.log(`[DB] Deleted ${table} record: ${id}`);
    } catch (error) {
        reportTenantIsolationIfNeeded('deleteRecord', error);
        console.error(`[DB] Error in deleteRecord for ${table}:`, error);
        throw error;
    }
}

// ============================================
// ROLES & PERMISSIONS FUNCTIONS
// ============================================

/**
 * Get all permissions from database
 * @deprecated Legacy RBAC tables (misrad_permissions). Do not use in new code.
 */
export async function getPermissions(): Promise<Array<{ id: PermissionId; label: string; description: string; category: string }>> {
    await initDatabase();
    assertDbAvailable('getPermissions');
    
    try {
        assertUnscopedAccessAllowed('getPermissions');
        const { data, error } = await supabase
            .from('misrad_permissions')
            .select('*')
            .order('id');
        
        if (error) {
            console.error('[DB] Error fetching permissions:', error);
            throw new Error(error.message || 'Failed to fetch permissions');
        }
        
        return (data || []).map((p: unknown) => {
            const obj: UnknownRecord = asObject(p) ?? {};
            return {
                id: String(obj.id) as PermissionId,
                label: String(obj.label ?? ''),
                description: String(obj.description ?? ''),
                category: String(obj.category ?? 'access'),
            };
        });
    } catch (error) {
        reportTenantIsolationIfNeeded('getPermissions', error);
        console.error('[DB] Error in getPermissions:', error);
        throw error;
    }
}

/**
 * Get all roles from database
 * @deprecated Legacy RBAC tables (misrad_roles). Do not use in new code.
 */
export async function getRoles(): Promise<RoleDefinition[]> {
    await initDatabase();
    assertDbAvailable('getRoles');
    
    try {
        assertUnscopedAccessAllowed('getRoles');
        const { data, error } = await supabase
            .from('misrad_roles')
            .select('*')
            .order('name');
        
        if (error) {
            console.error('[DB] Error fetching roles:', error);
            throw new Error(error.message || 'Failed to fetch roles');
        }
        
        return (data || []).map((r: unknown) => {
            const obj: UnknownRecord = asObject(r) ?? {};
            return {
                id: String(obj.id ?? ''),
                name: String(obj.name ?? ''),
                permissions: (Array.isArray(obj.permissions) ? (obj.permissions as PermissionId[]) : []),
                isSystem: Boolean(obj.is_system ?? false),
                description: obj.description,
            } as RoleDefinition;
        });
    } catch (error) {
        reportTenantIsolationIfNeeded('getRoles', error);
        console.error('[DB] Error in getRoles:', error);
        throw error;
    }
}

/**
 * Get role by name
 * @deprecated Legacy RBAC tables (misrad_roles). Do not use in new code.
 */
export async function getRoleByName(name: string): Promise<RoleDefinition | null> {
    await initDatabase();
    assertDbAvailable('getRoleByName');
    
    try {
        assertUnscopedAccessAllowed('getRoleByName');
        const { data, error } = await supabase
            .from('misrad_roles')
            .select('*')
            .eq('name', name)
            .single();
        
        if (error || !data) {
            return null;
        }
        
        const obj: UnknownRecord = asObject(data) ?? {};
        return {
            id: String(obj.id ?? ''),
            name: String(obj.name ?? ''),
            permissions: (Array.isArray(obj.permissions) ? (obj.permissions as PermissionId[]) : []),
            isSystem: Boolean(obj.is_system ?? false),
            description: obj.description,
        } as RoleDefinition;
    } catch (error) {
        reportTenantIsolationIfNeeded('getRoleByName', error);
        console.error('[DB] Error in getRoleByName:', error);
        throw error;
    }
}

/**
 * Create a new role
 * @deprecated Legacy RBAC tables (misrad_roles). Do not use in new code.
 */
export async function createRole(role: Omit<RoleDefinition, 'id'>): Promise<RoleDefinition> {
    await initDatabase();
    assertDbAvailable('createRole');
    
    try {
        assertUnscopedAccessAllowed('createRole');
        const roleObj = role as unknown as Record<string, unknown>;
        const { data, error } = await supabase
            .from('misrad_roles')
            .insert({
                name: role.name,
                permissions: role.permissions,
                is_system: role.isSystem || false,
                description: roleObj.description ?? null
            })
            .select()
            .single();
        
        if (error) {
            console.error('[DB] Error creating role:', error);
            throw error;
        }
        
        const obj: UnknownRecord = asObject(data) ?? {};
        return {
            id: String(obj.id ?? ''),
            name: String(obj.name ?? ''),
            permissions: (Array.isArray(obj.permissions) ? (obj.permissions as PermissionId[]) : []),
            isSystem: Boolean(obj.is_system ?? false),
            description: obj.description,
        } as RoleDefinition;
    } catch (error) {
        reportTenantIsolationIfNeeded('createRole', error);
        console.error('[DB] Error in createRole:', error);
        throw error;
    }
}

/**
 * Update a role
 * @deprecated Legacy RBAC tables (misrad_roles). Do not use in new code.
 */
export async function updateRole(roleId: string, updates: Partial<RoleDefinition>): Promise<RoleDefinition> {
    await initDatabase();
    assertDbAvailable('updateRole');
    
    try {
        assertUnscopedAccessAllowed('updateRole');
        const dbUpdates: Record<string, unknown> = {};
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.permissions !== undefined) dbUpdates.permissions = updates.permissions;
        if (updates.isSystem !== undefined) dbUpdates.is_system = updates.isSystem;
        const updatesObj = updates as unknown as Record<string, unknown>;
        if (updatesObj.description !== undefined) dbUpdates.description = updatesObj.description;
        
        const { data, error } = await supabase
            .from('misrad_roles')
            .update(dbUpdates)
            .eq('id', roleId)
            .select()
            .single();
        
        if (error) {
            console.error('[DB] Error updating role:', error);
            throw error;
        }
        
        const obj: UnknownRecord = asObject(data) ?? {};
        return {
            id: String(obj.id ?? ''),
            name: String(obj.name ?? ''),
            permissions: (Array.isArray(obj.permissions) ? (obj.permissions as PermissionId[]) : []),
            isSystem: Boolean(obj.is_system ?? false),
            description: obj.description,
        } as RoleDefinition;
    } catch (error) {
        reportTenantIsolationIfNeeded('updateRole', error);
        console.error('[DB] Error in updateRole:', error);
        throw error;
    }
}

/**
 * Delete a role (only if not system role)
 * @deprecated Legacy RBAC tables (misrad_roles). Do not use in new code.
 */
export async function deleteRole(roleId: string): Promise<void> {
    await initDatabase();
    assertDbAvailable('deleteRole');
    
    try {
        assertUnscopedAccessAllowed('deleteRole');
        // Check if role is system role
        const { data: role, error: fetchError } = await supabase
            .from('misrad_roles')
            .select('is_system')
            .eq('id', roleId)
            .single();
        
        if (fetchError) {
            throw fetchError;
        }
        
        if (role?.is_system) {
            throw new Error('Cannot delete system role');
        }
        
        const { error } = await supabase
            .from('misrad_roles')
            .delete()
            .eq('id', roleId);
        
        if (error) {
            console.error('[DB] Error deleting role:', error);
            throw error;
        }
        
        console.log('[DB] Deleted role:', roleId);
    } catch (error) {
        reportTenantIsolationIfNeeded('deleteRole', error);
        console.error('[DB] Error in deleteRole:', error);
        throw error;
    }
}

/**
 * Get user permissions (from their role)
 */
export async function getUserPermissions(userId: string): Promise<PermissionId[]> {
    await initDatabase();
    assertDbAvailable('getUserPermissions');
    
    try {
        throw new Error(
            '[DB] getUserPermissions: Unscoped access is blocked. Use getUserPermissionsForTenant (Tenant Isolation lockdown)'
        );
    } catch (error) {
        reportTenantIsolationIfNeeded('getUserPermissions', error);
        console.error('[DB] Error in getUserPermissions:', error);
        throw error;
    }
}

export async function getUserPermissionsForTenant(params: {
    userId: string;
    organizationId?: string;
    tenantId?: string;
}): Promise<PermissionId[]> {
    await initDatabase();
    assertDbAvailable('getUserPermissionsForTenant');

    const scopeId = requireScopeIdOrThrow('getUserPermissionsForTenant', {
        organizationId: params.organizationId,
        tenantId: params.tenantId,
    });

    try {
        // Tenant Isolation: ensure the user row exists inside the requested scope.
        const byOrg = await supabase
            .from('nexus_users')
            .select('id')
            .eq('id', params.userId)
            .eq('organization_id', scopeId)
            .single();

        if (getErrorCode(byOrg.error) === '42703') {
            throw new Error('[DB] getUserPermissionsForTenant: Missing organization_id column (Tenant Isolation lockdown)');
        }

        if (byOrg.error || !byOrg.data) {
            throw new Error('[DB] getUserPermissionsForTenant: User not found in tenant scope');
        }

        // Use the database function
        const { data, error } = await supabase
            .rpc('get_user_permissions', { user_id_param: params.userId });
        
        if (error) {
            console.error('[DB] Error getting user permissions:', error);
            throw new Error(error.message || 'Failed to get user permissions');
        }
        
        return (data || []) as PermissionId[];
    } catch (error) {
        reportTenantIsolationIfNeeded('getUserPermissionsForTenant', error);
        console.error('[DB] Error in getUserPermissionsForTenant:', error);
        throw error;
    }
}

/**
 * Assign role to user
 */
export async function assignRoleToUser(
    userId: string,
    roleId: string,
    options?: { organizationId?: string; tenantId?: string }
): Promise<void> {
    await initDatabase();
    assertDbAvailable('assignRoleToUser');
    
    try {
        const scopeId = requireScopeIdOrThrow('assignRoleToUser', {
            organizationId: options?.organizationId,
            tenantId: options?.tenantId,
        });

        const base = supabase
            .from('nexus_users')
            .update({ role_id: roleId })
            .eq('id', userId);

        const byOrg = await base.eq('organization_id', scopeId);
        const error = byOrg.error;

        if (getErrorCode(error) === '42703') {
            throw new Error('[DB] assignRoleToUser: Missing organization_id column (Tenant Isolation lockdown)');
        }
         
        if (error) {
            console.error('[DB] Error assigning role to user:', error);
            throw new Error(getErrorMessage(error));
        }
        
        console.log('[DB] Assigned role:', roleId, 'to user:', userId);
    } catch (error) {
        reportTenantIsolationIfNeeded('assignRoleToUser', error);
        console.error('[DB] Error in assignRoleToUser:', error);
        throw error;
    }
}

/**
 * Set user's manager (hierarchy)
 */
 export async function setUserManager(
     userId: string,
     managerId: string | null | undefined,
     options?: { organizationId?: string; tenantId?: string }
 ): Promise<void> {
     await initDatabase();
     assertDbAvailable('setUserManager');

     const scopeId = requireScopeIdOrThrow('setUserManager', {
         organizationId: options?.organizationId,
         tenantId: options?.tenantId,
     });

     return setUserManagerForTenant(userId, managerId, scopeId);
 }

export async function setUserManagerForTenant(
    userId: string,
    managerId: string | null | undefined,
    tenantId: string
): Promise<void> {
    await initDatabase();
    assertDbAvailable('setUserManagerForTenant');

    if (!tenantId) {
        throw new Error('Missing tenantId');
    }

    try {
        if (managerId === userId) {
            throw new Error('User cannot be their own manager');
        }

        const fetchManager = async (id: string) => {
            const res = await supabase
                .from('nexus_users')
                .select('manager_id')
                .eq('id', id)
                .eq('organization_id', tenantId)
                .single();

            if (getErrorCode(res.error) === '42703') {
                throw new Error('[DB] setUserManagerForTenant: Missing organization_id column (Tenant Isolation lockdown)');
            }

            return res;
        };

        const fetchUserExists = async (id: string) => {
            const res = await supabase
                .from('nexus_users')
                .select('id')
                .eq('id', id)
                .eq('organization_id', tenantId)
                .single();

            if (getErrorCode(res.error) === '42703') {
                throw new Error('[DB] setUserManagerForTenant: Missing organization_id column (Tenant Isolation lockdown)');
            }

            return res;
        };

        const userRow = await fetchUserExists(userId);
        if (userRow?.error || !userRow?.data) {
            throw new Error('User not found');
        }

        if (managerId) {
            const managerRow = await fetchUserExists(managerId);
            if (managerRow?.error || !managerRow?.data) {
                throw new Error('Manager not found');
            }

            const managerData = await fetchManager(managerId);
            if (managerData?.error && managerData.error.code !== 'PGRST116') {
                throw managerData.error;
            }

            const managerDataObj = asObject(managerData.data);
            if (managerDataObj?.manager_id === userId) {
                throw new Error('Circular hierarchy detected: Cannot set manager - this would create a loop');
            }

            let currentManagerId = managerDataObj?.manager_id;
            const visited = new Set<string>([userId, managerId]);

            while (currentManagerId) {
                if (visited.has(String(currentManagerId))) {
                    throw new Error('Circular hierarchy detected: This manager chain would create a loop');
                }
                visited.add(String(currentManagerId));

                const nextManager = await fetchManager(String(currentManagerId));
                if (nextManager?.error && nextManager.error.code !== 'PGRST116') {
                    break;
                }

                const nextObj = asObject(nextManager.data);
                currentManagerId = nextObj?.manager_id || null;
            }
        }

        const updateRes = await supabase
            .from('nexus_users')
            .update({ manager_id: managerId ?? null })
            .eq('id', userId)
            .eq('organization_id', tenantId);

        if (getErrorCode(updateRes.error) === '42703') {
            throw new Error('[DB] setUserManagerForTenant: Missing organization_id column (Tenant Isolation lockdown)');
        }
        if (updateRes.error) {
            throw new Error(getErrorMessage(updateRes.error));
        }
    } catch (error) {
        reportTenantIsolationIfNeeded('setUserManagerForTenant', error);
        console.error('[DB] Error in setUserManagerForTenant:', error);
        throw error;
    }
}

/**
 * Get users by manager (get all direct reports)
 */
export async function getUsersByManager(managerId: string): Promise<User[]> {
    await initDatabase();
    assertDbAvailable('getUsersByManager');
    
    try {
        throw new Error('[DB] getUsersByManager is disabled (Tenant Isolation lockdown)');
    } catch (error) {
        reportTenantIsolationIfNeeded('getUsersByManager', error);
        console.error('[DB] Error in getUsersByManager:', error);
        throw error;
    }
}
