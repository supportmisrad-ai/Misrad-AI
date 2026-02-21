'use client';

import { useState, useEffect, useRef } from 'react';
import { AnalysisReport, FeatureRequest, ModuleId, MonthlyGoals, Notification, OrganizationProfile, RoleDefinition, SystemScreenStatus, SystemUpdate, Toast, User, UserApprovalRequest } from '../types';
import { SYSTEM_SCREENS, DEFAULT_ROLE_DEFINITIONS } from '../constants';
import { getWorkspaceOrgSlugFromPathname } from '@/lib/os/nexus-routing';

type ToastKind = Toast['type'];
type NotificationInput = Omit<Notification, 'id' | 'time' | 'read'>;

function asObject(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object') return null;
    if (Array.isArray(value)) return null;
    return value as Record<string, unknown>;
}

function getErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) return error.message;
    const obj = asObject(error);
    const msg = obj?.message;
    return typeof msg === 'string' ? msg : '';
}

function getRoleId(role: RoleDefinition): string | undefined {
    return typeof role.id === 'string' && role.id ? role.id : undefined;
}

export const useAdmin = (
    currentUser: User,
    addNotification: (n: NotificationInput) => void,
    addToast: (m: string, t?: ToastKind) => void,
    initialOrganization?: Partial<OrganizationProfile>
) => {
    // Default enabled modules for the demo organization
    const [organization, setOrganization] = useState<OrganizationProfile>({ 
        name: initialOrganization?.name ?? 'Misrad', 
        logo: initialOrganization?.logo ?? '', 
        primaryColor: initialOrganization?.primaryColor ?? '#000000',
        enabledModules: initialOrganization?.enabledModules ?? ['crm', 'ai'],
        systemFlags: initialOrganization?.systemFlags ?? SYSTEM_SCREENS.reduce((acc, screen) => ({ ...acc, [screen.id]: 'active' }), {}),
        isShabbatProtected: initialOrganization?.isShabbatProtected ?? true,
    });
    const [monthlyGoals, setMonthlyGoals] = useState<MonthlyGoals>({ revenue: 100000, tasksCompletion: 90 });
    const [departments, setDepartments] = useState<string[]>(['הנהלה', 'מכירות', 'תפעול', 'כספים', 'שיווק', 'חיצוני']);
    
    const [analysisHistory, setAnalysisHistory] = useState<AnalysisReport[]>([]);
    const hasLoadedAiHistoryRef = useRef(false);

    const [systemUpdates, setSystemUpdates] = useState<SystemUpdate[]>([]);
    const [featureRequests, setFeatureRequests] = useState<FeatureRequest[]>([]);
    const [trashRequests, setTrashRequests] = useState<FeatureRequest[]>([]);
    
    // NEW: User Approval System
    const [userApprovalRequests, setUserApprovalRequests] = useState<UserApprovalRequest[]>([]);
    
    // NEW: Available versions for tenants
    const availableVersions = ['2.5.0', '2.6.0', '2.6.0-beta', '2.7.0-alpha'];
    
    // Roles & Permissions (loaded from API)
    const [roleDefinitions, setRoleDefinitions] = useState<RoleDefinition[]>(DEFAULT_ROLE_DEFINITIONS);
    const [isLoadingRoles, setIsLoadingRoles] = useState(false);
    
    // UI
    const [showMorningBrief, setShowMorningBrief] = useState(false);
    const [isCommandPaletteOpen, setCommandPaletteOpen] = useState(false);

    const systemFlagsPollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const systemFlagsInFlightRef = useRef(false);
    const systemFlagsFailureCountRef = useRef(0);

    const aiHistoryPersistTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const aiHistoryLastPayloadRef = useRef<string>('');

    // Load enabled modules from DB (organizations.has_*) via /api/workspaces.
    // This keeps module visibility in sync with the admin panel toggles.
    useEffect(() => {
        const loadEnabledModules = async () => {
            try {
                if (typeof window === 'undefined') return;
                if (!currentUser?.id) return;
                const orgSlug = getWorkspaceOrgSlugFromPathname(window.location.pathname);
                if (!orgSlug) return;

                const res = await fetch('/api/workspaces');
                if (!res.ok) return;

                const data = await res.json().catch(() => null);
                const workspaces = (data?.workspaces || []) as Array<{
                    slug: string;
                    id: string;
                    isShabbatProtected?: boolean;
                    entitlements?: Record<string, boolean>;
                    capabilities?: { isTeamManagementEnabled?: boolean };
                }>;
                const ws = workspaces.find(w => String(w.slug) === String(orgSlug) || String(w.id) === String(orgSlug));
                if (!ws) return;

                const financeEnabled = Boolean(ws.entitlements?.finance);
                const operationsEnabled = Boolean(ws.entitlements?.operations);

                const teamEnabled = Boolean(ws.capabilities?.isTeamManagementEnabled);

                setOrganization(prev => {
                    const base: ModuleId[] = teamEnabled ? ['crm', 'ai', 'team'] : ['crm', 'ai'];
                    const financeNext: ModuleId[] = financeEnabled ? [...base, 'finance'] : base;
                    const next: ModuleId[] = operationsEnabled ? [...financeNext, 'operations'] : financeNext;
                    const shabbatProtectedNext = ws.isShabbatProtected !== false;

                    const modulesSame = Array.isArray(prev.enabledModules) && prev.enabledModules.join('|') === next.join('|');
                    const shabbatSame = prev.isShabbatProtected === shabbatProtectedNext;
                    if (modulesSame && shabbatSame) return prev;
                    return { ...prev, enabledModules: next, isShabbatProtected: shabbatProtectedNext };
                });
            } catch (e) {
                // ignore
            }
        };

        loadEnabledModules();
    }, []);

    // Load roles from API on mount
    useEffect(() => {
        if (!currentUser?.id) {
            setIsLoadingRoles(false);
            return;
        }

        const loadRoles = async () => {
            setIsLoadingRoles(true);
            try {
                const orgSlug = typeof window !== 'undefined' ? getWorkspaceOrgSlugFromPathname(window.location.pathname) : null;
                const response = await fetch('/api/roles', {
                    headers: orgSlug ? { 'x-org-id': encodeURIComponent(orgSlug) } : undefined
                });
                if (response.ok) {
                    const data: unknown = await response.json();
                    const dataObj = asObject(data) ?? {};
                    const rolesValue = dataObj.roles;
                    if (Array.isArray(rolesValue)) {
                        setRoleDefinitions(rolesValue as RoleDefinition[]);
                    }
                } else {
                    console.warn('[Admin] Could not load roles from API, using defaults');
                }
            } catch (error) {
                console.error('[Admin] Error loading roles:', error);
            } finally {
                setIsLoadingRoles(false);
            }
        };
        loadRoles();
    }, [currentUser?.id]);

    // Load system flags from API on mount (all users need this for ScreenGuard)
    useEffect(() => {
        let cancelled = false;

        const clearScheduled = () => {
            if (systemFlagsPollTimeoutRef.current) {
                clearTimeout(systemFlagsPollTimeoutRef.current);
                systemFlagsPollTimeoutRef.current = null;
            }
        };

        const scheduleNext = (delayMs: number) => {
            clearScheduled();
            systemFlagsPollTimeoutRef.current = setTimeout(() => {
                void loadSystemFlags();
            }, delayMs);
        };

        const loadSystemFlags = async () => {
            if (cancelled) return;
            if (!currentUser?.id) return;
            if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
                scheduleNext(60_000);
                return;
            }

            if (systemFlagsInFlightRef.current) {
                scheduleNext(30_000);
                return;
            }

            systemFlagsInFlightRef.current = true;
            try {
                const orgSlug = typeof window !== 'undefined' ? getWorkspaceOrgSlugFromPathname(window.location.pathname) : null;
                const response = await fetch('/api/system/flags', {
                    headers: orgSlug ? { 'x-org-id': encodeURIComponent(orgSlug) } : undefined
                });

                if (response.ok) {
                    const data: unknown = await response.json();
                    const dataObj = asObject(data) ?? {};
                    const flagsValue = dataObj.systemFlags;
                    if (flagsValue && typeof flagsValue === 'object') {
                        setOrganization(prev => ({
                            ...prev,
                            systemFlags: flagsValue as Record<string, SystemScreenStatus>
                        }));
                    }
                    systemFlagsFailureCountRef.current = 0;
                    scheduleNext(5 * 60 * 1000);
                } else {
                    systemFlagsFailureCountRef.current += 1;
                    const base = 5 * 60 * 1000;
                    const next = Math.min(30 * 60 * 1000, base * Math.pow(2, systemFlagsFailureCountRef.current));
                    scheduleNext(next);
                }
            } catch {
                systemFlagsFailureCountRef.current += 1;
                const base = 5 * 60 * 1000;
                const next = Math.min(30 * 60 * 1000, base * Math.pow(2, systemFlagsFailureCountRef.current));
                scheduleNext(next);
            } finally {
                systemFlagsInFlightRef.current = false;
            }
        };

        void loadSystemFlags();

        const onVisibility = () => {
            if (document.visibilityState === 'visible') {
                systemFlagsFailureCountRef.current = 0;
                void loadSystemFlags();
            }
        };

        if (typeof document !== 'undefined') {
            document.addEventListener('visibilitychange', onVisibility);
        }

        return () => {
            cancelled = true;
            clearScheduled();
            if (typeof document !== 'undefined') {
                document.removeEventListener('visibilitychange', onVisibility);
            }
        };
    }, [currentUser?.id]);

    // Load AI history from DB (and perform one-time migration from legacy localStorage)
    useEffect(() => {
        let cancelled = false;

        const orgSlug = typeof window !== 'undefined' ? getWorkspaceOrgSlugFromPathname(window.location.pathname) : null;
        if (!orgSlug) return;

        const load = async () => {
            try {
                const res = await fetch('/api/system/ai-history', {
                    headers: { 'x-org-id': orgSlug },
                    cache: 'no-store',
                });
                const data = await res.json().catch(() => null);
                const serverHistory = Array.isArray(data?.history) ? (data.history as AnalysisReport[]) : [];

                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                const filteredServer = serverHistory.filter(item => {
                    const d = new Date(item.date);
                    return !isNaN(d.getTime()) && d > thirtyDaysAgo;
                });

                if (!cancelled) {
                    setAnalysisHistory(filteredServer);
                    hasLoadedAiHistoryRef.current = true;
                }
            } catch {
                if (!cancelled) {
                    hasLoadedAiHistoryRef.current = true;
                }
            }
        };

        load();

        return () => {
            cancelled = true;
        };
    }, [currentUser?.id]);

    // Persist AI history to DB whenever it changes (after initial load)
    useEffect(() => {
        const orgSlug = typeof window !== 'undefined' ? getWorkspaceOrgSlugFromPathname(window.location.pathname) : null;
        if (!orgSlug) return;
        if (!hasLoadedAiHistoryRef.current) return;

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const filtered = (analysisHistory || []).filter((item) => {
            const d = new Date(item.date);
            return !isNaN(d.getTime()) && d > thirtyDaysAgo;
        });

        const payload = JSON.stringify({ history: filtered });
        if (payload === aiHistoryLastPayloadRef.current) return;

        if (aiHistoryPersistTimeoutRef.current) {
            clearTimeout(aiHistoryPersistTimeoutRef.current);
            aiHistoryPersistTimeoutRef.current = null;
        }

        aiHistoryPersistTimeoutRef.current = setTimeout(() => {
            aiHistoryLastPayloadRef.current = payload;
            fetch('/api/system/ai-history', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'x-org-id': orgSlug },
                body: payload,
            }).catch(() => null);
        }, 1500);

        return () => {
            if (aiHistoryPersistTimeoutRef.current) {
                clearTimeout(aiHistoryPersistTimeoutRef.current);
                aiHistoryPersistTimeoutRef.current = null;
            }
        };
    }, [analysisHistory]);

    const updateOrganization = (updates: Partial<OrganizationProfile>) => {
        setOrganization(prev => ({ ...prev, ...updates }));
    };
    
    const updateMonthlyGoals = (goals: MonthlyGoals) => {
        setMonthlyGoals(goals);
        
        addNotification({
            recipientId: 'all',
            type: 'system',
            text: `🎯 יעדים חודשיים עודכנו! יעד הכנסות: ${goals.revenue.toLocaleString()}₪`,
            actorName: currentUser.name,
            actorAvatar: currentUser.avatar
        });
        
        addToast('יעדים חודשיים עודכנו ופורסמו לצוות', 'success');
    };

    const updateSettings = (key: string, value: unknown) => {
        if (key === 'departments') setDepartments(value as string[]);
        if (key === 'roleDefinitions') setRoleDefinitions(value as RoleDefinition[]);
        
        addNotification({
            recipientId: 'all',
            type: 'alert',
            text: `הגדרות מערכת עודכנו: ${key}`,
            actorName: currentUser.name
        });
    };

    // Role management functions (now using API)
    const createRole = async (role: Omit<RoleDefinition, 'id'>) => {
        try {
            const orgSlug = typeof window !== 'undefined' ? getWorkspaceOrgSlugFromPathname(window.location.pathname) : null;
            const response = await fetch('/api/roles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...(orgSlug ? { 'x-org-id': orgSlug } : {}) },
                body: JSON.stringify(role)
            });
            
            if (!response.ok) {
                const errorData: unknown = await response.json().catch(() => ({}));
                const errorObj = asObject(errorData) ?? {};
                throw new Error(typeof errorObj.error === 'string' ? errorObj.error : 'שגיאה ביצירת התפקיד');
            }
            
            const data: unknown = await response.json();
            const dataObj = asObject(data) ?? {};
            const roleValue = dataObj.role;
            if (roleValue) {
                setRoleDefinitions(prev => [...prev, roleValue as RoleDefinition]);
            }
            addToast(`תפקיד "${role.name}" נוצר בהצלחה`, 'success');
            return roleValue as RoleDefinition;
        } catch (error: unknown) {
            addToast(getErrorMessage(error) || 'שגיאה ביצירת התפקיד', 'error');
            throw error instanceof Error ? error : new Error(getErrorMessage(error) || 'שגיאה ביצירת התפקיד');
        }
    };

    const updateRole = async (roleId: string, updates: Partial<RoleDefinition>) => {
        try {
            const orgSlug = typeof window !== 'undefined' ? getWorkspaceOrgSlugFromPathname(window.location.pathname) : null;
            const response = await fetch(`/api/roles/${roleId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...(orgSlug ? { 'x-org-id': orgSlug } : {}) },
                body: JSON.stringify(updates)
            });
            
            if (!response.ok) {
                const errorData: unknown = await response.json().catch(() => ({}));
                const errorObj = asObject(errorData) ?? {};
                throw new Error(typeof errorObj.error === 'string' ? errorObj.error : 'שגיאה בעדכון התפקיד');
            }
            
            const data: unknown = await response.json();
            const dataObj = asObject(data) ?? {};
            const roleValue = dataObj.role;
            if (roleValue) {
                setRoleDefinitions(prev => prev.map(r => getRoleId(r) === roleId ? (roleValue as RoleDefinition) : r));
            }
            addToast('תפקיד עודכן בהצלחה', 'success');
            return roleValue as RoleDefinition;
        } catch (error: unknown) {
            addToast(getErrorMessage(error) || 'שגיאה בעדכון התפקיד', 'error');
            throw error instanceof Error ? error : new Error(getErrorMessage(error) || 'שגיאה בעדכון התפקיד');
        }
    };

    const deleteRole = async (roleName: string) => {
        try {
            // Find role by name to get ID
            const role = roleDefinitions.find(r => r.name === roleName);
            const roleId = role ? getRoleId(role) : undefined;
            if (!roleId) {
                throw new Error('תפקיד לא נמצא');
            }

            const orgSlug = typeof window !== 'undefined' ? getWorkspaceOrgSlugFromPathname(window.location.pathname) : null;
            const response = await fetch(`/api/roles/${roleId}`, {
                method: 'DELETE',
                headers: orgSlug ? { 'x-org-id': orgSlug } : undefined
            });
            
            if (!response.ok) {
                const errorData: unknown = await response.json().catch(() => ({}));
                const errorObj = asObject(errorData) ?? {};
                throw new Error(typeof errorObj.error === 'string' ? errorObj.error : 'שגיאה במחיקת התפקיד');
            }
            
            setRoleDefinitions(prev => prev.filter(r => r.name !== roleName));
            addToast(`תפקיד "${roleName}" נמחק בהצלחה`, 'success');
        } catch (error: unknown) {
            addToast(getErrorMessage(error) || 'שגיאה במחיקת התפקיד', 'error');
            throw error instanceof Error ? error : new Error(getErrorMessage(error) || 'שגיאה במחיקת התפקיד');
        }
    };

    const saveAnalysis = (report: AnalysisReport) => {
        setAnalysisHistory(prev => [report, ...prev]);
    };

    const deleteAnalysis = (id: string) => {
        setAnalysisHistory(prev => prev.filter(item => item.id !== id));
        addToast('הפריט נמחק מההיסטוריה', 'info');
    };

    const addFeatureRequest = (request: FeatureRequest) => {
        setFeatureRequests(prev => [request, ...prev]);
        addToast('בקשה הוגשה בהצלחה', 'success');
    };

    const deleteFeatureRequest = (id: string) => {
        const req = featureRequests.find(r => r.id === id);
        if (req) {
            setTrashRequests(prev => [req, ...prev]);
            setFeatureRequests(prev => prev.filter(r => r.id !== id));
            addToast('בקשה נמחקה (הועברה לארכיון)', 'info');
        }
    };

    const restoreFeatureRequest = (id: string) => {
        const req = trashRequests.find(r => r.id === id);
        if (req) {
            setFeatureRequests(prev => [req, ...prev]);
            setTrashRequests(prev => prev.filter(r => r.id !== id));
            addToast('בקשה שוחזרה', 'success');
        }
    };

    const permanentlyDeleteFeatureRequest = (id: string) => {
        setTrashRequests(prev => prev.filter(r => r.id !== id));
        addToast('בקשה נמחקה לצמיתות', 'warning');
    };

    const voteForFeature = (requestId: string) => {
        setFeatureRequests(prev => prev.map(req => {
            if (req.id === requestId) {
                const hasVoted = req.votes.includes(currentUser.id);
                return {
                    ...req,
                    votes: hasVoted ? req.votes.filter(v => v !== currentUser.id) : [...req.votes, currentUser.id]
                };
            }
            return req;
        }));
    };

    const publishSystemUpdate = (update: SystemUpdate) => {
        setSystemUpdates(prev => [update, ...prev]);
        addNotification({
            recipientId: 'all',
            type: 'system',
            text: `עדכון מערכת חדש: ${update.version}`,
            actorName: 'System'
        });
    };

    const deleteSystemUpdate = (id: string) => {
        setSystemUpdates(prev => prev.filter(u => u.id !== id));
        addToast('עדכון מערכת נמחק', 'info');
    };

    const updateSystemUpdate = (id: string, updates: Partial<SystemUpdate>) => {
        setSystemUpdates(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
        addToast('עדכון מערכת נערך בהצלחה', 'success');
    };

    // Helper to simulate "Signing in" as a specific tenant for testing the feature flags
    const switchToTenantConfig = (modules: ModuleId[]) => {
        setOrganization(prev => ({ ...prev, enabledModules: modules }));
    };

    const updateSystemFlag = async (screenId: string, status: SystemScreenStatus) => {
        let prevStatus: SystemScreenStatus = organization.systemFlags?.[screenId] || 'active';
        try {
            // Update local state immediately for responsive UI
            setOrganization(prev => ({
                ...prev,
                systemFlags: {
                    ...prev.systemFlags,
                    [screenId]: status
                }
            }));
            
            // Notify user immediately (in sync with optimistic update)
            if (status === 'maintenance') {
                addToast(`מסך ${screenId} עבר למצב תחזוקה`, 'warning');
            } else if (status === 'hidden') {
                addToast(`מסך ${screenId} הוסתר`, 'info');
            } else {
                addToast(`מסך ${screenId} הופעל`, 'success');
            }
            
            // Save to database via API
            const orgSlug = typeof window !== 'undefined' ? getWorkspaceOrgSlugFromPathname(window.location.pathname) : null;
            const response = await fetch('/api/system/flags', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...(orgSlug ? { 'x-org-id': orgSlug } : {}) },
                body: JSON.stringify({ screenId, status })
            });

            if (!response.ok) {
                const errorData: unknown = await response.json().catch(() => ({}));
                const errorObj = asObject(errorData) ?? {};
                throw new Error(typeof errorObj.error === 'string' ? errorObj.error : 'שגיאה בעדכון מצב תחזוקה');
            }

            const result: unknown = await response.json().catch(() => null);
            const resultObj = asObject(result) ?? {};
            const nextFlags = resultObj.systemFlags;
            if (nextFlags && typeof nextFlags === 'object') {
                setOrganization(prev => ({
                    ...prev,
                    systemFlags: nextFlags as Record<string, SystemScreenStatus>
                }));
            }
        } catch (error: unknown) {
            console.error('[Admin] Error updating system flag:', error);
            addToast(getErrorMessage(error) || 'שגיאה בעדכון מצב תחזוקה', 'error');
            
            // Revert local state on error
            setOrganization(prev => ({
                ...prev,
                systemFlags: {
                    ...prev.systemFlags,
                    [screenId]: prevStatus
                }
            }));
        }
    };

    // NEW: User Approval Functions
    const approveUserRequest = (id: string, approvedBy: string) => {
        setUserApprovalRequests(prev => prev.map(req => 
            req.id === id 
                ? { ...req, status: 'approved', approvedBy, approvedAt: new Date().toISOString() }
                : req
        ));
        addToast('משתמש אושר בהצלחה', 'success');
    };

    const rejectUserRequest = (id: string, reason: string, rejectedBy: string) => {
        setUserApprovalRequests(prev => prev.map(req => 
            req.id === id 
                ? { ...req, status: 'rejected', approvedBy: rejectedBy, approvedAt: new Date().toISOString(), rejectionReason: reason }
                : req
        ));
        addToast('בקשת המשתמש נדחתה', 'info');
    };

    // NOTE: Tenant management functions (addAllowedEmail, removeAllowedEmail, updateTenantVersion) 
    // are now handled in useCRM and will be passed through DataContext

    return {
        organization, monthlyGoals, departments, analysisHistory, systemUpdates, featureRequests, trashRequests,
        showMorningBrief, isCommandPaletteOpen,
        updateOrganization, updateMonthlyGoals, updateSettings, saveAnalysis, deleteAnalysis,
        addFeatureRequest, deleteFeatureRequest, restoreFeatureRequest, permanentlyDeleteFeatureRequest, voteForFeature,
        publishSystemUpdate, deleteSystemUpdate, updateSystemUpdate,
        setShowMorningBrief, setCommandPaletteOpen, setDepartments,
        switchToTenantConfig, updateSystemFlag,
        // NEW: User Approval System
        userApprovalRequests, approveUserRequest, rejectUserRequest,
        // NEW: Version Management
        availableVersions,
        // NEW: Roles & Permissions
        roleDefinitions, isLoadingRoles, createRole, updateRole, deleteRole
        // NOTE: addAllowedEmail, removeAllowedEmail, updateTenantVersion are in useCRM
    };
};
