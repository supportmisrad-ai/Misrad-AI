'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { User, TimeEntry, RoleDefinition, PermissionId, ChangeRequest } from '../types';
import { DEFAULT_ROLE_DEFINITIONS } from '../constants';

import { getWorkspaceOrgSlugFromPathname } from '@/lib/os/nexus-routing';
import { isCeoRole } from '@/lib/constants/roles';
import { getNexusMe, listNexusUsers, updateNexusPresenceHeartbeat } from '@/app/actions/nexus';

const isUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
const PRESENCE_REQUEST_TIMEOUT_MS = 8_000;

type ToastKind = 'success' | 'error' | 'info' | 'warning';

function asObject(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object') return null;
    if (Array.isArray(value)) return null;
    return value as Record<string, unknown>;
}

function normalizeRoleName(value: unknown): string {
    return String(value ?? '').replace(/["״]/g, '״');
}

function getClerkIsSuperAdmin(clerkUser: unknown): boolean | undefined {
    const userObj = asObject(clerkUser);
    const publicMeta = asObject(userObj?.publicMetadata);
    if (typeof publicMeta?.isSuperAdmin === 'boolean') return publicMeta.isSuperAdmin;
    const unsafeMeta = asObject(userObj?.unsafeMetadata);
    if (typeof unsafeMeta?.isSuperAdmin === 'boolean') return unsafeMeta.isSuperAdmin;
    return undefined;
}

function getClerkRole(clerkUser: unknown): string | undefined {
    const userObj = asObject(clerkUser);
    const publicMeta = asObject(userObj?.publicMetadata);
    const role = publicMeta?.role;
    return typeof role === 'string' && role.trim() ? role : undefined;
}

function getUnknownProp(obj: unknown, key: string): unknown {
    const o = asObject(obj);
    return o ? o[key] : undefined;
}

export const useAuth = (
    addToast: (msg: string, type?: ToastKind) => void,
    initialCurrentUser?: User
) => {

    let clerkUser: unknown = null;
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
        const clerkObj = asObject(clerkUser);
        const firstName = typeof clerkObj?.firstName === 'string' ? clerkObj.firstName : '';
        const lastName = typeof clerkObj?.lastName === 'string' ? clerkObj.lastName : '';
        const imageUrl = typeof clerkObj?.imageUrl === 'string' ? clerkObj.imageUrl : '';
        const primaryEmailObj = asObject(clerkObj?.primaryEmailAddress);
        const primaryEmail = typeof primaryEmailObj?.emailAddress === 'string' ? primaryEmailObj.emailAddress : '';
        const clerkRole = getClerkRole(clerkUser);
        const clerkIsSuperAdmin = getClerkIsSuperAdmin(clerkUser);

        if (clerkObj && asObject(clerkObj.publicMetadata)) {
            return {
                id: '',
                name: firstName && lastName
                    ? `${firstName} ${lastName}`.trim()
                    : firstName || lastName || '',
                email: primaryEmail || '',
                role: clerkRole || 'עובד',
                avatar: imageUrl || '',
                online: false,
                capacity: 0,
                isSuperAdmin: clerkIsSuperAdmin || false,
                isTenantAdmin: false, // Will be updated when API call completes
                organizationId: null,
                tenantId: null, // Will be updated when API call completes
                billingInfo: undefined,
                notificationPreferences: {
                    emailNewTask: true,
                    browserPush: true,
                    morningBrief: true,
                    soundEffects: false,
                    marketing: true,
                    pushBehavior: 'vibrate_sound',
                    pushCategories: {
                        alerts: true,
                        tasks: true,
                        events: true,
                        system: true,
                        marketing: false,
                    },
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
            organizationId: null,
            tenantId: null,
            billingInfo: undefined,
            notificationPreferences: {
                emailNewTask: true,
                browserPush: true,
                morningBrief: true,
                soundEffects: false,
                marketing: true,
                pushBehavior: 'vibrate_sound',
                pushCategories: {
                    alerts: true,
                    tasks: true,
                    events: true,
                    system: true,
                    marketing: false,
                },
            }
        };
    };
    
    const [currentUser, setCurrentUser] = useState<User>(getInitialUser());
    const [isAuthenticated, setIsAuthenticated] = useState(Boolean(initialCurrentUser?.id));
    const [isLoadingCurrentUser, setIsLoadingCurrentUser] = useState(false);

    const clerkUserId = asObject(clerkUser)?.id;
    const pathname = usePathname();
    const orgSlug = useMemo(() => {
        return getWorkspaceOrgSlugFromPathname(pathname);
    }, [pathname]);

    const presenceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const presenceInFlightRef = useRef(false);
    const presenceEffectStateRef = useRef<string>('');
    const presenceGuardStateRef = useRef<string>('');
    const presenceFailureCountRef = useRef(0);
    const presenceSuccessCountRef = useRef(0);

    const sendPresenceHeartbeat = useCallback(async () => {
        if (typeof window === 'undefined') return;
        const visibilityState = typeof document !== 'undefined' ? document.visibilityState : null;
        if (!orgSlug || !isClerkLoaded || !clerkUserId || visibilityState === 'hidden') {
            const nextState = JSON.stringify({ orgSlug, isClerkLoaded, clerkUserId: Boolean(clerkUserId), visibilityState });
            if (nextState !== presenceGuardStateRef.current) {
                presenceGuardStateRef.current = nextState;
                console.info(`[Presence] heartbeat skipped (guard) ${nextState}`);
            }
            return;
        }

        // Additional guard: skip heartbeat on public pages like landing
        if (typeof window !== 'undefined' && window.location.pathname === '/') {
            return;
        }

        if (presenceInFlightRef.current) {
            console.info('[Presence] heartbeat skipped (in-flight)');
            return;
        }
        presenceInFlightRef.current = true;

        let pendingWarnTimeout: ReturnType<typeof setTimeout> | null = null;
        let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
        let heartbeatPromise: Promise<unknown> | null = null;

        try {
            const startedAt = Date.now();
            pendingWarnTimeout = setTimeout(() => {
                console.warn(`[Presence] heartbeat pending >3s (possible hang) orgSlug=${orgSlug}`);
            }, 3000);
            const timeoutPromise = new Promise<never>((_, reject) => {
                timeoutHandle = setTimeout(() => {
                    reject(new Error(`Presence heartbeat timeout after ${PRESENCE_REQUEST_TIMEOUT_MS}ms`));
                }, PRESENCE_REQUEST_TIMEOUT_MS);
            });
            console.info(`[Presence] heartbeat start orgSlug=${orgSlug}`);
            heartbeatPromise = updateNexusPresenceHeartbeat({ orgId: orgSlug });
            const result = await Promise.race([heartbeatPromise, timeoutPromise]);
            console.info(
                `[Presence] heartbeat completed in ${Date.now() - startedAt}ms orgSlug=${orgSlug}`
            );
            presenceFailureCountRef.current = 0;
            presenceSuccessCountRef.current += 1;
            if (presenceSuccessCountRef.current === 1) {
                console.info('Presence heartbeat ok', {
                    orgSlug,
                    serverTime: getUnknownProp(result, 'serverTime'),
                    debug: getUnknownProp(result, 'debug'),
                });
            }
            setCurrentUser((prev) => (prev.online ? prev : { ...prev, online: true }));
        } catch (error) {
            if (error instanceof Error && error.message.includes('Presence heartbeat timeout')) {
                void heartbeatPromise?.catch(() => null);
            }
            console.warn('[Presence] heartbeat error', error);
            presenceFailureCountRef.current += 1;
            if (presenceFailureCountRef.current === 1) {
                console.warn('Presence heartbeat failed', error);
            }
        } finally {
            try {
                if (pendingWarnTimeout) clearTimeout(pendingWarnTimeout);
                if (timeoutHandle) clearTimeout(timeoutHandle);
            } catch {
                // ignore
            }
            presenceInFlightRef.current = false;
        }
    }, [orgSlug, isClerkLoaded, clerkUserId]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const nextState = JSON.stringify({ orgSlug, isClerkLoaded });
        if (nextState !== presenceEffectStateRef.current) {
            presenceEffectStateRef.current = nextState;
            console.info(`[Presence] heartbeat effect mounted ${nextState}`);
        }
        if (!orgSlug) return;

        let cancelled = false;

        const clearScheduled = () => {
            if (presenceTimeoutRef.current) {
                clearTimeout(presenceTimeoutRef.current);
                presenceTimeoutRef.current = null;
            }
        };

        const scheduleNext = (delayMs: number) => {
            clearScheduled();
            presenceTimeoutRef.current = setTimeout(() => {
                void tick();
            }, delayMs);
        };

        const computeDelayMs = () => {
            const base = 30_000;
            const backoff = Math.min(5 * 60_000, base * Math.pow(2, presenceFailureCountRef.current));
            return Math.max(base, backoff);
        };

        const tick = async () => {
            if (cancelled) return;
            await sendPresenceHeartbeat();
            if (cancelled) return;

            if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
                scheduleNext(60_000);
                return;
            }

            scheduleNext(computeDelayMs());
        };

        void tick();

        const onVisibility = () => {
            if (document.visibilityState === 'visible') {
                presenceFailureCountRef.current = 0;
                void tick();
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
    }, [orgSlug, isClerkLoaded, sendPresenceHeartbeat]);

    const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
    const [trashUsers, setTrashUsers] = useState<User[]>([]);
    const [trashTimeEntries, setTrashTimeEntries] = useState<TimeEntry[]>([]);
    const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);

    const activeShift = timeEntries.find(t => t.userId === currentUser.id && !t.endTime) || null;

    const meQuery = useQuery({
        queryKey: ['nexus', 'me', orgSlug],
        queryFn: async () => {
            if (!orgSlug) {
                throw new Error('Missing orgSlug');
            }
            return getNexusMe({ orgId: orgSlug });
        },
        enabled: Boolean(isClerkLoaded && clerkUser && orgSlug && !(initialCurrentUser?.id && isUUID(String(initialCurrentUser.id)))),
        staleTime: 30_000,
        refetchInterval: () => {
            if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return false;
            return 60_000;
        },
        retry: 1,
    });

    const usersQuery = useQuery({
        queryKey: ['nexus', 'users', orgSlug],
        queryFn: async () => {
            if (!orgSlug) {
                throw new Error('Missing orgSlug');
            }
            return listNexusUsers({ orgId: orgSlug });
        },
        enabled: Boolean(isClerkLoaded && clerkUser && orgSlug),
        staleTime: 30_000,
        refetchInterval: () => {
            if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return false;
            return 60_000;
        },
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
    }, [isClerkLoaded, clerkUserId, orgSlug, meQuery.isFetching, initialCurrentUser?.id]);

    useEffect(() => {
        const data = meQuery.data;
        if (!data?.user) return;

        const clerkIsSuperAdmin = getClerkIsSuperAdmin(clerkUser);

        const userObj = asObject(data.user);
        const organizationIdFromUser = typeof userObj?.organizationId === 'string' ? userObj.organizationId : null;

        const userWithDefaults = {
            ...data.user,
            isSuperAdmin: Boolean(
                data.user?.isSuperAdmin ??
                clerkIsSuperAdmin ??
                currentUser?.isSuperAdmin
            ),
            isTenantAdmin: Boolean(data.isTenantAdmin),
            organizationId: organizationIdFromUser,
            tenantId: organizationIdFromUser,
            billingInfo: data.user.billingInfo || undefined,
            notificationPreferences: data.user.notificationPreferences || {
                emailNewTask: true,
                browserPush: true,
                morningBrief: true,
                soundEffects: false,
                marketing: true,
                pushBehavior: 'vibrate_sound',
                pushCategories: {
                    alerts: true,
                    tasks: true,
                    events: true,
                    system: true,
                    marketing: false,
                },
            }
        };

        setCurrentUser(userWithDefaults);
        setIsAuthenticated(true);

        setUsers(prev => {
            const existingIndex = prev.findIndex(u => u.id === data.user!.id);
            if (existingIndex >= 0) {
                return prev.map((u, i) => i === existingIndex ? { ...userWithDefaults, online: true } : u);
            }
            return [...prev, { ...userWithDefaults, online: true }];
        });
    }, [meQuery.data, clerkUserId]);

    useEffect(() => {
        const nextUsers = usersQuery.data?.users;
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
                    marketing: true,
                    pushBehavior: 'vibrate_sound',
                    pushCategories: {
                        alerts: true,
                        tasks: true,
                        events: true,
                        system: true,
                        marketing: false,
                    },
                }
            };
            setCurrentUser(userWithBilling);
            setIsAuthenticated(true);
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, online: true } : u));
            addToast(`ברוך הבא, ${user.name}`, 'success');
        }
    };

    const logout = () => {
        setIsAuthenticated(false);
        setIsLoadingCurrentUser(false);
        setUsers(prev => prev.map(u => ({ ...u, online: false })));
        setCurrentUser(getInitialUser());
    };

    const switchUser = (userId: string) => {
        login(userId);
    };

    const hasPermission = useCallback(
        (permission: PermissionId): boolean => {
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
            const normalizedRole = normalizeRoleName(currentUser.role);
            const role = roleDefinitions.find(r => {
                const normalizedDefRole = normalizeRoleName(r.name);
                return normalizedDefRole === normalizedRole; // Only check normalized comparison
            });

            if (role && role.permissions) {
                return role.permissions.includes(permission);
            }

            return false;
        },
        [currentUser.isSuperAdmin, currentUser.role, roleDefinitions]
    );

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