/**
 * Database Connection & Utilities
 * 
 * Centralized database access layer using Supabase
 */

import { User, Task, Client, TimeEntry, Tenant, RoleDefinition, PermissionId } from '../types';

// Dynamic import for Supabase to avoid client-side bundling issues
let supabase: any = null;
let isSupabaseConfigured = false;

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

// Initialize Supabase only on server-side
if (typeof window === 'undefined') {
  try {
    const supabaseModule = require('./supabase');
    supabase = supabaseModule.createClient();
    isSupabaseConfigured = supabaseModule.isSupabaseConfigured;
  } catch (error) {
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
        
        try {
            const { error } = await supabase.from('nexus_users').select('count').limit(1);
            if (error && error.code !== 'PGRST116') {
                throw new Error(`[DB] initDatabase: Supabase connection issue: ${error.message}`);
            } else {
                console.log('[DB] Database initialized (Supabase)');
            }
        } catch (error: any) {
            throw new Error(`[DB] initDatabase: Database initialization error: ${error?.message || error}`);
        }
    })();
    
    return dbInitPromise;
}

/**
 * Get users from database
 */
export async function getUsers(filters?: {
    userId?: string;
    department?: string;
    role?: string;
    email?: string;
    tenantId?: string;
}): Promise<User[]> {
    await initDatabase();
    assertDbAvailable('getUsers');
    
    try {
        const buildBaseQuery = () => {
            let query = supabase.from('nexus_users').select('*');

            if (filters?.userId) {
                query = query.eq('id', filters.userId);
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

            return query;
        };

        const tryTenantScopedQuery = async () => {
            if (!filters?.tenantId) {
                throw new Error('[DB] getUsers: Missing tenantId (Tenant Isolation lockdown)');
            }

            // Emergency isolation: do NOT fall back to unscoped queries.
            // Prefer tenant_id, otherwise organization_id. If neither exists -> fail closed.
            const byTenant = await buildBaseQuery().eq('tenant_id', filters.tenantId);
            if ((byTenant as any)?.error?.code === '42703') {
                const byOrg = await buildBaseQuery().eq('organization_id', filters.tenantId);
                if ((byOrg as any)?.error?.code === '42703') {
                    throw new Error('[DB] getUsers: No tenant scoping column (tenant_id/organization_id) (Tenant Isolation lockdown)');
                }
                return byOrg;
            }
            return byTenant;
        };
    
        const { data, error } = await tryTenantScopedQuery();
        
        if (error) {
            console.error('[DB] Error fetching users:', error);
            throw new Error(error.message || 'Failed to fetch users');
        }
        
        // Transform database records to User interface
        return (data || []).map((row: any) => {
            const parseJson = (jsonStr: string | null | undefined) => {
                if (!jsonStr) return undefined;
                try {
                    return typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
                } catch (e) {
                    console.warn('[DB] Failed to parse JSON:', e);
                    return undefined;
                }
            };
            
            return {
                ...row,
                paymentType: row.payment_type,
                hourlyRate: row.hourly_rate ? parseFloat(row.hourly_rate) : undefined,
                monthlySalary: row.monthly_salary ? parseFloat(row.monthly_salary) : undefined,
                commissionPct: row.commission_pct,
                bonusPerTask: row.bonus_per_task ? parseFloat(row.bonus_per_task) : undefined,
                accumulatedBonus: row.accumulated_bonus ? parseFloat(row.accumulated_bonus) : 0,
                streakDays: row.streak_days || 0,
                weeklyScore: row.weekly_score ? parseFloat(row.weekly_score) : undefined,
                notificationPreferences: parseJson(row.notification_preferences),
                uiPreferences: parseJson(row.ui_preferences),
                targets: parseJson(row.targets),
                pendingReward: parseJson(row.pending_reward),
                billingInfo: parseJson(row.billing_info),
                twoFactorEnabled: row.two_factor_enabled || false,
                isSuperAdmin: row.is_super_admin || false,
                managerId: row.manager_id || undefined, // NEW: Hierarchy support
                managedDepartment: row.managed_department || undefined, // NEW: Department manager support
                tenantId: row.tenant_id || row.organization_id || undefined, // NEW: Tenant/Organization ID support
            };
        }) as User[];
    } catch (error) {
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
}): Promise<Task[]> {
    await initDatabase();
    assertDbAvailable('getTasks');
    
    try {
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
            // Check if assigneeId is in assignee_ids array OR matches assignee_id
            // Using contains operator for array check
            query = query.or(`assignee_ids.cs.{${filters.assigneeId}},assignee_id.eq.${filters.assigneeId}`);
        }
        
        const { data, error } = await query;
        
        if (error) {
            console.error('[DB] Error fetching tasks:', error);
            console.error('[DB] Error details:', JSON.stringify(error, null, 2));
            throw new Error(error.message || 'Failed to fetch tasks');
        }
        
        // Transform database records to Task interface
        return (data || []).map((row: any) => ({
            id: row.id,
            title: row.title,
            description: row.description || '',
            status: row.status,
            priority: row.priority,
            assigneeIds: row.assignee_ids || [],
            assigneeId: row.assignee_id,
            creatorId: row.creator_id,
            tags: row.tags || [],
            createdAt: row.created_at,
            dueDate: row.due_date,
            dueTime: row.due_time ? (typeof row.due_time === 'string' ? row.due_time.substring(0, 5) : row.due_time) : undefined, // Format HH:mm (remove seconds if present)
            timeSpent: row.time_spent || 0,
            estimatedTime: row.estimated_time,
            approvalStatus: row.approval_status,
            isTimerRunning: row.is_timer_running || false,
            messages: (() => {
                try {
                    return row.messages ? (typeof row.messages === 'string' ? JSON.parse(row.messages) : row.messages) : [];
                } catch (e) {
                    console.warn('[DB] Failed to parse messages:', e);
                    return [];
                }
            })(),
            clientId: row.client_id,
            isPrivate: row.is_private,
            audioUrl: row.audio_url,
            snoozeCount: row.snooze_count || 0,
            isFocus: row.is_focus || false,
            completionDetails: (() => {
                try {
                    return row.completion_details ? (typeof row.completion_details === 'string' ? JSON.parse(row.completion_details) : row.completion_details) : undefined;
                } catch (e) {
                    console.warn('[DB] Failed to parse completion_details:', e);
                    return undefined;
                }
            })(),
            department: row.department,
        })) as Task[];
    } catch (error) {
        console.error('[DB] Error in getTasks:', error);
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
}): Promise<Client[]> {
    await initDatabase();
    assertDbAvailable('getClients');
    
    try {
        let query = supabase.from('nexus_clients').select('*');

        if (filters?.organizationId) {
            query = query.eq('organization_id', filters.organizationId);
        }
    
    if (filters?.clientId) {
            query = query.eq('id', filters.clientId);
    }
    if (filters?.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
            query = query.or(`name.ilike.%${term}%,company_name.ilike.%${term}%,email.ilike.%${term}%`);
        }
        
        const { data, error } = await query;
        
        if (error) {
            console.error('[DB] Error fetching clients:', error);
            throw new Error(error.message || 'Failed to fetch clients');
        }
        
        // Transform database records to Client interface
        return (data || []).map((row: any) => ({
            id: row.id,
            name: row.name,
            companyName: row.company_name,
            avatar: row.avatar,
            package: row.package,
            status: row.status,
            contactPerson: row.contact_person,
            email: row.email,
            phone: row.phone,
            joinedAt: row.joined_at,
            assetsFolderUrl: row.assets_folder_url,
            source: row.source,
        })) as Client[];
    } catch (error) {
        console.error('[DB] Error in getClients:', error);
        throw error;
    }
}

