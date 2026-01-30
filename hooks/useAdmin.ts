'use client';

import { useState, useEffect, useRef } from 'react';
import { OrganizationProfile, MonthlyGoals, AnalysisReport, SystemUpdate, FeatureRequest, ModuleId, SystemScreenStatus, UserApprovalRequest, Tenant, RoleDefinition } from '../types';
import { SYSTEM_SCREENS, DEFAULT_ROLE_DEFINITIONS } from '../constants';
import { getWorkspaceOrgSlugFromPathname } from '@/lib/os/nexus-routing';

export const useAdmin = (
    currentUser: any,
    addNotification: (n: any) => void,
    addToast: (m: string, t?: any) => void,
    initialOrganization?: Partial<OrganizationProfile>
) => {
    // Default enabled modules for the demo organization
    const [organization, setOrganization] = useState<OrganizationProfile>({ 
        name: initialOrganization?.name ?? 'Misrad', 
        logo: initialOrganization?.logo ?? '', 
        primaryColor: (initialOrganization as any)?.primaryColor ?? '#000000',
        enabledModules: (initialOrganization as any)?.enabledModules ?? ['crm', 'ai'],
        systemFlags: (initialOrganization as any)?.systemFlags ?? SYSTEM_SCREENS.reduce((acc, screen) => ({ ...acc, [screen.id]: 'active' }), {})
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

    // Load enabled modules from DB (organizations.has_*) via /api/workspaces.
    // This keeps module visibility in sync with the admin panel toggles.
    useEffect(() => {
        const loadEnabledModules = async () => {
            try {
                if (typeof window === 'undefined') return;
                const orgSlug = getWorkspaceOrgSlugFromPathname(window.location.pathname);
                if (!orgSlug) return;

                const res = await fetch('/api/workspaces');
                if (!res.ok) return;

                const data = await res.json().catch(() => null);
                const workspaces = (data?.workspaces || []) as Array<{ slug: string; id: string; entitlements?: Record<string, boolean>; capabilities?: { isTeamManagementEnabled?: boolean } }>;
                const ws = workspaces.find(w => String(w.slug) === String(orgSlug) || String(w.id) === String(orgSlug));
                if (!ws) return;

                const financeEnabled = Boolean(ws.entitlements?.finance);
                const operationsEnabled = Boolean((ws.entitlements as any)?.operations);

                const teamEnabled = Boolean(ws.capabilities?.isTeamManagementEnabled);

                setOrganization(prev => {
                    const base: ModuleId[] = teamEnabled ? ['crm', 'ai', 'team'] : ['crm', 'ai'];
                    const financeNext: ModuleId[] = financeEnabled ? [...base, 'finance'] : base;
                    const next: ModuleId[] = operationsEnabled ? [...financeNext, 'operations'] : financeNext;
                    if (Array.isArray(prev.enabledModules) && prev.enabledModules.join('|') === next.join('|')) {
                        return prev;
                    }
                    return { ...prev, enabledModules: next };
                });
            } catch (e) {
                // ignore
            }
        };

        loadEnabledModules();
    }, []);

    // Load roles from API on mount
    useEffect(() => {
        const loadRoles = async () => {
            setIsLoadingRoles(true);
            try {
                const orgSlug = typeof window !== 'undefined' ? getWorkspaceOrgSlugFromPathname(window.location.pathname) : null;
                const response = await fetch('/api/roles', {
                    headers: orgSlug ? { 'x-org-id': orgSlug } : undefined
                });
                if (response.ok) {
                    const data = await response.json();
                    if (data.roles && Array.isArray(data.roles)) {
                        setRoleDefinitions(data.roles);
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
    }, []);

    // Load system flags from API on mount (all users need this for ScreenGuard)
    useEffect(() => {
        const loadSystemFlags = async () => {
            // All users need system flags to see maintenance/hidden screens
            if (!currentUser?.id) {
                return; // Wait for user to load
            }
            
            try {
                const orgSlug = typeof window !== 'undefined' ? getWorkspaceOrgSlugFromPathname(window.location.pathname) : null;
                const response = await fetch('/api/system/flags', {
                    headers: orgSlug ? { 'x-org-id': orgSlug } : undefined
                });
                if (response.ok) {
                    const data = await response.json();
                    if (data.systemFlags) {
                        setOrganization(prev => ({
                            ...prev,
                            systemFlags: data.systemFlags // Replace completely, not merge
                        }));
                    }
                } else {
                    console.warn('[Admin] Could not load system flags from API, using defaults');
                }
            } catch (error) {
                console.error('[Admin] Error loading system flags:', error);
            }
        };
        
        // Load immediately
        loadSystemFlags();
        
        // Poll periodically to get updates from other users/admins
        const interval = setInterval(loadSystemFlags, 5 * 60 * 1000);
        
        return () => clearInterval(interval);
    }, [currentUser?.id]); // Reload when user changes

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
                    const d = new Date((item as any)?.date);
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
        const filtered = (analysisHistory || []).filter((item: any) => {
            const d = new Date(item?.date);
            return !isNaN(d.getTime()) && d > thirtyDaysAgo;
        });

        fetch('/api/system/ai-history', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'x-org-id': orgSlug },
            body: JSON.stringify({ history: filtered }),
        }).catch(() => null);
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

    const updateSettings = (key: string, value: any) => {
        if (key === 'departments') setDepartments(value);
        if (key === 'roleDefinitions') setRoleDefinitions(value);
        
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
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'שגיאה ביצירת התפקיד');
            }
            
            const data = await response.json();
            setRoleDefinitions(prev => [...prev, data.role]);
            addToast(`תפקיד "${role.name}" נוצר בהצלחה`, 'success');
            return data.role;
        } catch (error: any) {
            addToast(error.message || 'שגיאה ביצירת התפקיד', 'error');
            throw error;
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
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'שגיאה בעדכון התפקיד');
            }
            
            const data = await response.json();
            setRoleDefinitions(prev => prev.map(r => (r as any).id === roleId ? data.role : r));
            addToast('תפקיד עודכן בהצלחה', 'success');
            return data.role;
        } catch (error: any) {
            addToast(error.message || 'שגיאה בעדכון התפקיד', 'error');
            throw error;
        }
    };

    const deleteRole = async (roleName: string) => {
        try {
            // Find role by name to get ID
            const role = roleDefinitions.find(r => r.name === roleName);
            if (!role || !(role as any).id) {
                throw new Error('תפקיד לא נמצא');
            }
            
            const roleId = (role as any).id;
            const orgSlug = typeof window !== 'undefined' ? getWorkspaceOrgSlugFromPathname(window.location.pathname) : null;
            const response = await fetch(`/api/roles/${roleId}`, {
                method: 'DELETE',
                headers: orgSlug ? { 'x-org-id': orgSlug } : undefined
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'שגיאה במחיקת התפקיד');
            }
            
            setRoleDefinitions(prev => prev.filter(r => r.name !== roleName));
            addToast(`תפקיד "${roleName}" נמחק בהצלחה`, 'success');
        } catch (error: any) {
            addToast(error.message || 'שגיאה במחיקת התפקיד', 'error');
            throw error;
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
        try {
            // Update local state immediately for responsive UI
            setOrganization(prev => ({
                ...prev,
                systemFlags: {
                    ...prev.systemFlags,
                    [screenId]: status
                }
            }));
            
            // Save to database via API
            const orgSlug = typeof window !== 'undefined' ? getWorkspaceOrgSlugFromPathname(window.location.pathname) : null;
            const response = await fetch('/api/system/flags', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...(orgSlug ? { 'x-org-id': orgSlug } : {}) },
                body: JSON.stringify({ screenId, status })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'שגיאה בעדכון מצב תחזוקה');
            }

            const result = await response.json();
            
            // Reload system flags from API to ensure consistency
            // This ensures all users see the updated state
            try {
                const orgSlug = typeof window !== 'undefined' ? getWorkspaceOrgSlugFromPathname(window.location.pathname) : null;
                const flagsResponse = await fetch('/api/system/flags', {
                    headers: orgSlug ? { 'x-org-id': orgSlug } : undefined
                });
                if (flagsResponse.ok) {
                    const flagsData = await flagsResponse.json();
                    if (flagsData.systemFlags) {
                        setOrganization(prev => ({
                            ...prev,
                            systemFlags: flagsData.systemFlags
                        }));
                    }
                }
            } catch (reloadError) {
                console.warn('[Admin] Could not reload system flags after update:', reloadError);
            }
            
            // Notify user
            if (status === 'maintenance') {
                addToast(`מסך ${screenId} עבר למצב תחזוקה`, 'warning');
            } else if (status === 'hidden') {
                addToast(`מסך ${screenId} הוסתר`, 'info');
            } else {
                addToast(`מסך ${screenId} הופעל`, 'success');
            }
        } catch (error: any) {
            console.error('[Admin] Error updating system flag:', error);
            addToast(error.message || 'שגיאה בעדכון מצב תחזוקה', 'error');
            
            // Revert local state on error
            setOrganization(prev => ({
                ...prev,
                systemFlags: {
                    ...prev.systemFlags,
                    [screenId]: prev.systemFlags?.[screenId] || 'active'
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
