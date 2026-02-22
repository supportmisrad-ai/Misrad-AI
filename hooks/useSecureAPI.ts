/**
 * Secure API Hook
 * 
 * Client-side hook for calling secure API routes
 * Replaces direct data access with API calls
 */

import { useState, useCallback } from 'react';
import { useData } from '../context/DataContext';
import { Toast, Task, Client, Tenant, RoleDefinition, User } from '../types';
import { getWorkspaceOrgSlugFromPathname } from '@/lib/os/nexus-routing';
import { extractData, extractError } from '@/lib/shared/api-types';
import {
    createNexusTask,
    listNexusTasks,
    listNexusTimeEntries,
    listNexusUsers,
    updateNexusTask,
    updateNexusUser,
} from '@/app/actions/nexus';

function asObject(value: unknown): Record<string, unknown> | null {
    if (value && typeof value === 'object') {
        return value as Record<string, unknown>;
    }
    return null;
}

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    return '';
}

function getApiErrorMessage(payload: unknown, raw: unknown, fallback: string): string {
    const payloadObj = asObject(payload);
    const rawObj = asObject(raw);
    const fromPayload = payloadObj && typeof payloadObj.error === 'string' ? payloadObj.error : '';
    const fromRaw = rawObj && typeof rawObj.error === 'string' ? rawObj.error : '';
    return String(fromPayload || fromRaw || fallback);
}

/**
 * Handle 401 errors by redirecting to login
 */
const handleUnauthorized = (message: string, addToast?: (message: string, type?: Toast['type']) => void) => {
    // Show toast first if available
    if (addToast) {
        addToast('הסשן פג תוקף - מפנה להתחברות מחדש...', 'error');
    }
    
    // Redirect to login after a short delay
    if (typeof window !== 'undefined') {
        setTimeout(() => {
            window.location.href = '/login?reason=session_expired';
        }, addToast ? 1500 : 0);
    }
    throw new Error(message);
};

/**
 * Check if error is a network error (Failed to fetch)
 */
const isNetworkError = (err: unknown): boolean => {
    const obj = asObject(err) ?? {};
    const name = typeof obj.name === 'string' ? obj.name : '';
    const message = typeof obj.message === 'string' ? obj.message : '';
    return name === 'TypeError' && (message.includes('Failed to fetch') || message.includes('NetworkError') || message.includes('network'));
};