/**
 * Get time entries from database
 */
export async function getTimeEntries(filters?: {
    entryId?: string;
    userId?: string;
    dateFrom?: string;
    dateTo?: string;
    tenantId?: string;
}): Promise<TimeEntry[]> {
    await initDatabase();
    assertDbAvailable('getTimeEntries');
    
    try {
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

            return query;
        };

        const tryTenantScopedQuery = async () => {
            if (!filters?.tenantId) {
                throw new Error('[DB] getTimeEntries: Missing tenantId (Tenant Isolation lockdown)');
            }

            // Emergency isolation: do NOT fall back to unscoped queries.
            const baseQuery = buildBaseQuery();
            const result = await baseQuery.eq('organization_id', filters.tenantId);
            if ((result as any)?.error?.code === '42703') {
                throw new Error('[DB] getTimeEntries: No organization_id column (Tenant Isolation lockdown)');
            }
            return result;
        };
        
        const { data, error } = await tryTenantScopedQuery();
        
        if (error) {
            console.error('[DB] Error fetching time entries:', error);
            throw new Error(error.message || 'Failed to fetch time entries');
        }
        
        // Transform database records to TimeEntry interface
        return (data || []).map((row: any) => ({
            id: row.id,
            userId: row.user_id,
            startTime: row.start_time,
            endTime: row.end_time,
            date: row.date,
            durationMinutes: row.duration_minutes,
            voidReason: row.void_reason,
            voidedBy: row.voided_by,
            voidedAt: row.voided_at,
        })) as TimeEntry[];
    } catch (error) {
        console.error('[DB] Error in getTimeEntries:', error);
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
}): Promise<Tenant[]> {
    await initDatabase();
    assertDbAvailable('getTenants');
    
    try {
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
        
        // Transform database records to Tenant interface
        return (data || []).map((row: any) => ({
            id: row.id,
            name: row.name,
            ownerEmail: row.owner_email,
            subdomain: row.subdomain,
            plan: row.plan,
            status: row.status,
            joinedAt: row.joined_at,
            mrr: row.mrr || 0,
            usersCount: row.users_count || 0,
            logo: row.logo,
            modules: row.modules || [],
            region: row.region,
            version: row.version,
            allowedEmails: row.allowed_emails || [],
            requireApproval: row.require_approval || false,
        })) as Tenant[];
    } catch (error) {
        console.error('[DB] Error in getTenants:', error);
        throw error;
    }
}

