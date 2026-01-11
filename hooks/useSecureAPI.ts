/**
 * Secure API Hook
 * 
 * Client-side hook for calling secure API routes
 * Replaces direct data access with API calls
 */

import { useState, useCallback } from 'react';
import { useData } from '../context/DataContext';
import { Task, Client, Tenant, RoleDefinition, PermissionId, User } from '../types';
import { getWorkspaceOrgIdFromPathname } from '@/lib/os/nexus-routing';

/**
 * Handle 401 errors by redirecting to login
 */
const handleUnauthorized = (message: string, addToast?: (message: string, type?: any) => void) => {
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
const isNetworkError = (err: any): boolean => {
    return err?.name === 'TypeError' && 
           (err?.message?.includes('Failed to fetch') || 
            err?.message?.includes('NetworkError') ||
            err?.message?.includes('network'));
};

export function useSecureAPI() {
    const { addToast, currentUser } = useData();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const getOrgIdFromBrowser = useCallback(() => {
        if (typeof window === 'undefined') return null;
        const fromPath = getWorkspaceOrgIdFromPathname(window.location.pathname);
        if (fromPath) return fromPath;

        const fallbackFromUser =
            (currentUser as any)?.tenantId ??
            (currentUser as any)?.organizationId ??
            (currentUser as any)?.organization_id ??
            null;

        return typeof fallbackFromUser === 'string' && fallbackFromUser.length > 0 ? fallbackFromUser : null;
    }, [currentUser]);

    const secureFetch = useCallback(async (input: RequestInfo | URL, init?: RequestInit, orgIdOverride?: string | null) => {
        const orgId = orgIdOverride ?? getOrgIdFromBrowser();
        const headers = new Headers(init?.headers || undefined);
        if (orgId && !headers.has('x-org-id')) {
            headers.set('x-org-id', orgId);
        }
        return fetch(input, { ...init, headers });
    }, [getOrgIdFromBrowser]);

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
            const params = new URLSearchParams();
            if (options?.userId) params.append('id', String(options.userId));
            if (options?.department) params.append('department', String(options.department));
            
            const response = await secureFetch(`/api/users?${params.toString()}`);
            
            if (!response.ok) {
                if (response.status === 401) {
                    handleUnauthorized('אינך מורשה - נא להתחבר מחדש', addToast);
                    return; // This won't execute, but TypeScript needs it
                }
                if (response.status === 403) {
                    throw new Error('אין לך הרשאה לגשת למידע זה');
                }
                throw new Error('שגיאה בטעינת המידע');
            }
            
            const data = await response.json();
            return data.users || data;
            
        } catch (err: any) {
            const errorMessage = err.message || 'שגיאה בטעינת המידע';
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
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [addToast]);

    /**
     * Analyze with AI (secure)
     */
    const analyzeWithAI = useCallback(async (query: string, rawData?: any) => {
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
            
            const data = await response.json();
            
            // Validate response structure
            if (!data || typeof data !== 'object') {
                throw new Error('תגובה לא תקינה מהשרת');
            }
            
            // Check if response has result property (from API) or is the result itself
            if (data.success && data.result) {
                return data.result;
            } else if (data.summary || data.score !== undefined) {
                // Response is already the result object
                return data;
            } else {
                throw new Error('תגובת השרת לא מכילה נתונים תקינים');
            }
            
        } catch (err: any) {
            const errorMessage = err?.message || 'שגיאה בניתוח AI';
            // Silently handle network errors
            if (isNetworkError(err)) {
                setIsLoading(false);
                return null; // Return null for network errors
            }
            setError(errorMessage);
            addToast(errorMessage, 'error');
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [addToast]);

    /**
     * Fetch tasks with proper authorization
     */
    const fetchTasks = useCallback(async (options?: {
        taskId?: string;
        assigneeId?: string;
        status?: string;
        orgId?: string;
    }) => {
        setIsLoading(true);
        setError(null);
        
        try {
            const params = new URLSearchParams();
            if (options?.taskId) params.append('id', String(options.taskId));
            if (options?.assigneeId) params.append('assigneeId', String(options.assigneeId));
            if (options?.status) params.append('status', String(options.status));
            
            const response = await secureFetch(`/api/tasks?${params.toString()}`, undefined, options?.orgId ?? null);
            
            if (!response.ok) {
                if (response.status === 401) {
                    handleUnauthorized('אינך מורשה - נא להתחבר מחדש', addToast);
                    return; // This won't execute, but TypeScript needs it
                }
                if (response.status === 403) {
                    throw new Error('אין לך הרשאה לגשת למשימות אלה');
                }
                // Try to get error message from response
                let errorMessage = 'שגיאה בטעינת המשימות';
                try {
                    const errorData = await response.json();
                    if (errorData.error) {
                        errorMessage = errorData.error;
                    }
                } catch (e) {
                    // If JSON parsing fails, use status-based messages
                    if (response.status === 404) {
                        errorMessage = 'משימה לא נמצאה';
                    } else if (response.status >= 500) {
                        errorMessage = 'שגיאת שרת - נא לנסות שוב מאוחר יותר';
                    }
                }
                throw new Error(errorMessage);
            }
            
            const data = await response.json();
            return options?.taskId ? data : data.tasks || [];
            
        } catch (err: any) {
            setError(err.message);
            addToast(err.message, 'error');
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [addToast]);

    /**
     * Fetch clients with proper authorization
     */
    const fetchClients = useCallback(async (options?: {
        clientId?: string;
        status?: string;
    }) => {
        setIsLoading(true);
        setError(null);
        
        try {
            const params = new URLSearchParams();
            if (options?.clientId) params.append('id', String(options.clientId));
            if (options?.status) params.append('status', String(options.status));
            
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
            
            const data = await response.json();
            return options?.clientId ? data : data.clients || [];
            
        } catch (err: any) {
            setError(err.message);
            addToast(err.message, 'error');
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [addToast]);

    /**
     * Update task via secure API
     */
    const updateTask = useCallback(async (taskId: string, updates: Partial<Task>) => {
        setIsLoading(true);
        setError(null);
        
        try {
            const response = await secureFetch('/api/tasks', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ taskId, updates }),
            });
            
            if (!response.ok) {
                if (response.status === 401) {
                    handleUnauthorized('אינך מורשה - נא להתחבר מחדש', addToast);
                    return; // This won't execute, but TypeScript needs it
                }
                if (response.status === 403) {
                    throw new Error('אין לך הרשאה לעדכן משימה זו');
                }
                throw new Error('שגיאה בעדכון המשימה');
            }
            
            const data = await response.json();
            addToast('המשימה עודכנה בהצלחה', 'success');
            return data;
            
        } catch (err: any) {
            setError(err.message);
            addToast(err.message, 'error');
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [addToast]);

    /**
     * Create task via secure API
     */
    const createTask = useCallback(async (task: Omit<Task, 'id'>) => {
        setIsLoading(true);
        setError(null);
        
        try {
            const response = await secureFetch('/api/tasks', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(task),
            });
            
            if (!response.ok) {
                // Try to get error message from response
                let errorMessage = 'שגיאה ביצירת המשימה';
                try {
                    const errorData = await response.json();
                    if (errorData.error) {
                        errorMessage = errorData.error;
                    }
                } catch (e) {
                    // If JSON parsing fails, use status-based messages
                }
                
                if (response.status === 401) {
                    handleUnauthorized('אינך מורשה - נא להתחבר מחדש', addToast);
                    return; // This won't execute, but TypeScript needs it
                }
                if (response.status === 403) {
                    throw new Error('אין לך הרשאה ליצור משימות');
                }
                if (response.status === 400) {
                    throw new Error(errorMessage || 'נתונים לא תקינים');
                }
                throw new Error(errorMessage);
            }
            
            const data = await response.json();
            return data.task;
            
        } catch (err: any) {
            setError(err.message);
            addToast(err.message, 'error');
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [addToast]);

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
            
            const data = await response.json();
            addToast('לקוח נוצר בהצלחה', 'success');
            return data;
            
        } catch (err: any) {
            setError(err.message);
            addToast(err.message, 'error');
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [addToast]);

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
            
            const data = await response.json();
            return data.financials || data;
            
        } catch (err: any) {
            setError(err.message);
            addToast(err.message, 'error');
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [addToast]);

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
            const params = new URLSearchParams();
            if (options?.userId) params.append('userId', String(options.userId));
            if (options?.dateFrom) params.append('dateFrom', String(options.dateFrom));
            if (options?.dateTo) params.append('dateTo', String(options.dateTo));
            
            const response = await secureFetch(`/api/time-entries?${params.toString()}`);
            
            if (!response.ok) {
                if (response.status === 401) {
                    handleUnauthorized('אינך מורשה - נא להתחבר מחדש', addToast);
                    return; // This won't execute, but TypeScript needs it
                }
                if (response.status === 403) {
                    throw new Error('אין לך הרשאה לגשת לרשומות זמן אלה');
                }
                throw new Error('שגיאה בטעינת רשומות הזמן');
            }
            
            const data = await response.json();
            return data.timeEntries || [];
            
        } catch (err: any) {
            setError(err.message);
            addToast(err.message, 'error');
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [addToast]);

    /**
     * Create a new tenant (business)
     */
    const createTenant = useCallback(async (tenantData: Omit<Tenant, 'id' | 'joinedAt' | 'logo' | 'modules' | 'status' | 'usersCount' | 'mrr'>, mrr: number) => {
        setIsLoading(true);
        setError(null);
        
        try {
            const response = await secureFetch('/api/tenants', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...tenantData,
                    mrr,
                    status: 'Provisioning',
                    modules: ['crm', 'finance', 'content', 'ai', 'team'],
                    logo: `https://ui-avatars.com/api/?name=${encodeURIComponent(tenantData.name)}&background=6366f1&color=fff`
                }),
            });
            
            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('אינך מורשה - נא להתחבר מחדש');
                }
                if (response.status === 403) {
                    throw new Error('אין לך הרשאה ליצור tenants');
                }
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'שגיאה ביצירת tenant');
            }
            
            const data = await response.json();
            return data.tenant;
            
        } catch (err: any) {
            setError(err.message);
            addToast(err.message, 'error');
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [addToast]);

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
            
            const data = await response.json();
            return data.roles || [];
            
        } catch (err: any) {
            // If network error or other issue, return default roles
            if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
                console.warn('[API] Network error fetching roles, using defaults');
                const { DEFAULT_ROLE_DEFINITIONS } = require('../constants');
                return DEFAULT_ROLE_DEFINITIONS || [];
            }
            // For auth errors, still throw
            if (err.message?.includes('אינך מורשה')) {
                setError(err.message);
                addToast(err.message, 'error');
                throw err;
            }
            // For other errors, return defaults
            console.warn('[API] Error fetching roles, using defaults:', err.message);
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
            
        } catch (err: any) {
            setError(err.message);
            addToast(err.message, 'error');
            throw err;
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
            
        } catch (err: any) {
            setError(err.message);
            addToast(err.message, 'error');
            throw err;
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
            
        } catch (err: any) {
            setError(err.message);
            addToast(err.message, 'error');
            throw err;
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
            const response = await secureFetch(`/api/users/${userId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ managerId })
            });
            
            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('אינך מורשה - נא להתחבר מחדש');
                }
                if (response.status === 403) {
                    throw new Error('אין לך הרשאה לעדכן היררכיה');
                }
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'שגיאה בעדכון המנהל');
            }
            
            const data = await response.json();
            return data.user;
            
        } catch (err: any) {
            setError(err.message);
            addToast(err.message, 'error');
            throw err;
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
            const response = await secureFetch(`/api/users/${userId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            
            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('אינך מורשה - נא להתחבר מחדש');
                }
                if (response.status === 403) {
                    throw new Error('אין לך הרשאה לעדכן משתמש זה');
                }
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'שגיאה בעדכון המשתמש');
            }
            
            const data = await response.json();
            return data.user;
            
        } catch (err: any) {
            setError(err.message);
            addToast(err.message, 'error');
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [addToast]);

    return {
        fetchUsers,
        analyzeWithAI,
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