export function useSecureAPI() {
    const { addToast, currentUser } = useData();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const getOrgSlugFromBrowser = useCallback(() => {
        if (typeof window === 'undefined') return null;
        const fromPath = getWorkspaceOrgSlugFromPathname(window.location.pathname);
        if (fromPath) return fromPath;

        const userObj = asObject(currentUser) ?? {};

        const fallbackFromUser =
            userObj.organizationId ??
            userObj.tenantId ??
            userObj.organization_id ??
            null;

        return typeof fallbackFromUser === 'string' && fallbackFromUser.length > 0 ? fallbackFromUser : null;
    }, [currentUser]);

    const secureFetch = useCallback(async (input: RequestInfo | URL, init?: RequestInit, orgSlugOverride?: string | null) => {
        const orgSlug = orgSlugOverride ?? getOrgSlugFromBrowser();
        const headers = new Headers(init?.headers || undefined);
        if (orgSlug && !headers.has('x-org-id')) {
            headers.set('x-org-id', encodeURIComponent(orgSlug));
        }
        return fetch(input, { ...init, headers });
    }, [getOrgSlugFromBrowser]);

    /**
     * Fetch users with proper authorization
     */
    const fetchUsers = useCallback(async (options?: {
        userId?: string;
        department?: string;
    }) => {
        setIsLoading(true);
        setError(null);
        
        try {
            const orgSlug = getOrgSlugFromBrowser();
            if (!orgSlug) {
                throw new Error('Missing orgSlug');
            }

            const data = await listNexusUsers({
                orgId: orgSlug,
                userId: options?.userId,
                department: options?.department,
            });
            return data.users ?? [];
            
        } catch (err: unknown) {
            const errorMessage = getErrorMessage(err) || 'שגיאה בטעינת המידע';
            // Silently handle network errors - don't show toasts or throw
            if (isNetworkError(err)) {
                setIsLoading(false);
                return []; // Return empty array for network errors
            }
            setError(errorMessage);
            // Only show toast for non-network errors to avoid spam
            if (!errorMessage.includes('Failed to fetch') && !errorMessage.includes('NetworkError')) {
                addToast(errorMessage, 'error');
            }
            throw err instanceof Error ? err : new Error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [addToast, getOrgSlugFromBrowser]);

    const approveKioskPairing = useCallback(async (params: { code: string; approvedForUserId: string }) => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await secureFetch('/api/kiosk/pairing/approve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: params.code, approvedForUserId: params.approvedForUserId })
            });

            if (!response.ok) {
                if (response.status === 401) {
                    handleUnauthorized('אינך מורשה - נא להתחבר מחדש', addToast);
                    return;
                }
                if (response.status === 403) {
                    throw new Error('אין לך הרשאה לצמד מכשיר');
                }
                const errorData: unknown = await response.json().catch(() => ({}));
                const errorObj = asObject(errorData) ?? {};
                const fallback = 'שגיאה בצימוד מכשיר';
                throw new Error(typeof errorObj.error === 'string' ? errorObj.error : fallback);
            }

            const data: unknown = await response.json().catch(() => ({}));
            return extractData(data);
        } catch (err: unknown) {
            const errorMessage = getErrorMessage(err) || 'שגיאה בצימוד מכשיר';
            if (isNetworkError(err)) {
                setIsLoading(false);
                return null;
            }
            setError(errorMessage);
            addToast(errorMessage, 'error');
            throw err instanceof Error ? err : new Error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [addToast, secureFetch]);

    const createKioskQrPairingToken = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await secureFetch('/api/kiosk/pairing/admin-create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });

            if (!response.ok) {
                if (response.status === 401) {
                    handleUnauthorized('אינך מורשה - נא להתחבר מחדש', addToast);
                    return null;
                }
                if (response.status === 403) {
                    throw new Error('אין לך הרשאה לצמד מכשיר');
                }
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'שגיאה ביצירת טוקן');
            }

            const data: unknown = await response.json().catch(() => ({}));
            const payload = extractData<{ token?: string; expiresAt?: string }>(data);
            const payloadObj = asObject(payload) ?? {};
            const token = typeof payloadObj.token === 'string' ? payloadObj.token : '';
            const expiresAt = typeof payloadObj.expiresAt === 'string' ? payloadObj.expiresAt : '';
            if (!token) {
                throw new Error('שגיאה ביצירת טוקן');
            }
            return { token, expiresAt };
        } catch (err: unknown) {
            const errorMessage = getErrorMessage(err) || 'שגיאה ביצירת טוקן';
            if (isNetworkError(err)) {
                setIsLoading(false);
                return null;
            }
            setError(errorMessage);
            addToast(errorMessage, 'error');
            throw err instanceof Error ? err : new Error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [addToast, secureFetch]);

    /**
     * Analyze with AI (secure)
     */
    const analyzeWithAI = useCallback(async (query: string, rawData?: unknown) => {
        setIsLoading(true);
        setError(null);
        
        try {
            const response = await secureFetch('/api/ai/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ query, rawData }),
            });
            
            if (!response.ok) {
                if (response.status === 401) {
                    handleUnauthorized('אינך מורשה - נא להתחבר מחדש', addToast);
                    return; // This won't execute, but TypeScript needs it
                }
                if (response.status === 403) {
                    throw new Error('אין לך הרשאה להשתמש ב-AI');
                }
                throw new Error('שגיאה בניתוח AI');
            }
            
            const data: unknown = await response.json();
            
            // Validate response structure
            const dataObj = asObject(data);
            if (!dataObj) {
                throw new Error('תגובה לא תקינה מהשרת');
            }
            
            // Check if response has result property (from API) or is the result itself
            const success = Boolean(dataObj.success);
            if (success && 'result' in dataObj) {
                return dataObj.result;
            } else if ('summary' in dataObj || 'score' in dataObj) {
                // Response is already the result object
                return dataObj;
            } else {
                throw new Error('תגובת השרת לא מכילה נתונים תקינים');
            }
            
        } catch (err: unknown) {
            const errorMessage = getErrorMessage(err) || 'שגיאה בניתוח AI';
            // Silently handle network errors
            if (isNetworkError(err)) {
                setIsLoading(false);
                return null; // Return null for network errors
            }
            setError(errorMessage);
            addToast(errorMessage, 'error');
            throw err instanceof Error ? err : new Error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [addToast, secureFetch]);

    /**
     * Fetch tasks with proper authorization
     */
    const fetchTasks = useCallback(async (options?: {
        taskId?: string;
        assigneeId?: string;
        status?: string;
        orgSlug?: string;
    }) => {
        setIsLoading(true);
        setError(null);
        
        try {
            const orgSlug = options?.orgSlug ?? getOrgSlugFromBrowser();
            if (!orgSlug) {
                throw new Error('Missing orgSlug');
            }

            const data = await listNexusTasks({
                orgId: orgSlug,
                taskId: options?.taskId,
                assigneeId: options?.assigneeId,
                status: options?.status,
            });

            const tasks = data.tasks ?? [];
            return options?.taskId ? (tasks[0] || null) : tasks;
            
        } catch (err: unknown) {
            const errorMessage = getErrorMessage(err) || 'שגיאה בטעינת משימות';
            setError(errorMessage);
            addToast(errorMessage, 'error');
            throw err instanceof Error ? err : new Error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [addToast, getOrgSlugFromBrowser]);

    /**
     * Fetch clients with proper authorization
     */
    const fetchClients = useCallback(async (options?: {
        clientId?: string;
        status?: string;
        cursor?: string | null;
        take?: number;
        search?: string;
    }) => {
        setIsLoading(true);
        setError(null);
        
        try {
            const params = new URLSearchParams();
            if (options?.clientId) params.append('id', String(options.clientId));
            if (options?.status) params.append('status', String(options.status));
            if (options?.cursor) params.append('cursor', String(options.cursor));
            if (options?.take != null) params.append('take', String(options.take));
            if (options?.search) params.append('search', String(options.search));
            
            const response = await secureFetch(`/api/clients?${params.toString()}`);
            
            if (!response.ok) {
                if (response.status === 401) {
                    handleUnauthorized('אינך מורשה - נא להתחבר מחדש', addToast);
                    return; // This won't execute, but TypeScript needs it
                }
                if (response.status === 403) {
                    throw new Error('אין לך הרשאה לגשת ללקוחות');
                }
                throw new Error('שגיאה בטעינת הלקוחות');
            }
            
            const raw: unknown = await response.json().catch(() => ({}));
            const payload = extractData(raw);

            if (options?.clientId) {
                return payload;
            }

            const payloadObj = asObject(payload) ?? {};
            const clients = Array.isArray(payloadObj.clients) ? (payloadObj.clients as Client[]) : [];
            const nextCursor = typeof payloadObj.nextCursor === 'string' ? payloadObj.nextCursor : null;
            const hasMore = Boolean(payloadObj.hasMore);
            return { clients, nextCursor, hasMore };
            
        } catch (err: unknown) {
            const errorMessage = getErrorMessage(err) || 'שגיאה בטעינת הלקוחות';
            setError(errorMessage);
            addToast(errorMessage, 'error');
            throw err instanceof Error ? err : new Error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [addToast, secureFetch]);

    /**
     * Update task via secure API
     */
    const updateTask = useCallback(async (taskId: string, updates: Partial<Task>) => {
        setIsLoading(true);
        setError(null);
        
        try {
            const orgSlug = getOrgSlugFromBrowser();
            if (!orgSlug) {
                throw new Error('Missing orgSlug');
            }

            const data = await updateNexusTask({ orgId: orgSlug, taskId, updates });
            addToast('המשימה עודכנה בהצלחה', 'success');
            return data;
            
        } catch (err: unknown) {
            const errorMessage = getErrorMessage(err) || 'שגיאה בעדכון המשימה';
            setError(errorMessage);
            addToast(errorMessage, 'error');
            throw err instanceof Error ? err : new Error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [addToast, getOrgSlugFromBrowser]);

    /**
     * Create task via secure API
     */
    const createTask = useCallback(async (task: Omit<Task, 'id'>) => {
        setIsLoading(true);
        setError(null);
        
        try {
            const orgSlug = getOrgSlugFromBrowser();
            if (!orgSlug) {
                throw new Error('Missing orgSlug');
            }

            const created = await createNexusTask({ orgId: orgSlug, input: task });
            return created;
            
        } catch (err: unknown) {
            const errorMessage = getErrorMessage(err) || 'שגיאה ביצירת משימה';
            setError(errorMessage);
            addToast(errorMessage, 'error');
            throw err instanceof Error ? err : new Error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [addToast, getOrgSlugFromBrowser]);

    /**
     * Create client via secure API
     */
    const createClient = useCallback(async (client: Omit<Client, 'id'>) => {
        setIsLoading(true);
        setError(null);
        
        try {
            const response = await secureFetch('/api/clients', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(client),
            });
            
            if (!response.ok) {
                if (response.status === 401) {
                    handleUnauthorized('אינך מורשה - נא להתחבר מחדש', addToast);
                    return; // This won't execute, but TypeScript needs it
                }
                if (response.status === 403) {
                    throw new Error('אין לך הרשאה ליצור לקוח');
                }
                throw new Error('שגיאה ביצירת הלקוח');
            }
            
            const raw: unknown = await response.json().catch(() => ({}));
            const payload = extractData<{ client?: unknown }>(raw);
            const payloadObj = asObject(payload) ?? {};
            const created = asObject(payloadObj.client) ?? payloadObj;
            addToast('לקוח נוצר בהצלחה', 'success');
            return created;
            
        } catch (err: unknown) {
            const errorMessage = getErrorMessage(err) || 'שגיאה ביצירת לקוח';
            setError(errorMessage);
            addToast(errorMessage, 'error');
            throw err instanceof Error ? err : new Error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [addToast, secureFetch]);

    /**
     * Fetch financial data with strict authorization
     * Only users with 'view_financials' permission can access
     */
    const fetchFinancials = useCallback(async (options?: {
        userId?: string;
        department?: string;
        dateRange?: string;
    }) => {
        setIsLoading(true);
        setError(null);
        
        try {
            const params = new URLSearchParams();
            if (options?.userId) params.append('userId', String(options.userId));
            if (options?.department) params.append('department', String(options.department));
            if (options?.dateRange) params.append('dateRange', String(options.dateRange));
            
            const response = await secureFetch(`/api/financials?${params.toString()}`);
            
            if (!response.ok) {
                if (response.status === 401) {
                    handleUnauthorized('אינך מורשה - נא להתחבר מחדש', addToast);
                    return; // This won't execute, but TypeScript needs it
                }
                if (response.status === 403) {
                    throw new Error('אין לך הרשאה לגשת לנתונים פיננסיים');
                }
                throw new Error('שגיאה בטעינת הנתונים הפיננסיים');
            }
            
            const data: unknown = await response.json();
            const dataObj = asObject(data);
            if (!dataObj) return data;
            return dataObj.financials ?? dataObj;
            
        } catch (err: unknown) {
            const errorMessage = getErrorMessage(err) || 'שגיאה בטעינת הנתונים הפיננסיים';
            setError(errorMessage);
            addToast(errorMessage, 'error');
            throw err instanceof Error ? err : new Error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [addToast, secureFetch]);

    /**
     * Fetch time entries with proper authorization
     */
    const fetchTimeEntries = useCallback(async (options?: {
        userId?: string;
        dateFrom?: string;
        dateTo?: string;
    }) => {
        setIsLoading(true);
        setError(null);
        
        try {
            const orgSlug = getOrgSlugFromBrowser();
            if (!orgSlug) {
                throw new Error('Missing orgSlug');
            }

            const data = await listNexusTimeEntries({
                orgId: orgSlug,
                userId: options?.userId,
                dateFrom: options?.dateFrom,
                dateTo: options?.dateTo,
            });

            return data.timeEntries ?? [];
            
        } catch (err: unknown) {
            const errorMessage = getErrorMessage(err) || 'שגיאה בטעינת דיווחי שעות';
            setError(errorMessage);
            addToast(errorMessage, 'error');
            throw err instanceof Error ? err : new Error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [addToast, getOrgSlugFromBrowser]);

    /**
     * Create a new tenant (business)
     */
    const createTenant = useCallback(async (tenantData: Omit<Tenant, 'id' | 'joinedAt' | 'logo' | 'modules' | 'status' | 'usersCount' | 'mrr'>, mrr: number) => {
        setIsLoading(true);
        setError(null);
        
        try {
            const response = await secureFetch('/api/admin/tenants', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...tenantData,
                    mrr,
                    status: 'Provisioning',
                    modules: ['crm', 'finance', 'content', 'ai', 'team'],
                    logo: ''
                }),
            });
            
            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('אינך מורשה - נא להתחבר מחדש');
                }
                if (response.status === 403) {
                    throw new Error('אין לך הרשאה ליצור tenants');
                }
                const errorData: unknown = await response.json().catch(() => ({}));
                const errorMsg = extractError(errorData);
                throw new Error(errorMsg || 'שגיאה ביצירת tenant');
            }
            
            const raw: unknown = await response.json().catch(() => ({}));
            const payload = extractData<{ tenant?: unknown }>(raw);
            const payloadObj = asObject(payload) ?? {};
            return payloadObj.tenant;
            
        } catch (err: unknown) {
            const errorMessage = getErrorMessage(err) || 'שגיאה ביצירת tenant';
            setError(errorMessage);
            addToast(errorMessage, 'error');
            throw err instanceof Error ? err : new Error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [addToast, secureFetch]);

    /**
     * Fetch roles from API
     */
    const fetchRoles = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        
        try {
            const response = await secureFetch('/api/roles');
            
            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('אינך מורשה - נא להתחבר מחדש');
                }
                // If 403 or other error, return default roles instead of throwing
                if (response.status === 403 || response.status >= 400) {
                    console.warn('[API] Could not fetch roles, using defaults');
                    const { DEFAULT_ROLE_DEFINITIONS } = require('../constants');
                    return DEFAULT_ROLE_DEFINITIONS || [];
                }
                throw new Error('שגיאה בטעינת התפקידים');
            }
            
            const data: unknown = await response.json();
            const dataObj = asObject(data) ?? {};
            return Array.isArray(dataObj.roles) ? (dataObj.roles as RoleDefinition[]) : [];
            
        } catch (err: unknown) {
            // If network error or other issue, return default roles
            const msg = getErrorMessage(err);
            if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
                console.warn('[API] Network error fetching roles, using defaults');
                const { DEFAULT_ROLE_DEFINITIONS } = require('../constants');
                return DEFAULT_ROLE_DEFINITIONS || [];
            }
            // For auth errors, still throw
            if (msg.includes('אינך מורשה')) {
                setError(msg);
                addToast(msg, 'error');
                throw err instanceof Error ? err : new Error(msg || 'אינך מורשה');
            }
            // For other errors, return defaults
            console.warn('[API] Error fetching roles, using defaults:', msg);
            const { DEFAULT_ROLE_DEFINITIONS } = require('../constants');
            return DEFAULT_ROLE_DEFINITIONS || [];
        } finally {
            setIsLoading(false);
        }
    }, [addToast]);

    /**
     * Create a new role
     */
    const createRoleAPI = useCallback(async (role: Omit<RoleDefinition, 'id'>) => {
        setIsLoading(true);
        setError(null);
        
        try {
            const response = await secureFetch('/api/roles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(role)
            });
            
            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('אינך מורשה - נא להתחבר מחדש');
                }
                if (response.status === 403) {
                    throw new Error('אין לך הרשאה ליצור תפקידים');
                }
                if (response.status === 409) {
                    throw new Error('תפקיד בשם זה כבר קיים');
                }
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'שגיאה ביצירת התפקיד');
            }
            
            const data = await response.json();
            return data.role;
            
        } catch (err: unknown) {
            const errorMessage = getErrorMessage(err) || 'שגיאה ביצירת התפקיד';
            setError(errorMessage);
            addToast(errorMessage, 'error');
            throw err instanceof Error ? err : new Error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [addToast]);

    /**
     * Update a role
     */
    const updateRoleAPI = useCallback(async (roleId: string, updates: Partial<RoleDefinition>) => {
        setIsLoading(true);
        setError(null);
        
        try {
            const response = await secureFetch(`/api/roles/${roleId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            
            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('אינך מורשה - נא להתחבר מחדש');
                }
                if (response.status === 403) {
                    throw new Error('אין לך הרשאה לעדכן תפקידים');
                }
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'שגיאה בעדכון התפקיד');
            }
            
            const data = await response.json();
            return data.role;
            
        } catch (err: unknown) {
            const errorMessage = getErrorMessage(err) || 'שגיאה בעדכון התפקיד';
            setError(errorMessage);
            addToast(errorMessage, 'error');
            throw err instanceof Error ? err : new Error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [addToast]);

    /**
     * Delete a role
     */
    const deleteRoleAPI = useCallback(async (roleId: string) => {
        setIsLoading(true);
        setError(null);
        
        try {
            const response = await secureFetch(`/api/roles/${roleId}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('אינך מורשה - נא להתחבר מחדש');
                }
                if (response.status === 403) {
                    throw new Error('אין לך הרשאה למחוק תפקידים');
                }
                if (response.status === 400) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error || 'לא ניתן למחוק תפקיד מערכת');
                }
                throw new Error('שגיאה במחיקת התפקיד');
            }
            
            return true;
            
        } catch (err: unknown) {
            const errorMessage = getErrorMessage(err) || 'שגיאה במחיקת התפקיד';
            setError(errorMessage);
            addToast(errorMessage, 'error');
            throw err instanceof Error ? err : new Error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [addToast]);

    /**
     * Update user's manager (hierarchy)
     */
    const setUserManagerAPI = useCallback(async (userId: string, managerId: string | null | undefined) => {
        setIsLoading(true);
        setError(null);
        
        try {
            const orgSlug = getOrgSlugFromBrowser();
            if (!orgSlug) {
                throw new Error('Missing orgSlug');
            }

            const data = await updateNexusUser({ orgId: orgSlug, userId, updates: { managerId } });
            return data;
            
        } catch (err: unknown) {
            const errorMessage = getErrorMessage(err) || 'שגיאה בעדכון מנהל';
            setError(errorMessage);
            addToast(errorMessage, 'error');
            throw err instanceof Error ? err : new Error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [addToast]);

    /**
     * Update user
     */
    const updateUserAPI = useCallback(async (userId: string, updates: Partial<User>) => {
        setIsLoading(true);
        setError(null);
        
        try {
            const orgSlug = getOrgSlugFromBrowser();
            if (!orgSlug) {
                throw new Error('Missing orgSlug');
            }

            const data = await updateNexusUser({ orgId: orgSlug, userId, updates });
            return data;
            
        } catch (err: unknown) {
            const errorMessage = getErrorMessage(err) || 'שגיאה בעדכון משתמש';
            setError(errorMessage);
            addToast(errorMessage, 'error');
            throw err instanceof Error ? err : new Error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [addToast]);

    return {
        fetchUsers,
        analyzeWithAI,
        approveKioskPairing,
        createKioskQrPairingToken,
        fetchTasks,
        fetchClients,
        fetchFinancials,
        fetchTimeEntries,
        updateTask,
        createTask,
        createClient,
        createTenant,
        fetchRoles,
        createRoleAPI,
        updateRoleAPI,
        deleteRoleAPI,
        setUserManagerAPI,
        updateUserAPI,
        isLoading,
        error
    };
}