/**
 * Get financial data (aggregated)
 */
export async function getFinancialData(filters?: {
    userId?: string;
    department?: string;
    dateFrom?: string;
    dateTo?: string;
}): Promise<{
    users: Array<{
        user: User;
        totalHours: number;
        totalMinutes: number;
        estimatedCost: number;
        entriesCount: number;
    }>;
    totalRevenue: number;
    totalCost: number;
    netProfit: number;
}> {
    await initDatabase();
    assertDbAvailable('getFinancialData');
    
    const users = await getUsers({ department: filters?.department });
    const timeEntries = await getTimeEntries({
        userId: filters?.userId,
        dateFrom: filters?.dateFrom,
        dateTo: filters?.dateTo
    });
    
    const financialUsers = users.map(user => {
        const userEntries = timeEntries.filter(e => e.userId === user.id && e.endTime);
        const totalMinutes = userEntries.reduce((acc, curr) => acc + (curr.durationMinutes || 0), 0);
        const totalHours = totalMinutes / 60;
        
        let estimatedCost = 0;
        if (user.paymentType === 'hourly') {
            estimatedCost = totalHours * (user.hourlyRate || 0);
        } else if (user.paymentType === 'monthly') {
            estimatedCost = user.monthlySalary || 0;
        }
        
        return {
            user,
            totalHours,
            totalMinutes,
            estimatedCost,
            entriesCount: userEntries.length
        };
    });
    
    const totalCost = financialUsers.reduce((sum, f) => sum + f.estimatedCost, 0);
    
    return {
        users: financialUsers,
        totalRevenue: 0, // TODO: Calculate from leads/sales
        totalCost,
        netProfit: 0 - totalCost // TODO: Calculate properly
    };
}

/**
 * Create a new record
 */
