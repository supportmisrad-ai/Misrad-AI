'use client';

import { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { User, TimeEntry, RoleDefinition, PermissionId, ChangeRequest } from '../types';
import { DEFAULT_ROLE_DEFINITIONS } from '../constants';
import { getWorkspaceOrgIdFromPathname } from '@/lib/os/nexus-routing';

const isNetworkError = (err: any): boolean => {
    return err?.name === 'TypeError' &&
        (String(err?.message || '').includes('Failed to fetch') ||
            String(err?.message || '').includes('NetworkError') ||
            String(err?.message || '').toLowerCase().includes('network'));
};

export const useAuth = (
    addToast: (msg: string, type?: any) => void,
    initialCurrentUser?: User
) => {

    const { user: clerkUser, isLoaded: isClerkLoaded } = useUser();
    const [users, setUsers] = useState<User[]>([]);
    const [roleDefinitions, setRoleDefinitions] = useState<RoleDefinition[]>(DEFAULT_ROLE_DEFINITIONS);
    // Initialize with Clerk user data if available (to avoid showing "עובד" initially)
    const getInitialUser = (): User => {
        if (initialCurrentUser) {
            return initialCurrentUser;
        }
        // If Clerk user is already loaded, use its metadata
        if (clerkUser?.publicMetadata) {
            return {
                id: '',
                name: clerkUser.firstName && clerkUser.lastName
                    ? `${clerkUser.firstName} ${clerkUser.lastName}`.trim()
                    : clerkUser.firstName || clerkUser.lastName || '',
                email: clerkUser.primaryEmailAddress?.emailAddress || '',
                role: (clerkUser.publicMetadata?.role as string) || 'עובד',
                avatar: clerkUser.imageUrl || '',
                online: false,
                capacity: 0,
                isSuperAdmin: (clerkUser.publicMetadata?.isSuperAdmin as boolean) || false,
                isTenantAdmin: false, // Will be updated when API call completes
                tenantId: null, // Will be updated when API call completes
                billingInfo: undefined,
                notificationPreferences: {
                    emailNewTask: true,
                    browserPush: true,
                    morningBrief: true,
                    soundEffects: false,
                    marketing: true
                }
            };
        }
        // Default fallback
        return {
            id: '',
            name: '',
            email: '',
            role: 'עובד',
            avatar: '',
            online: false,
            capacity: 0,
            isTenantAdmin: false,
            tenantId: null,
            billingInfo: undefined,
            notificationPreferences: {
                emailNewTask: true,
                browserPush: true,
                morningBrief: true,
                soundEffects: false,
                marketing: true
            }
        };
    };
    
    const [currentUser, setCurrentUser] = useState<User>(getInitialUser());
    const [isAuthenticated, setIsAuthenticated] = useState(Boolean(initialCurrentUser?.id));
    const [isLoadingCurrentUser, setIsLoadingCurrentUser] = useState(false);
    const loadCurrentUserInFlightRef = useRef(false);
    const hasLoggedNetworkErrorRef = useRef(false);

    const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
    const [trashUsers, setTrashUsers] = useState<User[]>([]);
    const [trashTimeEntries, setTrashTimeEntries] = useState<TimeEntry[]>([]);
    const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);

    const activeShift = timeEntries.find(t => t.userId === currentUser.id && !t.endTime) || null;

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const orgSlug = getWorkspaceOrgIdFromPathname(window.location.pathname);
        if (!orgSlug) return;

        const key = `NEXUS_ACTIVE_SHIFT_V1:${orgSlug}`;
        try {
            if (activeShift?.startTime) {
                localStorage.setItem(
                    key,
                    JSON.stringify({ entryId: activeShift.id, startTime: activeShift.startTime, userId: currentUser.id })
                );
            } else {
                localStorage.removeItem(key);
            }
        } catch {
            // ignore
        }
    }, [activeShift?.startTime, currentUser.id]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (currentUser?.tenantId) {
            localStorage.setItem('currentTenantId', String(currentUser.tenantId));
        }
    }, [currentUser?.tenantId]);

    // Update user immediately when Clerk loads (to show correct role before API call)
    useEffect(() => {
        if (isClerkLoaded && clerkUser?.publicMetadata) {
            const roleFromClerk = (clerkUser.publicMetadata?.role as string) || 'עובד';
            const isSuperAdminFromClerk = (clerkUser.publicMetadata?.isSuperAdmin as boolean) || false;
            const nameFromClerk = clerkUser.firstName && clerkUser.lastName
                ? `${clerkUser.firstName} ${clerkUser.lastName}`.trim()
                : clerkUser.firstName || clerkUser.lastName || '';
            
            // Update immediately if role is different (to avoid showing "עובד" first)
            setCurrentUser(prev => {
                if (prev.role === 'עובד' && roleFromClerk !== 'עובד') {
                    return {
                        ...prev,
                        name: nameFromClerk || prev.name,
                        email: clerkUser.primaryEmailAddress?.emailAddress || prev.email,
                        role: roleFromClerk,
                        avatar: clerkUser.imageUrl || prev.avatar,
                        isSuperAdmin: isSuperAdminFromClerk,
                        isTenantAdmin: prev.isTenantAdmin || false, // Preserve existing value until API call
                        tenantId: prev.tenantId || null // Preserve existing value until API call
                    };
                }
                return prev;
            });
        }
    }, [isClerkLoaded, clerkUser?.publicMetadata, clerkUser?.id]);

    // Load current user from API when Clerk user is loaded
    useEffect(() => {
        const loadCurrentUser = async () => {
            if (!isClerkLoaded) return;

            if (initialCurrentUser?.id) {
                setIsLoadingCurrentUser(false);
                setIsAuthenticated(true);
                return;
            }
            
            if (!clerkUser) {
                // Not signed in - reset to default
                setIsAuthenticated(false);
                setIsLoadingCurrentUser(false);
                return;
            }

            // Prevent multiple simultaneous loads
            if (loadCurrentUserInFlightRef.current) return;
            
            // If user is already loaded and matches current Clerk user, skip
            if (currentUser.id && isAuthenticated) {
                return; // Already loaded (DB UUID)
            }

            try {
                loadCurrentUserInFlightRef.current = true;
                setIsLoadingCurrentUser(true);
                
                let response: Response;
                let data: any;
                
                try {
                    const orgId =
                        typeof window !== 'undefined'
                            ? (getWorkspaceOrgIdFromPathname(window.location.pathname) || localStorage.getItem('currentTenantId'))
                            : null;
                    response = await fetch('/api/users/me', {
                        headers: orgId ? { 'x-org-id': orgId } : undefined
                    });
                    
                    // Check if response is ok before parsing JSON
                    if (!response.ok) {
                        // If 401 or 500, don't crash - just use Clerk user
                        if (response.status === 401 || response.status === 500) {
                            console.warn('[Auth] API returned error, using Clerk user directly');
                            setIsLoadingCurrentUser(false);
                            setIsAuthenticated(true); // Still authenticated via Clerk
                            return;
                        }
                        throw new Error(`API returned ${response.status}`);
                    }
                    
                    data = await response.json();
                } catch (fetchError: any) {
                    // Network error or JSON parse error
                    if (!isNetworkError(fetchError)) {
                        console.warn('[Auth] Failed to fetch user from API:', fetchError.message);
                    } else if (!hasLoggedNetworkErrorRef.current) {
                        // Avoid console spam on unstable networks
                        console.warn('[Auth] Network error fetching user from API (silencing repeats)');
                        hasLoggedNetworkErrorRef.current = true;
                    }
                    // Use Clerk user as fallback
                    if (clerkUser) {
                        const clerkUserAsDbUser: User = {
                            id: '',
                            name: clerkUser.firstName && clerkUser.lastName
                                ? `${clerkUser.firstName} ${clerkUser.lastName}`.trim()
                                : clerkUser.firstName || clerkUser.lastName || 'User',
                            role: (clerkUser.publicMetadata?.role as string) || 'עובד',
                            department: undefined,
                            avatar: clerkUser.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(clerkUser.primaryEmailAddress?.emailAddress || 'User')}&background=6366f1&color=fff`,
                            online: true,
                            capacity: 0,
                            email: clerkUser.primaryEmailAddress?.emailAddress || '',
                            phone: undefined,
                            location: undefined,
                            bio: undefined,
                            paymentType: undefined,
                            hourlyRate: undefined,
                            monthlySalary: undefined,
                            commissionPct: undefined,
                            bonusPerTask: undefined,
                            accumulatedBonus: 0,
                            streakDays: 0,
                            weeklyScore: undefined,
                            pendingReward: undefined,
                            targets: undefined,
                            notificationPreferences: {
                                emailNewTask: true,
                                browserPush: true,
                                morningBrief: true,
                                soundEffects: false,
                                marketing: true
                            },
                            twoFactorEnabled: false,
                            isSuperAdmin: (clerkUser.publicMetadata?.isSuperAdmin as boolean) || false,
                            isTenantAdmin: false, // Will be updated when API call completes
                            tenantId: null, // Will be updated when API call completes
                            billingInfo: undefined
                        };
                        setCurrentUser(clerkUserAsDbUser);
                        setIsAuthenticated(true);
                    }
                    setIsLoadingCurrentUser(false);
                    return;
                }
                
                if (data.user) {
                    // Found matching user in database
                    const userWithDefaults = {
                        ...data.user,
                        isSuperAdmin: Boolean(
                            (data.user as any)?.isSuperAdmin ??
                            (clerkUser?.publicMetadata?.isSuperAdmin as boolean) ??
                            ((clerkUser as any)?.unsafeMetadata as any)?.isSuperAdmin ??
                            currentUser?.isSuperAdmin
                        ),
                        isTenantAdmin: data.isTenantAdmin || false,
                        tenantId: data.tenant?.id || null,
                        billingInfo: data.user.billingInfo || undefined,
                        notificationPreferences: data.user.notificationPreferences || {
                            emailNewTask: true,
                            browserPush: true,
                            morningBrief: true,
                            soundEffects: false,
                            marketing: true
                        }
                    };
                    setCurrentUser(userWithDefaults);
                    setIsAuthenticated(true);
                    
                    // Update user in users list
                    setUsers(prev => {
                        const existingIndex = prev.findIndex(u => u.id === data.user.id);
                        if (existingIndex >= 0) {
                            return prev.map((u, i) => i === existingIndex ? { ...userWithDefaults, online: true } : u);
                        } else {
                            return [...prev, { ...userWithDefaults, online: true }];
                        }
                    });
                } else {
                    setIsAuthenticated(false);
                }
            } catch (error: any) {
                // Avoid spamming console on transient network errors
                if (!isNetworkError(error)) {
                    console.error('[Auth] Failed to load current user:', error);
                }
                // Fallback to default user in development
                if (process.env.NODE_ENV === 'development') {
                    console.warn('[Auth] Using default user in development mode');
                    setIsAuthenticated(true);
                } else {
                    setIsAuthenticated(false);
                }
            } finally {
                loadCurrentUserInFlightRef.current = false;
                setIsLoadingCurrentUser(false);
            }
        };

        loadCurrentUser();
    }, [clerkUser?.id, isClerkLoaded]);

    // Load users list from DB so assignee pickers / avatars can resolve UUID-based users
    useEffect(() => {
        const loadUsers = async () => {
            if (!isClerkLoaded) return;
            if (typeof window === 'undefined') return;
            const orgId = getWorkspaceOrgIdFromPathname(window.location.pathname) || localStorage.getItem('currentTenantId');
            if (!orgId) return;

            try {
                const res = await fetch('/api/users', {
                    headers: { 'x-org-id': orgId }
                });
                if (!res.ok) return;
                const data = await res.json();
                if (Array.isArray(data?.users)) {
                    setUsers(data.users);
                }
            } catch {
                // non-blocking
            }
        };

        loadUsers();
    }, [isClerkLoaded, clerkUser?.id]);

    const login = (userId: string) => {
        const user = users.find(u => u.id === userId);
        if (user) {
            const userWithBilling = {
                ...user,
                billingInfo: user.billingInfo || undefined,
                notificationPreferences: user.notificationPreferences || {
                    emailNewTask: true,
                    browserPush: true,
                    morningBrief: true,
                    soundEffects: false,
                    marketing: true
                }
            };
            setCurrentUser(userWithBilling);
            setIsAuthenticated(true);
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, online: true } : u));
            addToast(`ברוך הבא, ${user.name}`, 'success');
        }
    };

    const logout = () => {
        setUsers(prev => prev.map(u => u.id === currentUser.id ? { ...u, online: false } : u));
        setIsAuthenticated(false);
    };

    const switchUser = (userId: string) => {
        const user = users.find(u => u.id === userId);
        if (user) {
            const userWithBilling = {
                ...user,
                billingInfo: user.billingInfo || undefined,
                notificationPreferences: user.notificationPreferences || {
                    emailNewTask: true,
                    browserPush: true,
                    morningBrief: true,
                    soundEffects: false,
                    marketing: true
                }
            };
            setCurrentUser(userWithBilling);
            addToast(`הוחלף משתמש ל-${user.name}`, 'info');
        }
    };

    const hasPermission = (permission: PermissionId): boolean => {
        // Super admins have all permissions
        if (currentUser.isSuperAdmin === true) {
            return true;
        }
        
        // Special case: CEO (מנכ״ל) has all permissions - handle both Unicode variants
        const ceoRoles = ['מנכ״ל', 'מנכ"ל', 'מנכל'];
        if (ceoRoles.includes(currentUser.role)) {
            return true;
        }
        
        // Check role permissions - normalize role name for comparison
        // Normalize both role names to handle Unicode quote variations (" vs ״)
        const normalizedRole = String((currentUser as any)?.role ?? '').replace(/["״]/g, '״');
        const role = roleDefinitions.find(r => {
            const normalizedDefRole = String((r as any)?.name ?? '').replace(/["״]/g, '״');
            return normalizedDefRole === normalizedRole; // Only check normalized comparison
        });
        
        if (role && role.permissions) {
            return role.permissions.includes(permission);
        }
        
        return false;
    };

    const addUser = (user: User) => {
        setUsers(prev => [...prev, user]);
        addToast('משתמש נוסף למערכת', 'success');
    };

    const updateUser = (id: string, updates: Partial<User>) => {
        setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
        if (id === currentUser.id) {
            setCurrentUser(prev => ({ ...prev, ...updates }));
        }
        if (Object.keys(updates).length > 0) {
             addToast('פרטי המשתמש עודכנו', 'success');
        }
    };

    const removeUser = (id: string) => {
        const user = users.find(u => u.id === id);
        if (user) {
            setTrashUsers(prev => [user, ...prev]);
            setUsers(prev => prev.filter(u => u.id !== id));
            addToast('משתמש הועבר לארכיון (סל המיחזור)', 'info');
        }
    };

    const restoreUser = (id: string) => {
        const user = trashUsers.find(u => u.id === id);
        if (user) {
            setUsers(prev => [...prev, user]);
            setTrashUsers(prev => prev.filter(u => u.id !== id));
            addToast('משתמש שוחזר בהצלחה', 'success');
        }
    };

    const permanentlyDeleteUser = (id: string) => {
        setTrashUsers(prev => prev.filter(u => u.id !== id));
        addToast('משתמש נמחק לצמיתות', 'warning');
    };

    const clockIn = () => {
        const newEntry: TimeEntry = {
            id: `TE-${Date.now()}`,
            userId: currentUser.id,
            startTime: new Date().toISOString(),
            date: new Date().toISOString().split('T')[0]
        };
        setTimeEntries(prev => [...prev, newEntry]);
        addToast('נכנסת למשמרת. עבודה נעימה!', 'success');
    };

    const clockOut = () => {
        if (activeShift) {
            const endTime = new Date().toISOString();
            const duration = (new Date(endTime).getTime() - new Date(activeShift.startTime).getTime()) / 60000;
            
            setTimeEntries(prev => prev.map(te => 
                te.id === activeShift.id 
                ? { ...te, endTime, durationMinutes: Math.round(duration) } 
                : te
            ));
            addToast('יצאת ממשמרת. תודה!', 'info');
        }
    };

    const addManualTimeEntry = (entry: TimeEntry) => {
        // Calculate duration if end time exists
        let durationMinutes = 0;
        if (entry.endTime) {
            const start = new Date(entry.startTime).getTime();
            const end = new Date(entry.endTime).getTime();
            durationMinutes = Math.round((end - start) / 60000);
        }

        const newEntry = { ...entry, durationMinutes };
        setTimeEntries(prev => [newEntry, ...prev]);
        addToast('דיווח שעות ידני נוסף בהצלחה', 'success');
    };

    const updateTimeEntry = (id: string, updates: Partial<TimeEntry>) => {
        setTimeEntries(prev => prev.map(t => {
            if (t.id === id) {
                const updatedEntry = { ...t, ...updates };
                
                // Recalculate duration if times changed
                if (updatedEntry.endTime) {
                    const start = new Date(updatedEntry.startTime).getTime();
                    const end = new Date(updatedEntry.endTime).getTime();
                    updatedEntry.durationMinutes = Math.round((end - start) / 60000);
                } else {
                    updatedEntry.durationMinutes = undefined;
                }
                
                return updatedEntry;
            }
            return t;
        }));
        addToast('דיווח השעות עודכן', 'success');
    };

    const deleteTimeEntry = (id: string, reason?: string) => {
        const entry = timeEntries.find(t => t.id === id);
        if (entry) {
            // Add audit info before deleting
            const voidedEntry = { 
                ...entry, 
                voidReason: reason || 'No reason provided',
                voidedBy: currentUser.name,
                voidedAt: new Date().toISOString()
            };
            
            setTrashTimeEntries(prev => [voidedEntry, ...prev]);
            setTimeEntries(prev => prev.filter(t => t.id !== id));
            addToast('דיווח שעות בוטל והועבר לארכיון', 'info');
        }
    };

    const restoreTimeEntry = (id: string) => {
        const entry = trashTimeEntries.find(t => t.id === id);
        if (entry) {
            setTimeEntries(prev => [...prev, entry]);
            setTrashTimeEntries(prev => prev.filter(t => t.id !== id));
            addToast('דיווח שעות שוחזר בהצלחה', 'success');
        }
    };

    const permanentlyDeleteTimeEntry = (id: string) => {
        setTrashTimeEntries(prev => prev.filter(t => t.id !== id));
        addToast('דיווח שעות נמחק לצמיתות', 'warning');
    };

    const deleteRole = (name: string) => {
        setRoleDefinitions(prev => prev.filter(r => r.name !== name));
        addToast('תפקיד נמחק', 'info');
    };

    const requestNameChange = (newName: string) => {
        const request: ChangeRequest = {
            id: `req-${Date.now()}`,
            userId: currentUser.id,
            userName: currentUser.name,
            requestedName: newName,
            status: 'pending',
            createdAt: new Date().toISOString()
        };
        setChangeRequests(prev => [...prev, request]);
        addToast('בקשת שינוי שם נשלחה לאישור', 'success');
    };

    const approveNameChange = (requestId: string) => {
        const request = changeRequests.find(r => r.id === requestId);
        if (request) {
            updateUser(request.userId, { name: request.requestedName });
            setChangeRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'approved' } : r));
            addToast('שינוי השם אושר', 'success');
        }
    };

    const rejectNameChange = (requestId: string) => {
        setChangeRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'rejected' } : r));
        addToast('שינוי השם נדחה', 'info');
    };

    return {
        users, roleDefinitions, currentUser, isAuthenticated, isLoadingCurrentUser, timeEntries, trashUsers, trashTimeEntries,
        activeShift, changeRequests,
        login, logout, switchUser, hasPermission, addUser, updateUser, removeUser, restoreUser,
        permanentlyDeleteUser, clockIn, clockOut, 
        addManualTimeEntry, updateTimeEntry, deleteTimeEntry, restoreTimeEntry, permanentlyDeleteTimeEntry,
        setRoleDefinitions, deleteRole, requestNameChange, approveNameChange, rejectNameChange
    };
};