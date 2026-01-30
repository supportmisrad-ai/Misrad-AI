'use client';

import { useState, useEffect, useMemo } from 'react';
import { useUser } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { User, TimeEntry, RoleDefinition, PermissionId, ChangeRequest } from '../types';
import { DEFAULT_ROLE_DEFINITIONS } from '../constants';
import { getWorkspaceOrgSlugFromPathname } from '@/lib/os/nexus-routing';
import { isCeoRole } from '@/lib/constants/roles';
import { getNexusMe, listNexusUsers } from '@/app/actions/nexus';

const isUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

export const useAuth = (
    addToast: (msg: string, type?: any) => void,
    initialCurrentUser?: User
) => {

    let clerkUser: any = null;
    let isClerkLoaded = false;
    try {
        const clerk = useUser();
        clerkUser = clerk.user;
        isClerkLoaded = clerk.isLoaded;
    } catch {
        clerkUser = null;
        isClerkLoaded = true;
    }
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

    const pathname = usePathname();
    const orgSlug = useMemo(() => {
        return getWorkspaceOrgSlugFromPathname(pathname);
    }, [pathname]);

    const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
    const [trashUsers, setTrashUsers] = useState<User[]>([]);
    const [trashTimeEntries, setTrashTimeEntries] = useState<TimeEntry[]>([]);
    const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);

    const activeShift = timeEntries.find(t => t.userId === currentUser.id && !t.endTime) || null;

    const meQuery = useQuery({
        queryKey: ['nexus', 'me', orgSlug],
        queryFn: async () => {
            return getNexusMe({ orgId: orgSlug as string });
        },
        enabled: Boolean(isClerkLoaded && clerkUser && orgSlug && !(initialCurrentUser?.id && isUUID(String(initialCurrentUser.id)))),
        staleTime: 30_000,
        refetchInterval: 60_000,
        retry: 1,
    });

    const usersQuery = useQuery({
        queryKey: ['nexus', 'users', orgSlug],
        queryFn: async () => {
            return listNexusUsers({ orgId: orgSlug as string });
        },
        enabled: Boolean(isClerkLoaded && clerkUser && orgSlug),
        staleTime: 30_000,
        refetchInterval: 60_000,
        retry: 1,
    });

    useEffect(() => {
        if (!isClerkLoaded) return;

        if (!clerkUser) {
            setIsAuthenticated(false);
            setIsLoadingCurrentUser(false);
            return;
        }

        if (!orgSlug) {
            setIsAuthenticated(Boolean(clerkUser));
            setIsLoadingCurrentUser(false);
            return;
        }

        if (initialCurrentUser?.id && isUUID(String(initialCurrentUser.id))) {
            setIsAuthenticated(true);
            setIsLoadingCurrentUser(false);
            return;
        }

        setIsLoadingCurrentUser(Boolean(meQuery.isFetching));
    }, [isClerkLoaded, clerkUser?.id, orgSlug, meQuery.isFetching, initialCurrentUser?.id]);

    useEffect(() => {
        if (!meQuery.data?.user) return;
        const data = meQuery.data;

        const userWithDefaults = {
            ...data.user,
            isSuperAdmin: Boolean(
                (data.user as any)?.isSuperAdmin ??
                (clerkUser?.publicMetadata?.isSuperAdmin as boolean) ??
                ((clerkUser as any)?.unsafeMetadata as any)?.isSuperAdmin ??
                currentUser?.isSuperAdmin
            ),
            isTenantAdmin: Boolean(data.isTenantAdmin),
            tenantId: data.tenant?.id || (orgSlug as any) || null,
            billingInfo: (data.user as any).billingInfo || undefined,
            notificationPreferences: (data.user as any).notificationPreferences || {
                emailNewTask: true,
                browserPush: true,
                morningBrief: true,
                soundEffects: false,
                marketing: true
            }
        };

        setCurrentUser(userWithDefaults as any);
        setIsAuthenticated(true);

        setUsers(prev => {
            const existingIndex = prev.findIndex(u => u.id === (data.user as any).id);
            if (existingIndex >= 0) {
                return prev.map((u, i) => i === existingIndex ? { ...(userWithDefaults as any), online: true } : u);
            }
            return [...prev, { ...(userWithDefaults as any), online: true }];
        });
    }, [meQuery.data, clerkUser?.id]);

    useEffect(() => {
        const nextUsers = (usersQuery.data as any)?.users;
        if (Array.isArray(nextUsers)) {
            setUsers(nextUsers);
        }
    }, [usersQuery.data]);

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
        if (isCeoRole(currentUser.role)) {
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