export async function createRecord<T extends { id: string }>(
    table: 'users' | 'tasks' | 'clients' | 'time_entries' | 'tenants',
    data: Omit<T, 'id'>,
    options?: {
        organizationId?: string;
    }
): Promise<T> {
    await initDatabase();
    assertDbAvailable('createRecord');
    
    try {
        // Map table names to actual database table names
        const dbTableName = TABLE_NAME_MAP[table] || table;
        
        // Transform data to database format (snake_case)
        let dbData: any = {};
        
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

            if (options?.organizationId) {
                dbData.organization_id = options.organizationId;
            }
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

            if (options?.organizationId) {
                dbData.organization_id = options.organizationId;
            }
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
        
        const { data: insertedData, error } = await supabase
            .from(dbTableName)
            .insert(dbData)
            .select()
            .single();
        
        if (error) {
            console.error(`[DB] Error creating ${table}:`, error);
            throw error;
        }
        
        if (!insertedData) {
            console.error(`[DB] No data returned for ${table}`);
            throw new Error(`Failed to create ${table}: No data returned`);
        }
        
        if (!insertedData.id) {
            console.error(`[DB] Missing ID in returned data for ${table}:`, insertedData);
            throw new Error(`Failed to create ${table}: No ID returned from database`);
        }
        
        // Transform back to interface format
        if (table === 'users') {
            return {
                ...insertedData,
                notificationPreferences: insertedData.notification_preferences ? JSON.parse(insertedData.notification_preferences) : undefined,
                uiPreferences: insertedData.ui_preferences ? JSON.parse(insertedData.ui_preferences) : undefined,
                targets: insertedData.targets ? JSON.parse(insertedData.targets) : undefined,
                pendingReward: insertedData.pending_reward ? JSON.parse(insertedData.pending_reward) : undefined,
                billingInfo: insertedData.billing_info ? JSON.parse(insertedData.billing_info) : undefined,
            } as T;
        } else if (table === 'tasks') {
            return {
                id: insertedData.id, // Ensure ID is included
                ...insertedData,
                assigneeIds: insertedData.assignee_ids || [],
                assigneeId: insertedData.assignee_id,
                creatorId: insertedData.creator_id,
                tags: insertedData.tags || [],
                createdAt: insertedData.created_at,
                dueDate: insertedData.due_date,
                dueTime: insertedData.due_time,
                timeSpent: insertedData.time_spent || 0,
                estimatedTime: insertedData.estimated_time,
                approvalStatus: insertedData.approval_status,
                isTimerRunning: insertedData.is_timer_running || false,
                messages: insertedData.messages ? (typeof insertedData.messages === 'string' ? JSON.parse(insertedData.messages) : insertedData.messages) : [],
                clientId: insertedData.client_id,
                isPrivate: insertedData.is_private,
                audioUrl: insertedData.audio_url,
                snoozeCount: insertedData.snooze_count || 0,
                isFocus: insertedData.is_focus || false,
                completionDetails: insertedData.completion_details ? (typeof insertedData.completion_details === 'string' ? JSON.parse(insertedData.completion_details) : insertedData.completion_details) : undefined,
                department: insertedData.department,
            } as T;
        } else if (table === 'clients') {
            return {
                ...insertedData,
                companyName: insertedData.company_name,
                contactPerson: insertedData.contact_person,
                joinedAt: insertedData.joined_at,
                assetsFolderUrl: insertedData.assets_folder_url,
            } as T;
        } else if (table === 'time_entries') {
            return {
                ...insertedData,
                userId: insertedData.user_id,
                startTime: insertedData.start_time,
                endTime: insertedData.end_time,
                durationMinutes: insertedData.duration_minutes,
                voidReason: insertedData.void_reason,
                voidedBy: insertedData.voided_by,
                voidedAt: insertedData.voided_at,
            } as T;
        } else if (table === 'tenants') {
            return {
                ...insertedData,
                ownerEmail: insertedData.owner_email,
                joinedAt: insertedData.joined_at,
                usersCount: insertedData.users_count,
                allowedEmails: insertedData.allowed_emails || [],
                requireApproval: insertedData.require_approval || false,
            } as T;
        }
        
        return insertedData as T;
    } catch (error) {
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
    }
): Promise<T> {
    await initDatabase();
    assertDbAvailable('updateRecord');
    
    try {
        // Transform updates to database format
        let dbUpdates: any = {};
        
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
                    dbUpdates[dbKey] = (userUpdates as any)[key];
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
                    dbUpdates[dbKey] = (taskUpdates as any)[key];
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
                    dbUpdates[key] = (clientUpdates as any)[key];
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
        
        let updateQuery = supabase
            .from(dbTableName)
            .update(dbUpdates)
            .eq('id', id);

        if (table === 'clients' && options?.organizationId) {
            updateQuery = updateQuery.eq('organization_id', options.organizationId);
        }

        if (table === 'time_entries' && options?.organizationId) {
            updateQuery = updateQuery.eq('organization_id', options.organizationId);
        }

        const { data: updatedData, error } = await updateQuery.select().single();
        
        if (error) {
            console.error(`[DB] Error updating ${table}:`, error);
            throw error;
        }
        
        // Transform back to interface format
        if (table === 'tenants') {
            return {
                ...updatedData,
                ownerEmail: updatedData.owner_email,
                joinedAt: updatedData.joined_at,
                usersCount: updatedData.users_count || 0,
                allowedEmails: updatedData.allowed_emails || [],
                requireApproval: updatedData.require_approval || false,
            } as T;
        }
        
        // Transform back (similar to createRecord)
        return updatedData as T;
    } catch (error) {
        console.error(`[DB] Error in updateRecord for ${table}:`, error);
        throw error;
    }
}

/**
 * Delete a record
 */
export async function deleteRecord(
    table: 'users' | 'tasks' | 'clients' | 'time_entries' | 'tenants',
    id: string
): Promise<void> {
    await initDatabase();
    assertDbAvailable('deleteRecord');
    
    try {
        // Map table names to actual database table names
        const dbTableName = TABLE_NAME_MAP[table] || table;
        
        const { error } = await supabase
            .from(dbTableName)
            .delete()
            .eq('id', id);
        
        if (error) {
            console.error(`[DB] Error deleting ${table}:`, error);
            throw error;
        }
        
        console.log(`[DB] Deleted ${table} record: ${id}`);
    } catch (error) {
        console.error(`[DB] Error in deleteRecord for ${table}:`, error);
        throw error;
    }
}

// ============================================
// ROLES & PERMISSIONS FUNCTIONS
// ============================================

/**
 * Get all permissions from database
 */
export async function getPermissions(): Promise<Array<{ id: PermissionId; label: string; description: string; category: string }>> {
    await initDatabase();
    assertDbAvailable('getPermissions');
    
    try {
        const { data, error } = await supabase
            .from('misrad_permissions')
            .select('*')
            .order('id');
        
        if (error) {
            console.error('[DB] Error fetching permissions:', error);
            throw new Error(error.message || 'Failed to fetch permissions');
        }
        
        return (data || []).map((p: any) => ({
            id: p.id as PermissionId,
            label: p.label,
            description: p.description,
            category: p.category || 'access'
        }));
    } catch (error) {
        console.error('[DB] Error in getPermissions:', error);
        throw error;
    }
}

/**
 * Get all roles from database
 */
export async function getRoles(): Promise<RoleDefinition[]> {
    await initDatabase();
    assertDbAvailable('getRoles');
    
    try {
        const { data, error } = await supabase
            .from('misrad_roles')
            .select('*')
            .order('name');
        
        if (error) {
            console.error('[DB] Error fetching roles:', error);
            throw new Error(error.message || 'Failed to fetch roles');
        }
        
        return (data || []).map((r: any) => ({
            id: r.id, // Add id for reference
            name: r.name,
            permissions: (r.permissions || []) as PermissionId[],
            isSystem: r.is_system || false,
            description: r.description
        })) as any[];
    } catch (error) {
        console.error('[DB] Error in getRoles:', error);
        throw error;
    }
}

/**
 * Get role by name
 */
export async function getRoleByName(name: string): Promise<RoleDefinition | null> {
    await initDatabase();
    assertDbAvailable('getRoleByName');
    
    try {
        const { data, error } = await supabase
            .from('misrad_roles')
            .select('*')
            .eq('name', name)
            .single();
        
        if (error || !data) {
            return null;
        }
        
        return {
            id: data.id,
            name: data.name,
            permissions: (data.permissions || []) as PermissionId[],
            isSystem: data.is_system || false,
            description: data.description
        } as any;
    } catch (error) {
        console.error('[DB] Error in getRoleByName:', error);
        throw error;
    }
}

/**
 * Create a new role
 */
export async function createRole(role: Omit<RoleDefinition, 'id'>): Promise<RoleDefinition> {
    await initDatabase();
    assertDbAvailable('createRole');
    
    try {
        const { data, error } = await supabase
            .from('misrad_roles')
            .insert({
                name: role.name,
                permissions: role.permissions,
                is_system: role.isSystem || false,
                description: (role as any).description || null
            })
            .select()
            .single();
        
        if (error) {
            console.error('[DB] Error creating role:', error);
            throw error;
        }
        
        return {
            id: data.id,
            name: data.name,
            permissions: (data.permissions || []) as PermissionId[],
            isSystem: data.is_system || false,
            description: data.description
        } as any;
    } catch (error) {
        console.error('[DB] Error in createRole:', error);
        throw error;
    }
}

/**
 * Update a role
 */
export async function updateRole(roleId: string, updates: Partial<RoleDefinition>): Promise<RoleDefinition> {
    await initDatabase();
    assertDbAvailable('updateRole');
    
    try {
        const dbUpdates: any = {};
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.permissions !== undefined) dbUpdates.permissions = updates.permissions;
        if (updates.isSystem !== undefined) dbUpdates.is_system = updates.isSystem;
        if ((updates as any).description !== undefined) dbUpdates.description = (updates as any).description;
        
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
        
        return {
            id: data.id,
            name: data.name,
            permissions: (data.permissions || []) as PermissionId[],
            isSystem: data.is_system || false,
            description: data.description
        } as any;
    } catch (error) {
        console.error('[DB] Error in updateRole:', error);
        throw error;
    }
}

/**
 * Delete a role (only if not system role)
 */
export async function deleteRole(roleId: string): Promise<void> {
    await initDatabase();
    assertDbAvailable('deleteRole');
    
    try {
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
        // Use the database function
        const { data, error } = await supabase
            .rpc('get_user_permissions', { user_id_param: userId });
        
        if (error) {
            console.error('[DB] Error getting user permissions:', error);
            throw new Error(error.message || 'Failed to get user permissions');
        }
        
        return (data || []) as PermissionId[];
    } catch (error) {
        console.error('[DB] Error in getUserPermissions:', error);
        throw error;
    }
}

/**
 * Assign role to user
 */
export async function assignRoleToUser(userId: string, roleId: string): Promise<void> {
    await initDatabase();
    assertDbAvailable('assignRoleToUser');
    
    try {
        const { error } = await supabase
            .from('nexus_users')
            .update({ role_id: roleId })
            .eq('id', userId);
        
        if (error) {
            console.error('[DB] Error assigning role to user:', error);
            throw error;
        }
        
        console.log('[DB] Assigned role:', roleId, 'to user:', userId);
    } catch (error) {
        console.error('[DB] Error in assignRoleToUser:', error);
        throw error;
    }
}

/**
 * Set user's manager (hierarchy)
 */
export async function setUserManager(userId: string, managerId: string | null | undefined): Promise<void> {
    await initDatabase();
    assertDbAvailable('setUserManager');
    
    try {
        // Prevent self-management
        if (managerId === userId) {
            throw new Error('User cannot be their own manager');
        }

        // Prevent circular hierarchy (user cannot be manager of their own manager)
        if (managerId) {
            // Check if the proposed manager has the user as their manager (direct or indirect)
            const { data: managerData, error: managerError } = await supabase
                .from('nexus_users')
                .select('manager_id')
                .eq('id', managerId)
                .single();

            if (managerError && managerError.code !== 'PGRST116') { // PGRST116 = no rows returned
                console.error('[DB] Error checking manager:', managerError);
                throw managerError;
            }

            // Direct circular check
            if (managerData?.manager_id === userId) {
                throw new Error('Circular hierarchy detected: Cannot set manager - this would create a loop');
            }

            // Indirect circular check - check if manager's chain leads back to user
            let currentManagerId = managerData?.manager_id;
            const visited = new Set<string>([userId, managerId]);
            
            while (currentManagerId) {
                if (visited.has(currentManagerId)) {
                    throw new Error('Circular hierarchy detected: This manager chain would create a loop');
                }
                visited.add(currentManagerId);
                
                const { data: nextManager, error: nextError } = await supabase
                    .from('nexus_users')
                    .select('manager_id')
                    .eq('id', currentManagerId)
                    .single();
                
                if (nextError && nextError.code !== 'PGRST116') {
                    break; // Stop if error (not found is OK)
                }
                
                currentManagerId = nextManager?.manager_id || null;
            }
        }

        const { error } = await supabase
            .from('nexus_users')
            .update({ manager_id: managerId })
            .eq('id', userId);
        
        if (error) {
            console.error('[DB] Error setting user manager:', error);
            throw error;
        }
        
        console.log('[DB] Set manager:', managerId, 'for user:', userId);
    } catch (error) {
        console.error('[DB] Error in setUserManager:', error);
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
        console.error('[DB] Error in getUsersByManager:', error);
        throw error;
    }
}
